import express from "express";

export const newsRouter = express.Router();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutter
const newsCache = new Map<string, { timestamp: number; data: any }>();

newsRouter.get("/", async (req, res) => {
  const country = String(req.query.country ?? "").trim().toLowerCase();

  if (!country) {
    return res.status(400).json({ error: "Missing country" });
  }

  const cacheKey = country;
  const cached = newsCache.get(cacheKey);

  // Returner cache hvis den er fersk
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const apiKey = process.env.WORLD_NEWS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing WORLD_NEWS_API_KEY on server" });
    }

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

    const json = JSON.parse(bodyText);

    const articles = (json.news || []).map((article: any) => ({
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