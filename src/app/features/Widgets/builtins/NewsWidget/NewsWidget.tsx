import { useEffect, useMemo, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useFontSize } from "../../../../providers/themeProviders";
import { useLanguage } from "../../../../providers/languageProvider";
import { useWeatherWidget } from "../WeatherWidget/WeatherWidgetLogic";
import { getFaviconCandidates } from "../../../../../lib/utils/favicon";

type NewsArticle = {
  title: string;
  url: string;
};

type NewsResponse = {
  country: string;
  updatedAt: string;
  articles: NewsArticle[];
};

function NewsArticleIcon({ url, title }: NewsArticle) {
  const candidates = useMemo(() => getFaviconCandidates(url), [url]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [url, candidates.length]);

  const current = candidates[index] ?? "";

  if (current) {
    return (
      <img
        src={current}
        alt=""
        onError={() => setIndex((prev) => Math.min(prev + 1, candidates.length - 1))}
        style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }}
      />
    );
  }

  return (
    <span
      style={{
        width: 20,
        height: 20,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {title.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function NewsWidget() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [, setLoading] = useState(false);

  const { fontSize } = useFontSize();
  const { t } = useLanguage();
  const { state: weatherState } = useWeatherWidget();

  useEffect(() => {
    if (weatherState.status !== "success") return;

    const country = weatherState.data.countryCode;
    if (!country) return;

    const fetchNews = async () => {
      setLoading(true);

      try {
        const res = await fetch(
         "https://panelia-server-1044777021142.europe-west1.run.app/api/news?country=" + country
);

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt);
        }

        const data = (await res.json()) as NewsResponse;
        setArticles(data.articles ?? []);
      } catch (err) {
        console.error("News fetch failed:", err);
      }

      setLoading(false);
    };

    fetchNews();
  }, [weatherState]);

  return (
    <WidgetContainer>
      <WidgetPane title={t("widgets.newsWidget.title")}>
        <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto",
              flex: 1,
              paddingRight: 4,
            }}
          >
            {articles.slice(0, 6).map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,

                  fontSize,
                  textDecoration: "none",
                  color: "inherit",

                  padding: "14px 16px",
                  borderRadius: 14,

                  
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  backdropFilter: "blur(12px)",

                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.22)";
                  e.currentTarget.style.transform = "scale(1.01)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <NewsArticleIcon url={article.url} title={article.title} />

                <span
                  style={{
                    fontSize,
                    lineHeight: 1.3,
                    fontWeight: 500,
                  }}
                >
                  {article.title}
                </span>
              </a>
            ))}
          </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
