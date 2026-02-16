import type { WidgetComponentProps } from "../../registry/WidgetRegistry";

type NotesConfig = {
  text?: string;
};

export function NotesWidget({ config, onConfigChange }: WidgetComponentProps) {
  const { text = "" } = config as NotesConfig;

  return (
    <textarea
      value={text}
      onChange={(e) => onConfigChange({ text: e.target.value })}
      placeholder="Notater…"
      style={{ width: "100%", height: 140 }}
    />
  );
}
