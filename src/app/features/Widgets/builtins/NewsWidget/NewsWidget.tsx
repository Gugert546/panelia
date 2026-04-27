import { useEffect, useMemo, useRef, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useLanguage } from "../../../../providers/languageProvider";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";
import { getCountryCodeFromLocale, useUserLocation } from "../../hooks/userLocation";
import { getFaviconCandidates } from "../../../../../lib/utils/favicon";

type NewsArticle = {
  title: string;
  url: string;
  image?: string;
  publishedAt?: string;
};

type NewsResponse = {
  country: string;
  updatedAt: string;
  articles: NewsArticle[];
};

const NEWS_CACHE_KEY_PREFIX = "panelia:news:v2:";
const NEWS_CACHE_MAX_AGE_MS = 15 * 60 * 1000;

function readCachedNews(country: string) {
  try {
    const raw = localStorage.getItem(`${NEWS_CACHE_KEY_PREFIX}${country}`);
    if (!raw) return undefined;

    const value = JSON.parse(raw) as Partial<NewsResponse>;
    const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : "";
    const updatedAtMs = new Date(updatedAt).getTime();
    if (!Number.isFinite(updatedAtMs) || Date.now() - updatedAtMs > NEWS_CACHE_MAX_AGE_MS) {
      return undefined;
    }

    return Array.isArray(value.articles)
      ? value.articles.filter(
          (article): article is NewsArticle =>
            typeof article?.title === "string" && typeof article?.url === "string"
        )
      : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedNews(country: string, articles: NewsArticle[]) {
  try {
    localStorage.setItem(
      `${NEWS_CACHE_KEY_PREFIX}${country}`,
      JSON.stringify({ country, updatedAt: new Date().toISOString(), articles })
    );
  } catch {
    // Storage is best-effort; news remains visible from component state.
  }
}

function formatArticleTimestamp(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function NewsArticleIcon({ url, title }: NewsArticle) {
  const candidates = useMemo(() => getFaviconCandidates(url), [url]);
  const [index, setIndex] = useState(0);

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

function NewsArticleImage({ article }: { article: NewsArticle }) {
  const [failed, setFailed] = useState(false);

  if (article.image && !failed) {
    return (
      <img
        src={article.image}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        style={{
          width: 72,
          height: 54,
          borderRadius: 10,
          objectFit: "cover",
          flexShrink: 0,
          background: "rgba(255,255,255,0.12)",
        }}
      />
    );
  }

  return (
    <span
      style={{
        width: 72,
        height: 54,
        borderRadius: 10,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: "rgba(255,255,255,0.12)",
      }}
    >
      <NewsArticleIcon url={article.url} title={article.title} />
    </span>
  );
}

export default function NewsWidget() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFetchedCountryRef = useRef<string | undefined>(undefined);

  const fontSize = useResolvedWidgetFontSize();
  const { t } = useLanguage();
  const { state: locationState } = useUserLocation();

  const country = locationState.status === "success"
    ? locationState.data.countryCode ?? getCountryCodeFromLocale()
    : getCountryCodeFromLocale();

  useEffect(() => {
    if (!country || lastFetchedCountryRef.current === country) return;
    lastFetchedCountryRef.current = country;

    const cachedArticles = readCachedNews(country);
    if (cachedArticles) {
      setArticles(cachedArticles);
    }

    const fetchNews = async () => {
      setLoading(!cachedArticles);

      try {
        const res = await fetch(
         "https://panelia-server-1044777021142.europe-west1.run.app/api/news?country=" + country);

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt);
        }

        const data = (await res.json()) as NewsResponse;
        const nextArticles = data.articles ?? [];
        setArticles(nextArticles);
        writeCachedNews(country, nextArticles);
      } catch (err) {
        console.error("News fetch failed:", err);
      }

      setLoading(false);
    };

    fetchNews();
  }, [country]);

  return (
    <WidgetContainer>
      <WidgetPane title={t("widgets.newsWidget.title")}>
        <style>{`
          @keyframes news-widget-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
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
          {loading ? (
            <div
              style={{
                flex: 1,
                minHeight: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                aria-label="Loading news"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "3px solid rgba(255,255,255,0.2)",
                  borderTopColor: "rgba(255,255,255,0.92)",
                  animation: "news-widget-spin 0.9s linear infinite",
                }}
              />
            </div>
          ) : null}

          {!loading &&
            articles.slice(0, 6).map((article, i) => {
              const timestamp = formatArticleTimestamp(article.publishedAt);

              return (
                <a
                  key={`${article.url}-${i}`}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  draggable={true}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
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
                  <NewsArticleImage article={article} />

                  <span
                    style={{
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize,
                        lineHeight: 1.3,
                        fontWeight: 500,
                      }}
                    >
                      {article.title}
                    </span>

                    {timestamp ? (
                      <span
                        style={{
                          fontSize: Math.max(11, fontSize * 0.78),
                          lineHeight: 1.1,
                          color: "rgba(255,255,255,0.72)",
                        }}
                      >
                        {timestamp}
                      </span>
                    ) : null}
                  </span>
                </a>
              );
            })}
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
