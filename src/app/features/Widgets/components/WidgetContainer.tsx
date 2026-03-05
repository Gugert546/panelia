type WidgetSize = "small" | "medium" | "large" | "wide";

type Props = {
  size: WidgetSize;
  children: React.ReactNode;
};

export default function WidgetContainer({ size, children }: Props) {

  const padding =
    size === "small" ? 6 :
    size === "medium" ? 10 :
    size === "large" ? 14 :
    10;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding,
        boxSizing: "border-box",
        display: "flex",
        overflow: "hidden"
      }}
    >
      {children}
    </div>
  );
}