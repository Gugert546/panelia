import { useEffect, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useLanguage } from "../../../../providers/languageProvider";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";

import paneliaLogo from "../../../../../assets/logo.png";

type InfoSlide = {
  titleKey?: string;
  bodyKey?: string;
  pointsKeys?: string[];
  image?: string;
  imageAltKey?: string;
};

export default function InfoWidget() {
  const { t } = useLanguage();
  const fontSize = useResolvedWidgetFontSize();
  const [currentSlide, setCurrentSlide] = useState(0);
  const titleSize = fontSize + 2;

  const slides: InfoSlide[] = [
    {
      image: paneliaLogo,
      imageAltKey: "widgets.infoWidget.slides.welcome.logoAlt",
      bodyKey: "widgets.infoWidget.slides.welcome.body",
    },
    {
      titleKey: "widgets.infoWidget.slides.panelia.title",
      bodyKey: "widgets.infoWidget.slides.panelia.body",
    },
    {
      titleKey: "widgets.infoWidget.slides.gettingStarted.title",
      pointsKeys: [
        "widgets.infoWidget.slides.gettingStarted.points.signIn",
        "widgets.infoWidget.slides.gettingStarted.points.addWidgets",
        "widgets.infoWidget.slides.gettingStarted.points.aiHjelp",
        "widgets.infoWidget.slides.gettingStarted.points.moveResize",
        "widgets.infoWidget.slides.gettingStarted.points.customize",
      ],
    },
    {
      titleKey: "widgets.infoWidget.slides.widgets.title",
      pointsKeys: [
        "widgets.infoWidget.slides.widgets.points.weather",
        "widgets.infoWidget.slides.widgets.points.calendar",
        "widgets.infoWidget.slides.widgets.points.news",
        "widgets.infoWidget.slides.widgets.points.notes",
      ],
    },
    {
      titleKey: "widgets.infoWidget.slides.project.title",
      bodyKey: "widgets.infoWidget.slides.project.body",
      pointsKeys: [
        "widgets.infoWidget.slides.project.points.team",
        //"widgets.infoWidget.slides.project.points.learning",
      ],
    },
  ];

  const goToPreviousSlide = () => {
    setCurrentSlide(previousSlide =>
      previousSlide === 0 ? slides.length - 1 : previousSlide - 1
    );
  };

  const goToNextSlide = () => {
    setCurrentSlide(previousSlide =>
      previousSlide === slides.length - 1 ? 0 : previousSlide + 1
    );
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goToPreviousSlide();
      }

      if (event.key === "ArrowRight") {
        goToNextSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [slides.length]);

  return (
    <WidgetContainer>
      <WidgetPane title={t("widgets.info")}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            textAlign: "center",
            fontWeight: 700,
            fontSize: titleSize,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <h1 style={{ margin: 0 }}>{t("widgets.infoWidget.title")}</h1>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  padding: "4px 4px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#ffffff9d",
                  fontWeight: 100,
                  fontSize,
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  overflowY: "auto",
                  flexDirection: "column",
                }}
              >
                {slides[currentSlide].titleKey && (
                  <div style={{ padding: "12px 14px 0" }}>
                    <h2 style={{ margin: 0 }}>{t(slides[currentSlide].titleKey)}</h2>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    textAlign: "left",
                    width: "100%",
                    gap: 12,
                    padding: "12px 14px",
                  }}
                >
                  {slides[currentSlide].image && (
                    <img
                      src={slides[currentSlide].image}
                      alt={slides[currentSlide].imageAltKey ? t(slides[currentSlide].imageAltKey) : ""}
                      style={{ maxWidth: "100%", height: "auto", borderRadius: 8, alignSelf: "center" }}
                    />
                  )}

                  {slides[currentSlide].bodyKey && <p style={{ margin: 0 }}>{t(slides[currentSlide].bodyKey)}</p>}

                  {slides[currentSlide].pointsKeys && (
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 8 }}>
                      {slides[currentSlide].pointsKeys.map((pointKey) => (
                        <li key={pointKey}>{t(pointKey)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            <span
              style={{
                fontSize: Math.max(fontSize - 1, 12),
                fontWeight: 500,
              }}
            >
              {t("widgets.infoWidget.slideCounter")} {currentSlide + 1}/{slides.length}
            </span>

            <button
              type="button"
              onClick={goToPreviousSlide}
              aria-label={t("widgets.infoWidget.previousSlide")}
              style={{
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize,
              }}
            >
              ←
            </button>

            <button
              type="button"
              onClick={goToNextSlide}
              aria-label={t("widgets.infoWidget.nextSlide")}
              style={{
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize,
              }}
            >
              →
            </button>
          </div>
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
