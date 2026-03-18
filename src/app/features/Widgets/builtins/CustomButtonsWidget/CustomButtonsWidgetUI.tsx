import WidgetPane from "../../components/WidgetPane";
import { useCustomButtonsWidget } from "./CustomButtonsWidgetLogic";
import { useLanguage } from "../../../../providers/languageProvider";

export default function CustomButtonsWidgetUI() {
  const { state, actions } = useCustomButtonsWidget();
  const { t } = useLanguage();

  return (
    <WidgetPane title={t('widgets.customButtons.title')}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <input
          type="text"
          placeholder={t('widgets.customButtons.buttonName')}
          value={state.label}
          onChange={(e) => actions.setLabel(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        <input
          type="text"
          placeholder={t('widgets.customButtons.link')}
          value={state.url}
          onChange={(e) => actions.setUrl(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        <button
          type="button"
          onClick={actions.addButton}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "none",
            background: "#cde8ff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {t('widgets.customButtons.add')}
        </button>


      </div>
    </WidgetPane>
  );
}