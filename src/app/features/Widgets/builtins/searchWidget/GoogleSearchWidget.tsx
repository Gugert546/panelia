import iconMenu from "../../../../../assets/icon-menu.png";
export default function SearchWidgetMock() {
  return (
    <div
      className="google-search-widget"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "min(760px, 90vw)",
        background: "rgba(255,255,255,0.35)",
        borderRadius: 999,
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
        border: "1px solid rgba(255,255,255,0.35)",
        backdropFilter: "blur(12px)",
      }}
    >
      <button
        type="button"
        aria-label="Meny"
        style={{
          border: "none",
          background: "transparent",
          cursor: "default",
          padding: 0,
          opacity: 0.85,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={iconMenu}
          alt=""
          style={{
            width: 60,
            height: 60,
            objectFit: "contain",
            display: "block",
          }}
        />
      </button>

      <input
        type="text"
        placeholder="Søk på Google"
        readOnly
        value=""
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: 15,
          color: "#111",
          opacity: 0.85,
        }}
      />

      <button
        type="button"
        aria-label="Søk"
        style={{
          border: "none",
          background: "transparent",
          cursor: "default",
          padding: 0,
          opacity: 0.9,
          pointerEvents: "none",
        }}
      >
        🔍
      </button>
    </div>
  );
}