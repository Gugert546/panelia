import { useEffect, useRef } from "react";
import WidgetContainer from "../../components/WidgetContainer";
import WidgetPane from "../../components/WidgetPane";
import { useLanguage } from "../../../../providers/languageProvider";
import { useResolvedWidgetFontSize } from "../../hooks/useResolvedWidgetFontSize";
import { useMinesweeperWidget } from "./minesweeperLogic";

const CELL_COLORS = [
  "inherit",
  "#2563eb",
  "#15803d",
  "#dc2626",
  "#7c3aed",
  "#c2410c",
  "#0891b2",
  "#111827",
  "#475569",
];

function getStatusLabel(
  status: "idle" | "playing" | "won" | "lost",
  t: (key: string) => string
) {
  if (status === "won") return t("widgets.minesweeperWidget.won");
  if (status === "lost") return t("widgets.minesweeperWidget.lost");
  if (status === "playing") return t("widgets.minesweeperWidget.instructions");
  return t("widgets.minesweeperWidget.idle");
}

export default function MinesweeperWidgetUI() {
  const { state, actions } = useMinesweeperWidget();
  const fontSize = useResolvedWidgetFontSize();
  const { t } = useLanguage();
  const confettiPieces = Array.from({ length: 18 }, (_, index) => index);
  const newGameButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.status === "lost") {
      newGameButtonRef.current?.focus();
    }
  }, [state.status]);

  return (
    <WidgetContainer>
      <WidgetPane title={t("widgets.minesweeper")}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: "100%",
            height: "100%",
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                fontSize,
              }}
            >
              <span>{t("widgets.minesweeperWidget.mines")}: {state.mines}</span>
              <span>{t("widgets.minesweeperWidget.flags")}: {state.flagsRemaining}</span>
              <span>{t("widgets.minesweeperWidget.time")}: {state.elapsedSeconds}s</span>
            </div>

            <button
              ref={newGameButtonRef}
              data-minesweeper-new-game-btn="true"
              type="button"
              onClick={actions.resetGame}
              onKeyDown={(event) => {
                const widgetRoot = event.currentTarget.closest("[data-widget-id]");

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  event.stopPropagation();
                  const lockButton = widgetRoot?.querySelector(
                    "button.widget-lock-btn:not([disabled])"
                  ) as HTMLButtonElement | null;
                  lockButton?.focus();
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  event.stopPropagation();
                  const firstCell = widgetRoot?.querySelector(
                    'button[data-minesweeper-cell="0-0"]:not([disabled])'
                  ) as HTMLButtonElement | null;
                  firstCell?.focus();
                }
              }}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                background: "rgba(255,255,255,0.28)",
                color: "inherit",
                borderRadius: 999,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize,
                fontWeight: 600,
              }}
            >
              {t("widgets.minesweeperWidget.newGame")}
            </button>
          </div>

          <div
            style={{
              fontSize: Math.max(12, Number(fontSize) - 1 || 12),
              opacity: 0.8,
              minHeight: Math.max(fontSize * 2, 32),
              display: "flex",
              alignItems: "center",
            }}
          >
            {getStatusLabel(state.status, t)}
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "stretch",
            }}
          >
            <div
              data-minesweeper-grid
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${state.columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${state.rows}, minmax(0, 1fr))`,
                gap: 4,
                width: "100%",
                maxWidth: 420,
                aspectRatio: `${state.columns} / ${state.rows}`,
                userSelect: "none",
                position: "relative",
              }}
            >
              {state.board.flat().map((cell) => (
                <button
                  key={cell.id}
                  type="button"
                  data-minesweeper-cell={`${cell.row}-${cell.column}`}
                  onClick={() => actions.revealCell(cell.row, cell.column)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    actions.toggleFlag(cell.row, cell.column);
                  }}
                  onKeyDown={(event) => {
                    let targetRow = cell.row;
                    let targetCol = cell.column;
                    if (event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); targetCol += 1; }
                    else if (event.key === "ArrowLeft") { event.preventDefault(); event.stopPropagation(); targetCol -= 1; }
                    else if (event.key === "ArrowDown") { event.preventDefault(); event.stopPropagation(); targetRow += 1; }
                    else if (event.key === "ArrowUp") {
                      event.preventDefault(); event.stopPropagation();
                      if (cell.row === 0) { newGameButtonRef.current?.focus(); return; }
                      targetRow -= 1;
                    }
                    else return;
                    const grid = event.currentTarget.closest('[data-minesweeper-grid]');
                    const next = grid?.querySelector<HTMLElement>(`[data-minesweeper-cell="${targetRow}-${targetCol}"]`);
                    next?.focus();
                  }}
                  aria-label={`${t("widgets.minesweeperWidget.cell")} ${cell.row + 1}-${cell.column + 1}`}
                  style={{
                    border: cell.isRevealed
                      ? "1px solid rgba(60, 76, 112, 0.18)"
                      : "1px solid rgba(255,255,255,0.34)",
                    borderRadius: 10,
                    background: cell.isRevealed
                      ? cell.isMine
                        ? "linear-gradient(180deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))"
                        : "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(226,232,240,0.92))"
                      : "linear-gradient(180deg, rgba(51, 65, 85, 0.9), rgba(15, 23, 42, 0.94))",
                    color: cell.isMine
                      ? "#ffffff"
                      : CELL_COLORS[cell.adjacentMines] ?? "inherit",
                    cursor: state.status === "won" || state.status === "lost" ? "default" : "pointer",
                    fontWeight: 700,
                    fontSize: "clamp(0.8rem, 1.3vw, 1rem)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                    padding: 0,
                    boxShadow: cell.isRevealed
                      ? "inset 0 1px 2px rgba(255,255,255,0.45), inset 0 -1px 2px rgba(15,23,42,0.08)"
                      : "inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 14px rgba(15,23,42,0.18)",
                    textShadow: cell.isRevealed && !cell.isMine && cell.adjacentMines > 0
                      ? "0 1px 0 rgba(255,255,255,0.45)"
                      : "none",
                  }}
                >
                  {cell.isRevealed
                    ? cell.isMine
                      ? "✹"
                      : cell.adjacentMines > 0
                        ? cell.adjacentMines
                        : ""
                    : cell.isFlagged
                      ? "⚑"
                      : ""}
                </button>
              ))}

              {state.status === "won" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.58))",
                    backdropFilter: "blur(4px)",
                    overflow: "hidden",
                    pointerEvents: "none",
                  }}
                >
                  <style>
                    {`
                      @keyframes minesweeper-confetti-fall {
                        0% {
                          transform: translate3d(0, -18px, 0) rotate(0deg);
                          opacity: 0;
                        }
                        15% {
                          opacity: 1;
                        }
                        100% {
                          transform: translate3d(var(--drift), 260px, 0) rotate(540deg);
                          opacity: 0;
                        }
                      }
                    `}
                  </style>

                  {confettiPieces.map((piece) => (
                    <span
                      key={piece}
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: -20,
                        left: `${(piece * 97) % 100}%`,
                        width: piece % 3 === 0 ? 8 : 10,
                        height: piece % 2 === 0 ? 14 : 8,
                        borderRadius: 999,
                        background: [
                          "#f97316",
                          "#22c55e",
                          "#3b82f6",
                          "#eab308",
                          "#ec4899",
                        ][piece % 5],
                        transform: "translate3d(0, -18px, 0)",
                        animation: `minesweeper-confetti-fall ${1.8 + (piece % 4) * 0.25}s linear infinite`,
                        animationDelay: `${piece * 0.08}s`,
                        ["--drift" as string]: `${(piece % 2 === 0 ? 1 : -1) * (18 + (piece % 5) * 8)}px`,
                      }}
                    />
                  ))}

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      textAlign: "center",
                      zIndex: 1,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 1 }}>
                      🎉
                    </div>
                    <div style={{ fontSize: Math.max(fontSize + 4, 18), fontWeight: 800 }}>
                      {t("widgets.minesweeperWidget.congratsTitle")}
                    </div>
                    <div style={{ fontSize, maxWidth: 240 }}>
                      {t("widgets.minesweeperWidget.congratsBody")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </WidgetPane>
    </WidgetContainer>
  );
}
