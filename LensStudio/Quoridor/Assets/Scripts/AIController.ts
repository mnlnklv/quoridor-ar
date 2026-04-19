import { BoardState, Vec2Int, WallPlacement } from "./BoardState";
import { WallValidator } from "./WallValidator";

export type AIDecision =
  | { type: "MOVE"; pos: Vec2Int }
  | { type: "WALL"; wall: WallPlacement };

type Action =
  | { type: "MOVE"; pos: Vec2Int }
  | { type: "WALL"; wall: WallPlacement };

export class AIController {

  private static readonly SEARCH_DEPTH = 2;
  private static positionHistory: Vec2Int[] = [];
  private static readonly HISTORY_SIZE = 6;

  static resetHistory(): void {
    AIController.positionHistory = [];
  }

  // ─── Main Decision ────────────────────────────────────────────────────────────

  static decideMove(state: BoardState): AIDecision {
    const aiDist = WallValidator.getDistance(state, state.aiPos, 0);
    const playerDist = WallValidator.getDistance(state, state.playerPos, 8);

    print("AIController: aiDist=" + aiDist + " playerDist=" + playerDist);

    if (aiDist <= 1 || (aiDist <= 3 && aiDist < playerDist - 1)) {
      return AIController.bestMoveOnly(state);
    }

    if (state.aiWallsLeft === 0) {
      return AIController.bestMoveOnly(state);
    }

    const result = AIController.minimax(
      state, AIController.SEARCH_DEPTH, -Infinity, Infinity, true
    );

    if (result.action === null) {
      return AIController.bestMoveOnly(state);
    }

    if (result.action.type === "MOVE") {
      AIController.positionHistory.push({ ...result.action.pos });
      if (AIController.positionHistory.length > AIController.HISTORY_SIZE) {
        AIController.positionHistory.shift();
      }
      print("AIController: Moving to R" +
        result.action.pos.row + " C" + result.action.pos.col +
        " (score=" + result.score.toFixed(2) + ")");
      return { type: "MOVE", pos: result.action.pos };
    } else {
      print("AIController: Wall placed — axis=" + result.action.wall.axis +
        " R" + result.action.wall.row + " C" + result.action.wall.col +
        " (score=" + result.score.toFixed(2) + ")");
      return { type: "WALL", wall: result.action.wall };
    }
  }

  // ─── Evaluation Function ──────────────────────────────────────────────────────

      private static evaluate(state: BoardState): number {
      const aiDist = WallValidator.getDistance(state, state.aiPos, 0);
      const playerDist = WallValidator.getDistance(state, state.playerPos, 8);
    
      if (aiDist === 0) return 10000;
      if (playerDist === 0) return -10000;
      if (aiDist >= 999) return -10000;
      if (playerDist >= 999) return 10000;
    
      const pathDiff = (playerDist - aiDist) * 2;
      const wallDiff = (state.aiWallsLeft - state.playerWallsLeft) * 0.8;
      const aiProgress = (8 - aiDist) * 0.3;
    
      // Penalise positions that appear in recent move history
      let historyPenalty = 0;
      for (const h of AIController.positionHistory) {
        if (h.row === state.aiPos.row && h.col === state.aiPos.col) {
          historyPenalty = 3;
          break;
        }
      }
    
      return pathDiff + wallDiff + aiProgress - historyPenalty;
    }

  // ─── Minimax with Alpha-Beta Pruning ──────────────────────────────────────────

