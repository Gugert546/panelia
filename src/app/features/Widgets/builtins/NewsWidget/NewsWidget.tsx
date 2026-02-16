import { useState } from "react";
import { useNews } from "../../components/News/use-news";
import WidgetPane from "../../components/WidgetPane";

export default function NewsWidget() {

  const [country, setCountry] = useState("");
  const { articles, loading, loadNews } = useNews();

  function handleSubmit() {
    if (!country) return;
    loadNews(country);
  }

  return (
    <WidgetPane title="World News">

      <input
        type="text"
        placeholder="Enter country code (us, no, jp...)"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />

      <button onClick={handleSubmit}>
        Get Headlines
      </button>

      {loading && <p>Loading...</p>}

      {articles.map((article, i) => (
        <a
          key={i}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {article.title}
        </a>
      ))}

    </WidgetPane>
  );
}
