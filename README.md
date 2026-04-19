# Quoridor AR

> A single-player augmented reality adaptation of the classic strategy board game Quoridor, built for Snapchat Spectacles using Lens Studio 5.13 and TypeScript.

Submitted to the **Snapchat Spectacles Open Source Challenge**.

**Repository:** [github.com/mnlnklv/quoridor-ar](https://github.com/mnlnklv/quoridor-ar)  

---

## Table of Contents

- [About the Game](#about-the-game)
- [Features](#features)
- [Visual Design](#visual-design)
- [Scripts](#scripts)
- [AI System](#ai-system)
- [Built With](#built-with)
- [Opening the Project](#opening-the-project)
- [License](#license)
- [Credits](#credits)

---

## About the Game

Quoridor is a two-player abstract strategy board game designed by Mirko Marchesi, first published in 1997. The board is a 9×9 grid. Each player starts on opposite sides and races to reach the far end. On each turn a player either **moves their pawn** one square in any orthogonal direction, or **places a wall** segment to block the opponent's path. Walls are two cells wide and can be placed horizontally or vertically, as long as they do not completely cut off either player's path to their goal.

The game is deceptively deep — optimal play requires reading your opponent's intended route, building walls that force long detours, and protecting your own path from being closed off.

This project brings Quoridor into augmented reality on Snapchat Spectacles. The board appears in physical space in front of you. You interact with it using hand tracking — dragging your pawn to move, and dragging wall tiles to place them. An AI opponent plays against you using minimax with alpha-beta pruning and path-based wall generation.

---

## Features

**Gameplay**
- Full Quoridor ruleset on a 9×9 board with 10 walls per player
- Legal wall validation via BFS — walls can never fully cut off a player's path
- Pawn jump-over logic including diagonal sidestep when a straight jump is blocked by a wall or the board edge
- Full game reset and replay without restarting the lens

**Interaction**
- Hand tracking via SpectaclesInteractionKit — drag pawn to move, drag wall tiles to place
- Pinch to rotate wall orientation between horizontal and vertical
- Confirm, rotate and cancel panel for wall placement
- Ghost wall preview during dragging
- Red error flash for invalid moves and illegal wall placements

**AI Opponent**
- Minimax with alpha-beta pruning at depth 2
- Path-aware wall placement — offensive walls target your BFS shortest path, defensive walls protect the AI's own path
- L-shape wall connectivity bonus to build interlocking barriers rather than isolated walls
- Early game suppression — no walls placed when distances are large and equal
- Sprint mode when close to winning
- Repetition penalty to prevent oscillation between positions

**Animations**
- Board pop-in on lens start
- Player pawn hop with squash and stretch on each move
- AI pawn idle breathing between turns
- AI pawn 5-phase hop — anticipation squash, rise with stretch, fall, land squash, settle
- Player win: 3-hop victory dance, crown pop-in that rides the pawn, confetti VFX burst
- AI win: two trombones pop in and orbit the player pawn with sine wave bob, physics-based tears stream from the player pawn
- Pulsing rim glow on player pawn during their turn
- Animated dot ring above the AI pawn while it is thinking

**Audio**
- Randomized movement sound pool (3 variants) and wall placement thud pool (3 variants)
- Board spawn, confetti pop, crown sparkle, AI jump, player fanfare, AI sad trumpet, error, button click, confirm, rotate, cancel

---

## Visual Design

The aesthetic is **marble and stone**. The board surface is green marble. The player pawn is blue marble, the AI pawn is red marble. Wall segments are colored marble slabs. The crown is a gold prop that pops onto the player pawn on a win.

All 3D models — pawns, walls, crown and trombones — were modelled in **Blender** and main assets were textured in **Substance Painter**. Confetti is a VFX component built in the Lens Studio VFX Graph Editor. The UI font is **Bebas Neue**.

---

## Scripts

| Script | Purpose |
|---|---|
| `BoardState.ts` | Pure game logic — board state, move validation, wall application, clone for simulation |
| `WallValidator.ts` | BFS utilities — path checking, distance, shortest path, wall legality |
| `AIController.ts` | Minimax AI with alpha-beta pruning, path-based wall generation, connectivity bonus |
| `GameController.ts` | Main orchestrator — SIK bindings, turn flow, input handling, win detection, reset |
| `BoardSpawnAnimation.ts` | Board and wall pop-in animations, `onBoardReady` callback |
| `PawnAnimator.ts` | AI pawn idle breathing and hop animation |
| `WinCelebration.ts` | Player win — victory dance, crown pop-in, confetti VFX |
| `TromboneCelebration.ts` | AI win — trombone orbit animation |
| `TearEffect.ts` | Physics-based tear particle system using a pre-pooled object set |
| `AudioManager.ts` | Centralized audio with randomized sound pools |
| `AIThinkingIndicator.ts` | Animated dot ring that tracks the AI pawn during computation |
| `TurnIndicator.ts` | Pulsing rim glow on the player pawn during their turn |
| `ErrorFlash.ts` | Red material flash for invalid moves and illegal wall placements |
| `RestartButtonAnimator.ts` | Restart button spin-in and hand hint |
| `ConfirmPanelAnimator.ts` | Staggered pop-in for the wall confirm/rotate/cancel panel |

### Key implementation notes

**`BoardState.ts`** — completely decoupled from rendering. Holds `playerPos`, `aiPos`, `hWalls[8][8]`, `vWalls[8][8]`, `playerWallsLeft` and `aiWallsLeft`. `getValidMoves()` handles straight jumps and diagonal sidesteps when a straight jump is blocked. `clone()` deep copies the entire state for minimax simulation without touching the real game.

**`WallValidator.ts`** — all methods are static. `isWallLegal()` checks bounds, overlap with adjacent same-axis walls, crossing perpendicular walls at the same intersection, then runs BFS on a cloned board to confirm neither player is fully cut off. `getShortestPath()` returns the full ordered cell list of the shortest path, used by the AI to generate precise candidate walls rather than guessing by proximity.

**`WinCelebration.ts`** — confetti calls `VFXComponent.restart()` directly on win. `clear()` is never called in reset — it leaves the VFX in a state that `restart()` cannot recover from, breaking confetti on subsequent wins. The crown pops in at the `CrownEmpty` world position then reparents to the player pawn with world position, rotation and scale explicitly restored after reparenting to prevent transform inheritance issues.

**`TearEffect.ts`** — 40 `SceneObject` instances are created and pooled in `onAwake` with no runtime instantiation during gameplay. Each tear has gravity and air resistance applied per frame and is returned to the pool when it falls below a configurable Y despawn threshold relative to the pawn.

**`AIThinkingIndicator.ts`** — Back.Out easing is implemented manually in the update loop using the standard cubic formula. The indicator's XZ world position tracks the AI pawn every frame so it follows the pawn correctly during its jump animation.

---

## AI System

The AI uses **minimax with alpha-beta pruning** at depth 2. At each node it generates all legal moves and candidate walls for the current player, applies them to a cloned board state, and recurses. Alpha-beta cuts branches that cannot affect the final decision, significantly reducing nodes evaluated.

### Evaluation

```
score = (playerDistance − aiDistance) × 2.0
      + (aiWallsLeft − playerWallsLeft) × 0.8
      + (8 − aiDistance) × 0.3
```

Path distance difference is the dominant term. Wall reserve advantage is secondary. A small progress bonus breaks ties in favor of the AI advancing. Terminal states return ±10000 immediately.

### Candidate Wall Generation

Instead of evaluating all 128 possible wall positions, the AI runs BFS on both the player's and AI's current positions to extract their full shortest paths. For each consecutive edge in each path it generates the wall positions that would block that exact edge. Offensive candidates cut your fastest route; defensive candidates protect the AI's own route against your future wall placements.

### Wall Connectivity Bonus

Before minimax evaluates actions, they are sorted by heuristic priority to improve alpha-beta efficiency. For wall actions, a connectivity bonus is applied:

An H wall at `(r, c)` shares corners with V walls at `(r, c)`, `(r−1, c)`, `(r, c+1)` and `(r−1, c+1)`. Walls sharing a corner form an L-shape, which forces far longer detours than isolated or parallel walls covering the same area.

- **+3 priority** per shared corner with an existing wall on the board
- **−2 priority** for parallel adjacent walls that create thin corridors instead of real barriers

Since alpha-beta evaluates higher-priority actions first and prunes after finding good results early, L-shape forming walls are far more likely to be selected as the final decision.

### Early Game Suppression

Wall candidates are only added to the action set when at least one of these is true: player is within 5 moves of winning, AI is within 5 moves of winning, or either player leads by 2 or more moves. Otherwise only move actions are generated, avoiding wasted walls in the opening.

### Sprint Mode

When `aiDist <= 1`, or `aiDist <= 3` and the AI leads by more than 1 move, minimax is skipped entirely. The AI picks whichever legal move minimally reduces its BFS distance to row 0, with random tiebreaking between equal options.

### Repetition Penalty

The AI tracks its last 6 positions in a history buffer. Positions that appear in this history receive a penalty both in the evaluation function and in the heuristic sort, preventing the AI from oscillating between two squares when minimax scores them equally. The history is cleared on each game reset.

## Built With

| Tool | Purpose |
|---|---|
| [Lens Studio 5.13](https://ar.snap.com/lens-studio) | AR development environment |
| TypeScript | All scripting and game logic |
| SpectaclesInteractionKit (SIK) v0.16.4 | Hand tracking and interactables |
| LSTween | Tween animation library |
| [Blender](https://www.blender.org/) | 3D modelling — pawns, walls, crown, trombones |
| [Substance Painter](https://www.adobe.com/products/substance3d-painter.html) | PBR texture painting |
| Bebas Neue | UI font |

---

## Opening the Project

1. Install [Lens Studio 5.13](https://ar.snap.com/lens-studio)
2. Clone or download this repository
3. In Lens Studio go to **File → Open Project**
4. Navigate to `LensStudio/Quoridor/` and open `Quoridor.esproj`

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Credits

Designed and developed by **Manuel Nikolov**

Original board game *Quoridor* designed by Mirko Marchesi, published by Gigamic (1997).
