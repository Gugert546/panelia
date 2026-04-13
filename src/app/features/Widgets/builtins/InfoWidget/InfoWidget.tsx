import { useEffect, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useLanguage } from "../../../../providers/languageProvider";
import { useFontSize } from "../../../../providers/themeProviders";

import fremgang  from  "../../../../../assets/fremgang.png"

export default function InfoWidget() {
  const { t } = useLanguage();
  const { fontSize } = useFontSize();
  const [currentSlide, setCurrentSlide] = useState(0);
  const titleSize = fontSize + 2;

  const slides = [
    {text: t("widgets.infoWidget.aboutUs")},
    {text: t("widgets.infoWidget.aboutTask")},
    {text: t("widgets.infoWidget.aboutPanelia")},
    {text: t("widgets.infoWidget.aboutGoal")},
    {text: t("widgets.infoWidget.plannedWork"),image: fremgang, alt:"fremdriftsplan for Panelia-prosjektet"},
    {text: t("widgets.infoWidget.challenges")},
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
      <WidgetPane title="">
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
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#fff",
                  fontWeight: 100,
                  fontSize,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflowY: "auto",
                }}
              >
                {slides[currentSlide].text}
                {slides[currentSlide].image && (
                  <img
                  src={slides[currentSlide].image}
                  alt={slides[currentSlide].alt}
                  style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
                  />
                )}
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
              {currentSlide + 1}/{slides.length}
            </span>

            <button
              type="button"
              onClick={goToPreviousSlide}
              aria-label="Previous slide"
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
              aria-label="Next slide"
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
