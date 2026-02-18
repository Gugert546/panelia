import { useState } from "react";
//import { useNews } from "../../components/News/use-news";
import WidgetPane from "../../components/WidgetPane";


type NewsArticle = {
  title: string;
  url: string;
};


export default function NewsWidget() {

  const [country, setCountry] = useState("");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchNewsByCountry(country: string) {

    console.log("Fetching news for:", country);

    setLoading(true);

    try {
      const res = await fetch(
        `https://api.worldnewsapi.com/search-news?source-countries=${country}`,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_WORLD_NEWS_API_KEY
          }
        }
      );

      const data = await res.json();

      const mapped = (data.news || []).map((article: any) => ({
        title: article.title,
        url: article.url
      }));

      setArticles(mapped);

    } catch (err) {
      console.error("News fetch failed:", err);
    }

    setLoading(false);
  }

  function handleSubmit() {
    if (!country) return;
    fetchNewsByCountry(country);
  }

  return (
    <WidgetPane title="World News">

      <input
        type="text"
        placeholder="Country code (no, us, gb...)"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />

      <button onClick={handleSubmit}>
        Get Headlines
      </button>

      {loading && <p>Loading...</p>}

      {articles.map((article, i) => (
        <a key={i} href={article.url} target="_blank">
          {article.title}
        </a>
      ))}

    </WidgetPane>
  );

  
}

export async function testFetchNews(country: string) {
  try {
    const res = await fetch(
      `https://api.worldnewsapi.com/search-news?source-countries=${country}`,
      {
        headers: {
          "x-api-key": import.meta.env.VITE_WORLD_NEWS_API_KEY
        }
      }
    );

    const data = await res.json();

    const mapped = (data.news || []).map((article: any) => ({
      title: article.title,
      url: article.url
    }));

    console.log("🧪 Test result:", mapped);

    return mapped;

  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}
