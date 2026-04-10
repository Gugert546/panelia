import { useEffect, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useFontSize } from "../../../../providers/themeProviders";
import { useLanguage } from "../../../../providers/languageProvider";
import { useWeatherWidget } from "../WeatherWidget/WeatherWidgetLogic";

type NewsArticle = {
  title: string;
  url: string;
};

type NewsResponse = {
  country: string;
  updatedAt: string;
  articles: NewsArticle[];
};

export default function NewsWidget() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [, setLoading] = useState(false);

  const { fontSize } = useFontSize();
  const { t } = useLanguage();
  const { state: weatherState } = useWeatherWidget();

if (weatherState.status === "success") {
  console.log("Country:", weatherState.data.countryCode);
}

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
                {/* 📖 IKON */}
                <span
                  className="material-symbols-rounded"
                  style={{
                    fontSize: 28,
                    opacity: 0.85,
                  }}
                >
                  menu_book
                </span>

                {/* 📰 TEKST */}
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