  private static minimax(
    state: BoardState,
    depth: number,
    alpha: number,
    beta: number,
    isAiTurn: boolean
  ): { score: number; action: Action | null } {
    const aiDist = WallValidator.getDistance(state, state.aiPos, 0);
    const playerDist = WallValidator.getDistance(state, state.playerPos, 8);

    if (aiDist === 0 || playerDist === 0 || depth === 0) {
      return { score: AIController.evaluate(state), action: null };
    }

    const actions = AIController.generateActions(state, isAiTurn, aiDist, playerDist);

    if (actions.length === 0) {
      return { score: AIController.evaluate(state), action: null };
    }

    const sortedActions = AIController.sortActionsByHeuristic(state, actions, isAiTurn);
    let bestAction: Action | null = null;

    if (isAiTurn) {
      let maxScore = -Infinity;

      for (const action of sortedActions) {
        const nextState = AIController.applyAction(state, action, true);
        const result = AIController.minimax(nextState, depth - 1, alpha, beta, false);

        if (result.score > maxScore) {
          maxScore = result.score;
          bestAction = action;
        }

        alpha = Math.max(alpha, result.score);
        if (beta <= alpha) break;
      }

      return { score: maxScore, action: bestAction };
    } else {
      let minScore = Infinity;

      for (const action of sortedActions) {
        const nextState = AIController.applyAction(state, action, false);
        const result = AIController.minimax(nextState, depth - 1, alpha, beta, true);

        if (result.score < minScore) {
          minScore = result.score;
          bestAction = action;
        }

        beta = Math.min(beta, result.score);
        if (beta <= alpha) break;
      }

      return { score: minScore, action: bestAction };
    }
  }

  // ─── Wall Connectivity Bonus ──────────────────────────────────────────────────

  private static getWallConnectivityBonus(
    state: BoardState,
    wall: WallPlacement
  ): number {
    let bonus = 0;

    if (wall.axis === "H") {
      const vCandidates = [
        { row: wall.row,     col: wall.col     },
        { row: wall.row - 1, col: wall.col     },
        { row: wall.row,     col: wall.col + 1 },
        { row: wall.row - 1, col: wall.col + 1 },
      ];
      for (const v of vCandidates) {
        if (v.row >= 0 && v.row <= 7 && v.col >= 0 && v.col <= 7) {
          if (state.vWalls[v.row][v.col]) bonus += 3;
        }
      }
      if (wall.row > 0 && state.hWalls[wall.row - 1][wall.col]) bonus -= 2;
      if (wall.row < 7 && state.hWalls[wall.row + 1][wall.col]) bonus -= 2;
    } else {
      const hCandidates = [
        { row: wall.row,     col: wall.col     },
        { row: wall.row,     col: wall.col - 1 },
        { row: wall.row + 1, col: wall.col     },
        { row: wall.row + 1, col: wall.col - 1 },
      ];
      for (const h of hCandidates) {
        if (h.row >= 0 && h.row <= 7 && h.col >= 0 && h.col <= 7) {
          if (state.hWalls[h.row][h.col]) bonus += 3;
        }
      }
      if (wall.col > 0 && state.vWalls[wall.row][wall.col - 1]) bonus -= 2;
      if (wall.col < 7 && state.vWalls[wall.row][wall.col + 1]) bonus -= 2;
    }

    return bonus;
  }

  // ─── Heuristic Sort ───────────────────────────────────────────────────────────

  private static sortActionsByHeuristic(
    state: BoardState,
    actions: Action[],
    isAiTurn: boolean
  ): Action[] {
    const scored = actions.map(action => {
      let priority = 0;

      if (action.type === "MOVE") {
        const targetRow = isAiTurn ? 0 : 8;
        const currentRow = isAiTurn ? state.aiPos.row : state.playerPos.row;
        const newRow = action.pos.row;
        priority = Math.abs(currentRow - targetRow) - Math.abs(newRow - targetRow);
        priority += 10;

        // Penalise returning to recently visited positions
        if (isAiTurn) {
          for (const h of AIController.positionHistory) {
            if (h.row === action.pos.row && h.col === action.pos.col) {
              priority -= 15;
              break;
            }
          }
        }
      } else {
        const opponent = isAiTurn ? state.playerPos : state.aiPos;
        const dist = Math.abs(action.wall.row - opponent.row) +
          Math.abs(action.wall.col - opponent.col);
        priority = -dist;
        priority += AIController.getWallConnectivityBonus(state, action.wall);
      }

      return { action, priority };
    });

    scored.sort((a, b) => b.priority - a.priority);
    return scored.map(s => s.action);
  }

  // ─── Action Generation ────────────────────────────────────────────────────────

