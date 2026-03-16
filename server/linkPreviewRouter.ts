import express from "express";

export const linkPreviewRouter = express.Router();

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function extractFavicon(html: string, baseUrl: string) {
  const relMatch = html.match(
    /<link[^>]+rel=["'][^"']*(icon|shortcut icon)[^"']*["'][^>]+href=["']([^"']+)["']/i
  );

  if (relMatch?.[2]) {
    return new URL(relMatch[2], baseUrl).toString();
  }

  return new URL("/favicon.ico", baseUrl).toString();
}

linkPreviewRouter.get("/", async (req, res) => {
  const rawUrl = String(req.query.url ?? "").trim();

  if (!rawUrl) {
    return res.status(400).json({ error: "Missing url" });
  }

  try {
    const targetUrl = new URL(rawUrl).toString();

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 Panelia Link Preview",
      },
    });

    const html = await response.text();

    const title = extractTitle(html) ?? targetUrl;
    const favicon = extractFavicon(html, targetUrl);

    return res.json({
      title,
      favicon,
    });
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message ?? "Failed to fetch preview",
    });
  }
});