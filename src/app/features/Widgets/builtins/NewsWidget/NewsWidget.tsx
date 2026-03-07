import { useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
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
    <WidgetContainer>
      <WidgetPane title="World News">

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 8
          }}
        >

          <input
            type="text"
            placeholder="Country code (no, us...)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{
              fontSize: 14,
              padding: 4
            }}
          />

          <button
            onClick={handleSubmit}
            style={{
              fontSize: 14,
              padding: 4
            }}
          >
            Get Headlines
          </button>

          {loading && <p>Loading...</p>}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              overflowY: "auto",
              flex: 1
            }}
          >
            {articles.slice(0, 6).map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                style={{
                  fontSize: 14,
                  textDecoration: "none"
                }}
              >
                {article.title}
              </a>
            ))}
          </div>

        </div>

      </WidgetPane>
    </WidgetContainer>
  );
}