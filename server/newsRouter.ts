import express from "express";

export const newsRouter = express.Router();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutter
const newsCache = new Map<string, { timestamp: number; data: any }>();

type NewsApiArticle = {
  title?: string;
  url?: string;
};

type NewsApiPayload = {
  news?: NewsApiArticle[];
  data?: NewsApiArticle[];
};

function getArticlesFromPayload(payload: unknown): NewsApiArticle[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const { news, data } = payload as NewsApiPayload;

  if (Array.isArray(news)) {
    return news;
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
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

    //Første forsøk (brukerens land)
    const url = `https://api.worldnewsapi.com/search-news?source-countries=${encodeURIComponent(country)}`;

    const r = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
      },
    });

    const bodyText = await r.text();

    if (!r.ok) {
      return res.status(r.status).json({
        error: "WorldNewsAPI request failed",
        status: r.status,
        body: bodyText.slice(0, 300),
      });
    }

    const json: unknown = JSON.parse(bodyText);
    let list = getArticlesFromPayload(json);

    if (list.length === 0 && country === "no") {
      console.log("No news for NO, falling back to US");

      const fallbackUrl = `https://api.worldnewsapi.com/search-news?source-countries=us`;

      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          "x-api-key": apiKey,
        },
      });

      const fallbackJson: unknown = await fallbackRes.json();
      list = getArticlesFromPayload(fallbackJson);
    }

    const articles = list.map((article) => ({
      title: article.title,
      url: article.url,
    }));

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
  } catch (e: any) {
    console.error("News router error:", e);
    res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});
