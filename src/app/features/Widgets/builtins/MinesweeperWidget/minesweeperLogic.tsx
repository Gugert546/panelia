import { useCallback, useEffect, useMemo, useState } from "react";

const BOARD_ROWS = 8;
const BOARD_COLUMNS = 8;
const MINE_COUNT = 10;

export type MinesweeperCell = {
  id: string;
  row: number;
  column: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
};

type GameStatus = "idle" | "playing" | "won" | "lost";

function createEmptyBoard() {
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) => ({
      id: `${row}-${column}`,
      row,
      column,
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    } satisfies MinesweeperCell))
  );
}

function getNeighbors(row: number, column: number) {
  const neighbors: Array<{ row: number; column: number }> = [];

  for (let nextRow = row - 1; nextRow <= row + 1; nextRow += 1) {
    for (let nextColumn = column - 1; nextColumn <= column + 1; nextColumn += 1) {
      if (nextRow === row && nextColumn === column) continue;
      if (nextRow < 0 || nextRow >= BOARD_ROWS) continue;
      if (nextColumn < 0 || nextColumn >= BOARD_COLUMNS) continue;
      neighbors.push({ row: nextRow, column: nextColumn });
    }
  }

  return neighbors;
}

function placeMines(
  board: MinesweeperCell[][],
  safeRow: number,
  safeColumn: number
) {
  const safeCells = new Set(
    [{ row: safeRow, column: safeColumn }, ...getNeighbors(safeRow, safeColumn)].map(
      ({ row, column }) => `${row}-${column}`
    )
  );

  const candidates = board
    .flat()
    .filter((cell) => !safeCells.has(cell.id))
    .map((cell) => cell.id);

  let placedMines = 0;

  while (placedMines < MINE_COUNT && candidates.length > 0) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const [cellId] = candidates.splice(randomIndex, 1);

    if (!cellId) continue;

    const [row, column] = cellId.split("-").map(Number);
    board[row]![column]!.isMine = true;
    placedMines += 1;
  }

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const cell = board[row]![column]!;
      cell.adjacentMines = getNeighbors(row, column).filter(
        ({ row: neighborRow, column: neighborColumn }) =>
          board[neighborRow]![neighborColumn]!.isMine
      ).length;
    }
  }

  return board;
}

function revealConnectedCells(board: MinesweeperCell[][], startRow: number, startColumn: number) {
  const nextBoard = board.map((row) => row.map((cell) => ({ ...cell })));
  const queue: Array<{ row: number; column: number }> = [{ row: startRow, column: startColumn }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const cell = nextBoard[current.row]![current.column]!;
    if (visited.has(cell.id) || cell.isFlagged) continue;

    visited.add(cell.id);
    cell.isRevealed = true;

    if (cell.isMine || cell.adjacentMines > 0) continue;

    queue.push(...getNeighbors(current.row, current.column));
  }

  return nextBoard;
}

function revealAllMines(board: MinesweeperCell[][]) {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      isRevealed: cell.isRevealed || cell.isMine,
    }))
  );
}

function hasWon(board: MinesweeperCell[][]) {
  return board.flat().every((cell) => cell.isMine || cell.isRevealed);
}

export function useMinesweeperWidget() {
  const [board, setBoard] = useState<MinesweeperCell[][]>(() => createEmptyBoard());
  const [status, setStatus] = useState<GameStatus>("idle");
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (status !== "playing") return;

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [status]);

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setStatus("idle");
    setHasStarted(false);
    setElapsedSeconds(0);
  }, []);

  const revealCell = useCallback((row: number, column: number) => {
    setBoard((currentBoard) => {
      const currentCell = currentBoard[row]![column]!;
      if (currentCell.isRevealed || currentCell.isFlagged || status === "won" || status === "lost") {
        return currentBoard;
      }

      let nextBoard = currentBoard.map((currentRow) =>
        currentRow.map((cell) => ({ ...cell }))
      );

      if (!hasStarted) {
        nextBoard = placeMines(nextBoard, row, column);
        setHasStarted(true);
        setStatus("playing");
      }

      const nextCell = nextBoard[row]![column]!;

      if (nextCell.isMine) {
        const revealedBoard = revealAllMines(nextBoard);
        setStatus("lost");
        return revealedBoard;
      }

      const revealedBoard = revealConnectedCells(nextBoard, row, column);

      if (hasWon(revealedBoard)) {
        setStatus("won");
      } else {
        setStatus("playing");
      }

      return revealedBoard;
    });
  }, [hasStarted, status]);

  const toggleFlag = useCallback((row: number, column: number) => {
    if (status === "won" || status === "lost") return;

    setBoard((currentBoard) =>
      currentBoard.map((currentRow, rowIndex) =>
        currentRow.map((cell, columnIndex) => {
          if (rowIndex !== row || columnIndex !== column) return cell;
          if (cell.isRevealed) return cell;
          return {
            ...cell,
            isFlagged: !cell.isFlagged,
          };
        })
      )
    );
  }, [status]);

  const revealedCells = useMemo(
    () => board.flat().filter((cell) => cell.isRevealed).length,
    [board]
  );

  const flaggedCells = useMemo(
    () => board.flat().filter((cell) => cell.isFlagged).length,
    [board]
  );

  return {
    state: {
      board,
      status,
      elapsedSeconds,
      revealedCells,
      flaggedCells,
      mines: MINE_COUNT,
      rows: BOARD_ROWS,
      columns: BOARD_COLUMNS,
      flagsRemaining: MINE_COUNT - flaggedCells,
    },
    actions: {
      revealCell,
      toggleFlag,
      resetGame,
    },
  };
}
