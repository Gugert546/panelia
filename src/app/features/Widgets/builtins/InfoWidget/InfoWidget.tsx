import { useEffect, useState } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useLanguage } from "../../../../providers/languageProvider";
import { useFontSize } from "../../../../providers/themeProviders";

import fremgang  from  "../../../../../assets/fremgang.png";
import paneliaLogo  from  "../../../../../assets/logo.png"

export default function InfoWidget() {
  const { t } = useLanguage();
  const { fontSize } = useFontSize();
  const [currentSlide, setCurrentSlide] = useState(0);
  const titleSize = fontSize + 2;

  const slides = [
    {image:paneliaLogo},
    {text: "Panelia skal være en nettside som skal brukes som det første “trappetrinnet” når brukeren skal ut på internett, her skal informasjon som brukeren trenger/ønsker samles og presenteres på en ryddig og intuitiv måte ",title:"om problemstilling"},
    {title:"Fremgangsmåte",image: fremgang, alt:"fremdriftsplan for Panelia-prosjektet" },
    {title:"Erfaringer",
          text:"-Plan vs virkelighet",
          text2:"-Fleksibel rollefordeling",
          text3:"-Dailies og faste arbeidsdager’",
          text4:"-Prioritering av kjernefunksjonalitet",
          text5:"-Viktigheten av kommunikasjon",
      },
    {title:"Utbytte",
        text: t("widgets.infoWidget.utbytte"),
        text2:t("widgets.infoWidget.utbytte2"),
        text3:t("widgets.infoWidget.utbytte3"),
        text4:"Erfaring med Ai, API og web utvikling",
        text5:t("widgets.infoWidget.utbytte4")
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
                  padding: "4px 4px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#ffffff9d",
                  fontWeight: 100,
                  fontSize,
                  width: "100%",
                  display: "flex",
                  alignItems: "top",
                  justifyContent: "top",
                  overflowY: "auto",
                  flexDirection:"column"
                }}
              >
                {slides[currentSlide].title &&(
                  <div> 
                    <h2>{slides[currentSlide].title}</h2>
                  </div>

                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    textAlign:"left",
                  }}>
                  {slides[currentSlide].text}
                  {slides[currentSlide].image && (
                    <img
                    src={slides[currentSlide].image}
                    alt={slides[currentSlide].alt}
                    style={{ alignItems:"center",maxWidth: "100%", height: "auto", borderRadius: 8 }}
                    />
                  )}
                  </div>
                  <div
                    style={{
                      padding: "12px 14px",
                      textAlign:"left"
                    }}>
                    {slides[currentSlide].text2}
                  </div>
                  <div
                  style={{
                      padding: "12px 14px",
                      textAlign:"left"
                    }}>
                    {slides[currentSlide].text3}
                  </div>
                  <div
                  style={{
                      padding: "12px 14px",
                      textAlign:"left"
                    }}>
                    {slides[currentSlide].text4}
                  </div>
                   <div
                  style={{
                      padding: "12px 14px",
                      textAlign:"left"
                    }}>
                    {slides[currentSlide].text5}
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
