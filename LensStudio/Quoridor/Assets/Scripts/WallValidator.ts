import { BoardState, Vec2Int, WallPlacement } from "./BoardState";

export class WallValidator {

  static isWallLegal(state: BoardState, wall: WallPlacement): boolean {
    if (
      wall.row < 0 || wall.row > 7 ||
      wall.col < 0 || wall.col > 7
    ) return false;

    if (wall.axis === "H") {
      // Slot already occupied
      if (state.hWalls[wall.row][wall.col]) return false;
      // Adjacent wall to the right would overlap
      if (wall.col < 7 && state.hWalls[wall.row][wall.col + 1]) return false;
      // Adjacent wall to the left would overlap
      if (wall.col > 0 && state.hWalls[wall.row][wall.col - 1]) return false;
      // Crossing V wall at same intersection
      if (state.vWalls[wall.row][wall.col]) return false;
    } else {
      // Slot already occupied
      if (state.vWalls[wall.row][wall.col]) return false;
      // Adjacent wall below would overlap
      if (wall.row < 7 && state.vWalls[wall.row + 1][wall.col]) return false;
      // Adjacent wall above would overlap
      if (wall.row > 0 && state.vWalls[wall.row - 1][wall.col]) return false;
      // Crossing H wall at same intersection
      if (state.hWalls[wall.row][wall.col]) return false;
    }

    const simulated = state.clone();
    simulated.applyWall(wall);

    const playerCanReach = WallValidator.hasPath(
      simulated, simulated.playerPos, 8
    );
    const aiCanReach = WallValidator.hasPath(
      simulated, simulated.aiPos, 0
    );

    return playerCanReach && aiCanReach;
  }

  static hasPath(
    state: BoardState,
    start: Vec2Int,
    goalRow: number
  ): boolean {
    const visited: boolean[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(false));

    const queue: Vec2Int[] = [{ ...start }];
    visited[start.row][start.col] = true;

    const directions: Vec2Int[] = [
      { row: 1, col: 0 },
      { row: -1, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.row === goalRow) return true;

      for (const dir of directions) {
        const next: Vec2Int = {
          row: current.row + dir.row,
          col: current.col + dir.col,
        };
        if (!state.isInBounds(next)) continue;
        if (visited[next.row][next.col]) continue;
        if (state.isWallBetween(current, next)) continue;
        visited[next.row][next.col] = true;
        queue.push(next);
      }
    }

    return false;
  }

  static getDistance(
    state: BoardState,
    start: Vec2Int,
    goalRow: number
  ): number {
    const visited: boolean[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(false));

    const queue: { pos: Vec2Int; dist: number }[] = [
      { pos: { ...start }, dist: 0 },
    ];
    visited[start.row][start.col] = true;

    const directions: Vec2Int[] = [
      { row: 1, col: 0 },
      { row: -1, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: -1 },
    ];

    while (queue.length > 0) {
      const { pos: current, dist } = queue.shift()!;
      if (current.row === goalRow) return dist;

      for (const dir of directions) {
        const next: Vec2Int = {
          row: current.row + dir.row,
          col: current.col + dir.col,
        };
        if (!state.isInBounds(next)) continue;
        if (visited[next.row][next.col]) continue;
        if (state.isWallBetween(current, next)) continue;
        visited[next.row][next.col] = true;
        queue.push({ pos: next, dist: dist + 1 });
      }
    }

    return 999;
  }

  static getShortestPath(
    state: BoardState,
    start: Vec2Int,
    goalRow: number
  ): Vec2Int[] {
    const visited: boolean[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(false));

    const queue: { pos: Vec2Int; path: Vec2Int[] }[] = [
      { pos: { ...start }, path: [{ ...start }] },
    ];
    visited[start.row][start.col] = true;

    const directions: Vec2Int[] = [
      { row: 1, col: 0 },
      { row: -1, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: -1 },
    ];

    while (queue.length > 0) {
      const { pos: current, path } = queue.shift()!;
      if (current.row === goalRow) return path;

      for (const dir of directions) {
        const next: Vec2Int = {
          row: current.row + dir.row,
          col: current.col + dir.col,
        };
        if (!state.isInBounds(next)) continue;
        if (visited[next.row][next.col]) continue;
        if (state.isWallBetween(current, next)) continue;
        visited[next.row][next.col] = true;
        queue.push({ pos: next, path: [...path, { ...next }] });
      }
    }

    return [];
  }
}