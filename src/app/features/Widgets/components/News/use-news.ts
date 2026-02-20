/*
import { useState } from "react";
import { fetchTopNewsByCountry } from "./news-api";
import type { NewsArticle } from "./news-types";

export function useNews() {

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadNews(country: string) {

    console.log("LoadNews triggered with:", country);
    setLoading(true);

    const result = await fetchTopNewsByCountry(country);
    console.log("Processed result:", result);

    setArticles(result.articles);
    setLoading(false);
  }


  return {
    articles,
    loading,
    loadNews
  };

}
*/