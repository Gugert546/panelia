type Props = {
  children: React.ReactNode;
};

export default function WidgetContainer({ children }: Props) {
  return (
    <div
      style={{
        // Felles ytterramme for alle widgets.
        width: "100%",
        height: "100%",
        padding: 5,
        boxSizing: "border-box",
        display: "flex",
        minHeight: 0,
        overflow: "hidden"
      }}
    >
      {children}
    </div>
  );
}