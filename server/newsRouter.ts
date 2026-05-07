import express from "express";

export const newsRouter = express.Router();

const CACHE_TTL = 60 * 60 * 1000; // 1 time
const WORLD_NEWS_API_BASE_URL = "https://api.worldnewsapi.com";

type NewsArticle = {
  title: string;
  url: string;
  image?: string;
  publishedAt?: string;
};

type NewsResponse = {
  country: string;
  updatedAt: string;
  articles: NewsArticle[];
};

const newsCache = new Map<string, { timestamp: number; data: NewsResponse }>();

type NewsApiArticle = {
  title?: string;
  url?: string;
  image?: string;
  publish_date?: string;
};

type SearchNewsApiPayload = {
  news?: NewsApiArticle[];
  data?: NewsApiArticle[];
};

type TopNewsApiPayload = {
  top_news?: Array<{
    news?: NewsApiArticle[];
  }>;
};

class WorldNewsApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
  }
}

function getSearchArticlesFromPayload(payload: unknown): NewsApiArticle[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const { news, data } = payload as SearchNewsApiPayload;

  if (Array.isArray(news)) {
    return news;
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

function getTopArticlesFromPayload(payload: unknown): NewsApiArticle[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const { top_news } = payload as TopNewsApiPayload;
  if (!Array.isArray(top_news)) {
    return [];
  }

  return top_news.flatMap((cluster) =>
    Array.isArray(cluster.news) ? cluster.news.slice(0, 1) : []
  );
}

function normalizeArticles(list: NewsApiArticle[]): NewsArticle[] {
  const seenUrls = new Set<string>();

  return list
    .map((article): NewsArticle | undefined => {
      const title = article.title?.trim();
      const url = article.url?.trim();

      if (!title || !url || seenUrls.has(url)) {
        return undefined;
      }

      seenUrls.add(url);

      const normalizedArticle: NewsArticle = {
        title,
        url,
      };

      if (article.image) {
        normalizedArticle.image = article.image;
      }

      if (article.publish_date) {
        normalizedArticle.publishedAt = article.publish_date;
      }

      return normalizedArticle;
    })
    .filter((article): article is NewsArticle => Boolean(article))
    .slice(0, 12);
}

function getUpstreamErrorMessage(status: number) {
  if (status === 401 || status === 403) {
    return "WorldNewsAPI rejected the server API key";
  }

  if (status === 429) {
    return "WorldNewsAPI quota or rate limit was reached";
  }

  if (status >= 500) {
    return "WorldNewsAPI is temporarily unavailable";
  }

  return "WorldNewsAPI request failed";
}

async function fetchWorldNewsJson(url: URL, apiKey: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
  });
  const bodyText = await response.text();

  if (!response.ok) {
    console.warn("WorldNewsAPI request failed", {
      status: response.status,
      body: bodyText.slice(0, 300),
      url: url.pathname,
    });
    throw new WorldNewsApiError(getUpstreamErrorMessage(response.status), response.status);
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    console.warn("WorldNewsAPI returned non-JSON response", {
      status: response.status,
      body: bodyText.slice(0, 300),
      url: url.pathname,
    });
    throw new WorldNewsApiError("WorldNewsAPI returned an invalid response", 502);
  }
}

async function fetchSearchNewsArticles(country: string, apiKey: string) {
  const url = new URL("/search-news", WORLD_NEWS_API_BASE_URL);
  url.searchParams.set("source-countries", country);
  url.searchParams.set("number", "12");

  const payload = await fetchWorldNewsJson(url, apiKey);
  return normalizeArticles(getSearchArticlesFromPayload(payload));
}

async function fetchTopNewsArticles(country: string, apiKey: string) {
  const url = new URL("/top-news", WORLD_NEWS_API_BASE_URL);
  url.searchParams.set("source-country", country);

  const payload = await fetchWorldNewsJson(url, apiKey);
  return normalizeArticles(getTopArticlesFromPayload(payload));
}

async function fetchNewsArticles(country: string, apiKey: string) {
  let lastError: unknown;

  for (const fetchArticles of [fetchSearchNewsArticles, fetchTopNewsArticles]) {
    try {
      const articles = await fetchArticles(country, apiKey);
      if (articles.length > 0) {
        return articles;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (country === "no") {
    console.log("No news for NO, falling back to US");

    for (const fetchArticles of [fetchSearchNewsArticles, fetchTopNewsArticles]) {
      try {
        const articles = await fetchArticles("us", apiKey);
        if (articles.length > 0) {
          return articles;
        }
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

newsRouter.get("/", async (req, res) => {
  const country = String(req.query.country ?? "").trim().toLowerCase();

  if (!country) {
    return res.status(400).json({ error: "Missing country" });
  }

  const cacheKey = country;
  const cached = newsCache.get(cacheKey);

  //Returner cache
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const apiKey = process.env.WORLD_NEWS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing WORLD_NEWS_API_KEY on server" });
    }

    const articles = await fetchNewsArticles(country, apiKey);

    const result = {
      country,
      updatedAt: new Date().toISOString(),
      articles,
    };

    newsCache.set(cacheKey, {
      timestamp: Date.now(),
      data: result,
    });

    res.json(result);
  } catch (error: unknown) {
    console.error("News router error:", error);

    if (error instanceof WorldNewsApiError) {
      return res.status(502).json({
        error: error.message,
        upstreamStatus: error.status,
      });
    }

    res.status(500).json({ error: getErrorMessage(error) });
  }
});