  private static generateActions(
    state: BoardState,
    isAiTurn: boolean,
    aiDist: number,
    playerDist: number
  ): Action[] {
    const actions: Action[] = [];

    const pos = isAiTurn ? state.aiPos : state.playerPos;
    const moves = state.getValidMoves(pos);
    for (const move of moves) {
      actions.push({ type: "MOVE", pos: move });
    }

    const wallsLeft = isAiTurn ? state.aiWallsLeft : state.playerWallsLeft;
    if (wallsLeft === 0) return actions;

    const playerClose = playerDist <= 5;
    const aiClose = aiDist <= 5;
    const playerLeading = playerDist < aiDist - 1;
    const aiLeading = aiDist < playerDist - 1;

    if (!playerClose && !aiClose && !playerLeading && !aiLeading) {
      return actions;
    }

    const candidateWalls = AIController.getCandidateWalls(state);

    for (const wall of candidateWalls) {
      if (WallValidator.isWallLegal(state, wall)) {
        actions.push({ type: "WALL", wall });
      }
    }

    return actions;
  }

  // ─── Candidate Wall Generation ────────────────────────────────────────────────

  private static getWallsBlockingPath(path: Vec2Int[]): WallPlacement[] {
    const walls: WallPlacement[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];

      if (a.col === b.col) {
        const minRow = Math.min(a.row, b.row);
        const col = a.col;
        if (col >= 0 && col <= 7) {
          walls.push({ row: minRow, col: col, axis: "H" });
        }
        if (col - 1 >= 0 && col - 1 <= 7) {
          walls.push({ row: minRow, col: col - 1, axis: "H" });
        }
      } else if (a.row === b.row) {
        const minCol = Math.min(a.col, b.col);
        const row = a.row;
        if (row >= 0 && row <= 7) {
          walls.push({ row: row, col: minCol, axis: "V" });
        }
        if (row - 1 >= 0 && row - 1 <= 7) {
          walls.push({ row: row - 1, col: minCol, axis: "V" });
        }
      }
    }

    return walls;
  }

  private static getCandidateWalls(state: BoardState): WallPlacement[] {
    const seen = new Set<string>();
    const walls: WallPlacement[] = [];

    const addWall = (w: WallPlacement) => {
      const key = w.axis + w.row + "," + w.col;
      if (!seen.has(key)) {
        seen.add(key);
        walls.push(w);
      }
    };

    const playerPath = WallValidator.getShortestPath(state, state.playerPos, 8);
    for (const w of AIController.getWallsBlockingPath(playerPath)) {
      addWall(w);
    }

    const aiPath = WallValidator.getShortestPath(state, state.aiPos, 0);
    for (const w of AIController.getWallsBlockingPath(aiPath)) {
      addWall(w);
    }

    return walls;
  }

  // ─── Apply Action ─────────────────────────────────────────────────────────────

  private static applyAction(
    state: BoardState,
    action: Action,
    isAi: boolean
  ): BoardState {
    const next = state.clone();

    if (action.type === "MOVE") {
      next.applyMove(action.pos, isAi ? "AI" : "PLAYER");
    } else {
      next.applyWall(action.wall);
      if (isAi) {
        next.aiWallsLeft--;
      } else {
        next.playerWallsLeft--;
      }
    }

    return next;
  }

  // ─── Fallback ─────────────────────────────────────────────────────────────────

  private static bestMoveOnly(state: BoardState): AIDecision {
    const validMoves = state.getValidMoves(state.aiPos);

    if (validMoves.length === 0) {
      return { type: "MOVE", pos: state.aiPos };
    }

    let bestScore = -Infinity;
    let bestMoves: Vec2Int[] = [];

    for (const move of validMoves) {
      // Apply history penalty in sprint mode too
      let historyPenalty = 0;
      for (const h of AIController.positionHistory) {
        if (h.row === move.row && h.col === move.col) {
          historyPenalty = 8;
          break;
        }
      }

      const sim = state.clone();
      sim.applyMove(move, "AI");
      const dist = WallValidator.getDistance(sim, sim.aiPos, 0);
      const score = -dist - historyPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    AIController.positionHistory.push({ ...chosen });
    if (AIController.positionHistory.length > AIController.HISTORY_SIZE) {
      AIController.positionHistory.shift();
    }
    print("AIController: Sprint move to R" + chosen.row + " C" + chosen.col);
    return { type: "MOVE", pos: chosen };
  }
}