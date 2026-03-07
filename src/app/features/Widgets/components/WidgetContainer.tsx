type Props = {
  children: React.ReactNode;
};

export default function WidgetContainer({ children }: Props) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 10,
        boxSizing: "border-box",
        display: "flex",
        overflow: "hidden"
      }}
    >
      {children}
    </div>
  );
}