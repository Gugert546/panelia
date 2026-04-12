import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";

export default function InfoWidget() {
  return (
    <WidgetContainer>
      <WidgetPane title="">
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "clamp(1rem, 2.2vw, 1.5rem)",
          }}
        >
          Velkommen til Panelia!
          
          Bruk siden vår hvis ikke får du besøk i natt! 
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}