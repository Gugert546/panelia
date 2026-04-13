import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useLanguage } from "../../../../providers/languageProvider";
import { useFontSize } from "../../../../providers/themeProviders";

export default function InfoWidget() {
  const { t } = useLanguage();
  const { fontSize } = useFontSize();
  const titleSize = fontSize+2;
  return (
    <WidgetContainer>
      <WidgetPane title="">
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "top",
            justifyContent: "center",
            textAlign: "center",
            fontWeight: 700,
            fontSize: titleSize
          }}
        >
          <div>
            <h1>{t("widgets.infoWidget.title")}</h1>
              <div
              style={{
                padding: "8px 10px",
                marginTop:8,
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize,
              }}
              >
                {t("widgets.infoWidget.bread")}
              </div>
          </div>
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}