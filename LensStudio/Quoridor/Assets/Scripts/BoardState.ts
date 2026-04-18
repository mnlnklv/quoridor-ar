export type Vec2Int = { row: number; col: number };
export type Axis = "H" | "V";
export type Turn = "PLAYER" | "AI";
export type Phase =
  | "PLAYER_SELECT_ACTION"
  | "PLAYER_SELECT_WALL"
  | "AI_THINKING"
  | "GAME_OVER";

export type WallPlacement = {
  row: number;
  col: number;
  axis: Axis;
};

export class BoardState {
  playerPos: Vec2Int = { row: 0, col: 4 };
  aiPos: Vec2Int = { row: 8, col: 4 };
  hWalls: boolean[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(false));
  vWalls: boolean[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(false));
  playerWallsLeft: number = 10;
  aiWallsLeft: number = 10;
  turn: Turn = "PLAYER";
  phase: Phase = "PLAYER_SELECT_ACTION";
  winner: Turn | null = null;

  clone(): BoardState {
    const b = new BoardState();
    b.playerPos = { ...this.playerPos };
    b.aiPos = { ...this.aiPos };
    b.hWalls = this.hWalls.map((row) => [...row]);
    b.vWalls = this.vWalls.map((row) => [...row]);
    b.playerWallsLeft = this.playerWallsLeft;
    b.aiWallsLeft = this.aiWallsLeft;
    b.turn = this.turn;
    b.phase = this.phase;
    b.winner = this.winner;
    return b;
  }

  isInBounds(pos: Vec2Int): boolean {
    return pos.row >= 0 && pos.row <= 8 && pos.col >= 0 && pos.col <= 8;
  }

  isWallBetween(a: Vec2Int, b: Vec2Int): boolean {
    if (a.col === b.col) {
      const minRow = Math.min(a.row, b.row);
      const col = a.col;
      if (col > 0 && this.hWalls[minRow][col - 1]) return true;
      if (col < 8 && this.hWalls[minRow][col]) return true;
      return false;
    }
    if (a.row === b.row) {
      const minCol = Math.min(a.col, b.col);
      const row = a.row;
      if (row > 0 && this.vWalls[row - 1][minCol]) return true;
      if (row < 8 && this.vWalls[row][minCol]) return true;
      return false;
    }
    return false;
  }

  getValidMoves(pos: Vec2Int): Vec2Int[] {
    const directions: Vec2Int[] = [
      { row: 1, col: 0 },
      { row: -1, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: -1 },
    ];

    const opponentPos =
      pos.row === this.playerPos.row && pos.col === this.playerPos.col
        ? this.aiPos
        : this.playerPos;

    const moves: Vec2Int[] = [];

    for (const dir of directions) {
      const next: Vec2Int = {
        row: pos.row + dir.row,
        col: pos.col + dir.col,
      };

      if (!this.isInBounds(next)) continue;
      if (this.isWallBetween(pos, next)) continue;

      if (next.row === opponentPos.row && next.col === opponentPos.col) {
        const jump: Vec2Int = {
          row: next.row + dir.row,
          col: next.col + dir.col,
        };
        if (this.isInBounds(jump) && !this.isWallBetween(next, jump)) {
          moves.push(jump);
        } else {
          const perpDirs: Vec2Int[] = [
            { row: dir.col, col: dir.row },
            { row: -dir.col, col: -dir.row },
          ];
          for (const pd of perpDirs) {
            const diag: Vec2Int = {
              row: next.row + pd.row,
              col: next.col + pd.col,
            };
            if (this.isInBounds(diag) && !this.isWallBetween(next, diag)) {
              moves.push(diag);
            }
          }
        }
        continue;
      }

      moves.push(next);
    }

    return moves;
  }

  applyMove(pos: Vec2Int, turn: Turn): void {
    if (turn === "PLAYER") {
      this.playerPos = { ...pos };
    } else {
      this.aiPos = { ...pos };
    }
  }

  applyWall(wall: WallPlacement): void {
    if (wall.axis === "H") {
      this.hWalls[wall.row][wall.col] = true;
    } else {
      this.vWalls[wall.row][wall.col] = true;
    }
  }

  checkWinner(): Turn | null {
    if (this.playerPos.row === 8) return "PLAYER";
    if (this.aiPos.row === 0) return "AI";
    return null;
  }
}