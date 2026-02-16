import type { NewsResponse } from "./news-types";

const API_KEY = import.meta.env.VITE_WORLD_NEWS_API_KEY;

export async function fetchTopNewsByCountry(country: string): Promise<NewsResponse> {

  const res = await fetch(
    `https://api.worldnewsapi.com/top-news?source-country=${country}`,
    {
      headers: {
        "x-api-key": API_KEY
      }
    }
  );

  const data = await res.json();

  return {
    articles: (data.top_news || []).map((article: any) => ({
      title: article.title,
      url: article.url
    }))
  };

}
