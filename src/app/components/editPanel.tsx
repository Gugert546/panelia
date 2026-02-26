
type EditPanelProps = {
  open: boolean;
  onClose: () => void;
};

export default function EditPanel({ open, onClose }: EditPanelProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: open ? 86 : "-40%",
        width: "40%",
        height: "100%",
        background: "linear-gradient(180deg, #ffd2b5 0%, #efb59c 100%)",
        backdropFilter: "blur(10px)",
        transition: "left 0.3s ease",
        zIndex: 999,
        padding: 24,
        boxShadow: "4px 0 12px rgba(0,0,0,0.1)"
      }}
    >
      <button onClick={onClose}>Lukk</button>

      <h2>Rediger-modus</h2>

      <p>Sample text, her kommer widget valg</p>
    </div>
  );
}