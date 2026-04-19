import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { BoardState, Vec2Int, WallPlacement } from "./BoardState";
import { WallValidator } from "./WallValidator";
import { AIController } from "./AIController";
import { BoardSpawnAnimation } from "./BoardSpawnAnimation";
import { PawnAnimator } from "./PawnAnimator";
import { WinCelebration } from "./WinCelebration";
import { TromboneCelebration } from "./TromboneCelebration";
import { AudioManager } from "./AudioManager";
import { TurnIndicator } from "./TurnIndicator";
import { ErrorFlash } from "./ErrorFlash";
import { AIThinkingIndicator } from "./AIThinkingIndicator";
import { RestartButtonAnimator } from "./RestartButtonAnimator";
import { ConfirmPanelAnimator } from "./ConfirmPanelAnimator";
import { TearEffect } from "./TearEffect";

@component
export class GameController extends BaseScriptComponent {

  @input playerPawn: SceneObject;
  @input aiPawn: SceneObject;
  @input pawnAnimator: PawnAnimator;
  @input winCelebration: WinCelebration;
  @input tromboneCelebration: TromboneCelebration;
  @input audioManager: AudioManager;
  @input turnIndicator: TurnIndicator;
  @input errorFlash: ErrorFlash;
  @input aiThinkingIndicator: AIThinkingIndicator;
  @input wallGhost: SceneObject;
  @input pawnGhost: SceneObject;
  @input restartButton: SceneObject;
  @input resetButton: SceneObject;
  @input restartButtonAnimator: RestartButtonAnimator;
  @input confirmPanelAnimator: ConfirmPanelAnimator;
  @input tearEffect: TearEffect;

  @input gridParent: SceneObject;
  @input wallSlotParent: SceneObject;

  @input wall0: SceneObject;
  @input wall1: SceneObject;
  @input wall2: SceneObject;
  @input wall3: SceneObject;
  @input wall4: SceneObject;
  @input wall5: SceneObject;
  @input wall6: SceneObject;
  @input wall7: SceneObject;
  @input wall8: SceneObject;
  @input wall9: SceneObject;

  @input aiWall0: SceneObject;
  @input aiWall1: SceneObject;
  @input aiWall2: SceneObject;
  @input aiWall3: SceneObject;
  @input aiWall4: SceneObject;
  @input aiWall5: SceneObject;
  @input aiWall6: SceneObject;
  @input aiWall7: SceneObject;
  @input aiWall8: SceneObject;
  @input aiWall9: SceneObject;

  @input confirmPanel: SceneObject;
  @input confirmButton: SceneObject;
  @input rotateButton: SceneObject;
  @input cancelButton: SceneObject;

  @input boardSpawnAnimation: BoardSpawnAnimation;

  @input snapThreshold: number = 50;
  @input debugTriggerWin: boolean = false;
  @input debugTriggerLoss: boolean = false;
  @input restartButtonDelay: number = 3.5;

  private state: BoardState = new BoardState();
  private isPlayerTurn: boolean = true;
  private isProcessing: boolean = false;
  private gameOver: boolean = false;

  private playerWalls: SceneObject[] = [];
  private aiWalls: SceneObject[] = [];

  private wallOriginalParent: SceneObject | null = null;
  private wallOriginalPositions: vec3[] = [];
  private wallOriginalRotations: quat[] = [];
  private wallOriginalScales: vec3[] = [];
  private wallOriginalLocalPositions: vec3[] = [];
  private wallOriginalLocalRotations: quat[] = [];

  private aiWallOriginalParent: SceneObject | null = null;
  private aiWallOriginalScales: vec3[] = [];
  private aiWallOriginalLocalPositions: vec3[] = [];
  private aiWallOriginalLocalRotations: quat[] = [];

  private aiWallIndex: number = 0;

  private pendingWallIndex: number = -1;
  private pendingSlotRow: number = -1;
  private pendingSlotCol: number = -1;
  private pendingAxis: "H" | "V" = "H";

  private draggingWallIndex: number = -1;
  private ghostAxis: "H" | "V" = "H";

  private isDraggingPawn: boolean = false;

  private playerPawnOriginalPos: vec3 = new vec3(0, 0, 0);
  private aiPawnOriginalPos: vec3 = new vec3(0, 0, 0);

  onAwake() {
    this.playerWalls = [
      this.wall0, this.wall1, this.wall2, this.wall3, this.wall4,
      this.wall5, this.wall6, this.wall7, this.wall8, this.wall9
    ];
    this.aiWalls = [
      this.aiWall0, this.aiWall1, this.aiWall2, this.aiWall3, this.aiWall4,
      this.aiWall5, this.aiWall6, this.aiWall7, this.aiWall8, this.aiWall9
    ];

    if (this.playerWalls[0]) {
      this.wallOriginalParent = this.playerWalls[0].getParent();
    }
    if (this.aiWalls[0]) {
      this.aiWallOriginalParent = this.aiWalls[0].getParent();
    }

    for (let i = 0; i < this.playerWalls.length; i++) {
      if (this.playerWalls[i]) {
        const t = this.playerWalls[i].getTransform();
        this.wallOriginalPositions[i] = t.getWorldPosition();
        this.wallOriginalRotations[i] = t.getWorldRotation();
        this.wallOriginalScales[i] = t.getWorldScale();
        this.wallOriginalLocalPositions[i] = t.getLocalPosition();
        this.wallOriginalLocalRotations[i] = t.getLocalRotation();
      }
    }

    for (let i = 0; i < this.aiWalls.length; i++) {
      if (this.aiWalls[i]) {
        const t = this.aiWalls[i].getTransform();
        this.aiWallOriginalScales[i] = t.getWorldScale();
        this.aiWallOriginalLocalPositions[i] = t.getLocalPosition();
        this.aiWallOriginalLocalRotations[i] = t.getLocalRotation();
      }
    }

    if (this.confirmPanel) this.confirmPanel.enabled = false;
    if (this.confirmButton) this.confirmButton.enabled = false;
    if (this.rotateButton) this.rotateButton.enabled = false;
    if (this.cancelButton) this.cancelButton.enabled = false;
    if (this.wallGhost) this.wallGhost.enabled = false;
    if (this.pawnGhost) this.pawnGhost.enabled = false;
    if (this.restartButton) this.restartButton.enabled = false;

    this.createEvent("UpdateEvent").bind(() => this.onUpdate());

    this.createEvent("OnStartEvent").bind(() => {
      this.bindInteractables();

      if (this.boardSpawnAnimation) {
        this.boardSpawnAnimation.onBoardReady = () => {
          this.snapPawnToCell(this.playerPawn, this.state.playerPos);
          this.snapPawnToCell(this.aiPawn, this.state.aiPos);

          this.playerPawnOriginalPos = this.playerPawn
            .getTransform().getWorldPosition();
          this.aiPawnOriginalPos = this.aiPawn
            .getTransform().getWorldPosition();

          if (this.pawnAnimator) this.pawnAnimator.startIdle();
          if (this.turnIndicator) this.turnIndicator.showPlayerTurn();

          if (this.debugTriggerWin) {
            print("GameController: DEBUG — triggering player win");
            this.handleWin("PLAYER");
            return;
          }

          if (this.debugTriggerLoss) {
            print("GameController: DEBUG — triggering AI win");
            this.handleWin("AI");
            return;
          }

          print("GameController: Board ready — game started");
        };
      }
    });

    print("GameController: Ready");
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  private onUpdate() {
    this.updateWallGhost();
    this.updatePawnGhost();
  }

  // ─── Wall Ghost ───────────────────────────────────────────────────────────────

  private updateWallGhost() {
    if (this.draggingWallIndex < 0 || !this.wallGhost) return;

    const wallPos = this.playerWalls[this.draggingWallIndex]
      .getTransform().getWorldPosition();
    const nearest = this.findNearestWallSlot(wallPos);

    if (!nearest) {
      this.wallGhost.enabled = false;
      return;
    }

    const slotObj = this.findWallSlotObject(nearest.row, nearest.col);
    if (!slotObj) {
      this.wallGhost.enabled = false;
      return;
    }

    const wallH: WallPlacement = { row: nearest.row, col: nearest.col, axis: "H" };
    const wallV: WallPlacement = { row: nearest.row, col: nearest.col, axis: "V" };

    let chosenAxis: "H" | "V" = "H";
    if (WallValidator.isWallLegal(this.state, wallH)) {
      chosenAxis = "H";
    } else if (WallValidator.isWallLegal(this.state, wallV)) {
      chosenAxis = "V";
    } else {
      this.wallGhost.enabled = false;
      return;
    }

    this.ghostAxis = chosenAxis;

    this.wallGhost.enabled = true;
    const ghostScale = this.wallGhost.getTransform().getWorldScale();
    this.wallGhost.setParent(slotObj);
    this.wallGhost.getTransform().setLocalPosition(new vec3(0, 0, 0));

    if (chosenAxis === "H") {
      this.wallGhost.getTransform().setLocalRotation(
        quat.fromEulerAngles(0, 90 * (Math.PI / 180), 0)
      );
    } else {
      this.wallGhost.getTransform().setLocalRotation(quat.quatIdentity());
    }

    this.wallGhost.getTransform().setWorldScale(ghostScale);
  }

  // ─── Pawn Ghost ───────────────────────────────────────────────────────────────

  private updatePawnGhost() {
    if (!this.pawnGhost) return;

    if (!this.isDraggingPawn ||
      !this.isPlayerTurn ||
      this.isProcessing ||
      this.gameOver) {
      this.pawnGhost.enabled = false;
      return;
    }

    const pawnPos = this.playerPawn.getTransform().getWorldPosition();
    const nearest = this.findNearestCell(pawnPos);

    if (!nearest) {
      this.pawnGhost.enabled = false;
      return;
    }

    const validMoves = this.state.getValidMoves(this.state.playerPos);
    const isValid = validMoves.some(
      m => m.row === nearest.row && m.col === nearest.col
    );

    if (!isValid) {
      this.pawnGhost.enabled = false;
      return;
    }

    const cellObj = this.findCellObject(nearest.row, nearest.col);
    if (!cellObj) {
      this.pawnGhost.enabled = false;
      return;
    }

    this.pawnGhost.enabled = true;
    this.pawnGhost.getTransform().setWorldPosition(
      cellObj.getTransform().getWorldPosition()
    );
  }

  // ─── Binding ──────────────────────────────────────────────────────────────────

  private bindInteractables() {
    const pawnInteractable = this.playerPawn.getComponent(
      Interactable.getTypeName()
    ) as Interactable;
    if (pawnInteractable) {
      pawnInteractable.onDragStart.add(() => {
        if (this.pendingWallIndex >= 0) return;
        this.isDraggingPawn = true;
      });
      pawnInteractable.onDragEnd.add(() => {
        this.isDraggingPawn = false;
        if (this.pawnGhost) this.pawnGhost.enabled = false;
        this.onPawnDropped();
      });
      print("GameController: Pawn interactable bound");
    } else {
      print("GameController: No interactable on player pawn");
    }

    for (let i = 0; i < this.playerWalls.length; i++) {
      const wall = this.playerWalls[i];
      if (!wall) continue;
      const interactable = wall.getComponent(
        Interactable.getTypeName()
      ) as Interactable;
      if (interactable) {
        const index = i;
        interactable.onDragStart.add(() => this.onWallDragStart(index));
        interactable.onDragEnd.add(() => this.onWallDropped(index));
      } else {
        print("GameController: No interactable on wall " + i);
      }
    }

    this.bindButton(this.confirmButton, () => {
      if (this.audioManager) this.audioManager.playConfirm();
      this.onConfirm();
    });
    this.bindButton(this.rotateButton, () => {
      if (this.audioManager) this.audioManager.playRotate();
      this.onRotate();
    });
    this.bindButton(this.cancelButton, () => {
      if (this.audioManager) this.audioManager.playCancel();
      this.onCancel();
    });
    this.bindButton(this.restartButton, () => {
      if (this.audioManager) this.audioManager.playButtonClick();
      if (this.restartButtonAnimator) this.restartButtonAnimator.hideHandHint();
      this.resetGame();
    });

    print("GameController: All interactables bound");
  }

  private bindButton(obj: SceneObject, callback: () => void) {
    if (!obj) return;
    const interactable = obj.getComponent(
      Interactable.getTypeName()
    ) as Interactable;
    if (interactable) {
      interactable.onTriggerStart.add(callback);
    }
  }

  private lockWall(wallObj: SceneObject) {
    const interactable = wallObj.getComponent(
      Interactable.getTypeName()
    ) as Interactable;
    if (interactable) interactable.enabled = false;
  }

  private unlockWall(wallObj: SceneObject) {
    const interactable = wallObj.getComponent(
      Interactable.getTypeName()
    ) as Interactable;
    if (interactable) interactable.enabled = true;
  }

  // ─── Win Handling ─────────────────────────────────────────────────────────────

  private handleWin(winner: string) {
    this.gameOver = true;
    this.isProcessing = true;
    this.isPlayerTurn = false;
    this.isDraggingPawn = false;
    if (this.pawnAnimator) this.pawnAnimator.stopIdle();
    if (this.turnIndicator) this.turnIndicator.hidePlayerTurn();
    if (this.wallGhost) this.wallGhost.enabled = false;
    if (this.pawnGhost) this.pawnGhost.enabled = false;
    this.draggingWallIndex = -1;

    if (winner === "PLAYER") {
      print("GameController: Player wins — triggering celebration");
      if (this.winCelebration) this.winCelebration.triggerPlayerWin();
    } else {
      print("GameController: AI wins");
      if (this.audioManager) this.audioManager.playSadTrumpet();
      if (this.tromboneCelebration) this.tromboneCelebration.triggerAIWin();
      if (this.tearEffect) this.tearEffect.startTears();
    }

    const restartDelay = this.createEvent("DelayedCallbackEvent");
    restartDelay.bind(() => {
      if (this.restartButtonAnimator) this.restartButtonAnimator.show();
      print("GameController: Restart button shown");
    });
    restartDelay.reset(this.restartButtonDelay);
  }

  // ─── Reset Game ───────────────────────────────────────────────────────────────

  private resetGame() {
    print("GameController: Resetting game");

    if (this.tearEffect) this.tearEffect.reset();
    if (this.restartButtonAnimator) this.restartButtonAnimator.hide(() => {});

    this.state = new BoardState();
    AIController.resetHistory();
    this.isPlayerTurn = true;
    this.isProcessing = false;
    this.gameOver = false;
    this.aiWallIndex = 0;
    this.pendingWallIndex = -1;
    this.pendingSlotRow = -1;
    this.pendingSlotCol = -1;
    this.draggingWallIndex = -1;
    this.isDraggingPawn = false;

    this.playerPawn.getTransform().setWorldPosition(this.playerPawnOriginalPos);
    this.aiPawn.getTransform().setWorldPosition(this.aiPawnOriginalPos);

    for (let i = 0; i < this.playerWalls.length; i++) {
      const wall = this.playerWalls[i];
      if (!wall) continue;
      if (this.wallOriginalParent) wall.setParent(this.wallOriginalParent);
      wall.getTransform().setLocalPosition(this.wallOriginalLocalPositions[i]);
      wall.getTransform().setLocalRotation(this.wallOriginalLocalRotations[i]);
      wall.getTransform().setWorldScale(this.wallOriginalScales[i]);
      this.unlockWall(wall);
    }

    for (let i = 0; i < this.aiWalls.length; i++) {
      const wall = this.aiWalls[i];
      if (!wall) continue;
      if (this.aiWallOriginalParent) wall.setParent(this.aiWallOriginalParent);
      wall.getTransform().setLocalPosition(this.aiWallOriginalLocalPositions[i]);
      wall.getTransform().setLocalRotation(this.aiWallOriginalLocalRotations[i]);
      wall.getTransform().setWorldScale(this.aiWallOriginalScales[i]);
    }

    if (this.winCelebration) this.winCelebration.reset();
    if (this.tromboneCelebration) this.tromboneCelebration.reset();
    if (this.aiThinkingIndicator) this.aiThinkingIndicator.reset();
    if (this.turnIndicator) this.turnIndicator.hidePlayerTurn();
    if (this.wallGhost) this.wallGhost.enabled = false;
    if (this.pawnGhost) this.pawnGhost.enabled = false;
    if (this.confirmPanelAnimator) this.confirmPanelAnimator.hide();

    this.snapPawnToCell(this.playerPawn, this.state.playerPos);
    this.snapPawnToCell(this.aiPawn, this.state.aiPos);

    if (this.pawnAnimator) this.pawnAnimator.startIdle();
    if (this.turnIndicator) this.turnIndicator.showPlayerTurn();
    if (this.resetButton) this.resetButton.enabled = true;

    print("GameController: Game reset complete");
  }

  // ─── Pawn Logic ───────────────────────────────────────────────────────────────

  private onPawnDropped() {
    if (!this.isPlayerTurn || this.isProcessing || this.gameOver || this.pendingWallIndex >= 0) {
      this.snapPawnToCell(this.playerPawn, this.state.playerPos);
      return;
    }

    const pawnPos = this.playerPawn.getTransform().getWorldPosition();
    const nearest = this.findNearestCell(pawnPos);

    if (!nearest) {
      print("GameController: No cell in range — snapping back");
      this.snapPawnToCell(this.playerPawn, this.state.playerPos);
      return;
    }

    const validMoves = this.state.getValidMoves(this.state.playerPos);
    const isValid = validMoves.some(
      (m) => m.row === nearest.row && m.col === nearest.col
    );

    if (!isValid) {
      print("GameController: Invalid move — snapping back");
      this.snapPawnToCell(this.playerPawn, this.state.playerPos);
      if (this.audioManager) this.audioManager.playError();
      if (this.errorFlash) this.errorFlash.flashPawn();
      return;
    }

    this.state.applyMove(nearest, "PLAYER");
    this.snapPawnToCell(this.playerPawn, this.state.playerPos);
    if (this.audioManager) this.audioManager.playPawnMoved();
    if (this.turnIndicator) this.turnIndicator.hidePlayerTurn();
    if (this.resetButton) this.resetButton.enabled = false;
    print("GameController: Player moved to R" + nearest.row + " C" + nearest.col);

    const winner = this.state.checkWinner();
    if (winner) {
      this.handleWin(winner);
      return;
    }

    this.isPlayerTurn = false;
    this.isProcessing = true;
    this.startAITurn();
  }

  // ─── Wall Logic ───────────────────────────────────────────────────────────────

  private onWallDragStart(index: number) {
    if (!this.isPlayerTurn || this.isProcessing || this.gameOver) return;
    if (this.state.playerWallsLeft <= 0) return;

    if (this.pendingWallIndex >= 0 && this.pendingWallIndex !== index) {
      print("GameController: Different wall already pending — ignoring");
      return;
    }

    this.draggingWallIndex = index;
    this.ghostAxis = "H";
    print("GameController: Wall drag started — index " + index);
  }

  private onWallDropped(index: number) {
    this.draggingWallIndex = -1;
    if (this.wallGhost) this.wallGhost.enabled = false;

    if (!this.isPlayerTurn || this.isProcessing || this.gameOver) {
      this.snapPlayerWallToStack(index);
      return;
    }

    if (this.state.playerWallsLeft <= 0) {
      this.snapPlayerWallToStack(index);
      return;
    }

    if (this.pendingWallIndex >= 0 && this.pendingWallIndex !== index) {
      this.snapPlayerWallToStack(index);
      return;
    }

    const wallPos = this.playerWalls[index].getTransform().getWorldPosition();
    const nearest = this.findNearestWallSlot(wallPos);

    if (!nearest) {
      print("GameController: No wall slot in range — snapping back");
      this.snapPlayerWallToStack(index);
      return;
    }

    const wallH: WallPlacement = {
      row: nearest.row, col: nearest.col, axis: "H"
    };
    const autoAxis: "H" | "V" =
      WallValidator.isWallLegal(this.state, wallH) ? "H" : "V";

    this.pendingWallIndex = index;
    this.pendingSlotRow = nearest.row;
    this.pendingSlotCol = nearest.col;
    this.pendingAxis = autoAxis;
    this.ghostAxis = autoAxis;

    this.snapPlayerWallToSlot(
      this.playerWalls[index],
      nearest.row,
      nearest.col,
      this.pendingAxis,
      index
    );

    if (this.audioManager) this.audioManager.playWallPlaced();
    if (this.confirmPanelAnimator) this.confirmPanelAnimator.show();
    if (this.resetButton) this.resetButton.enabled = false;
    print("GameController: Wall previewed at R" + nearest.row +
      " C" + nearest.col + " axis=" + this.pendingAxis);
  }

  private onConfirm() {
    if (this.pendingWallIndex < 0 || this.gameOver) return;

    const wall: WallPlacement = {
      row: this.pendingSlotRow,
      col: this.pendingSlotCol,
      axis: this.pendingAxis,
    };

    if (!WallValidator.isWallLegal(this.state, wall)) {
      print("GameController: Illegal wall — snapping back");
      this.snapPlayerWallToStack(this.pendingWallIndex);
      if (this.audioManager) this.audioManager.playError();
      if (this.errorFlash) this.errorFlash.flashWall();
      this.clearPending();
      return;
    }

    this.state.applyWall(wall);
    this.state.playerWallsLeft--;
    this.lockWall(this.playerWalls[this.pendingWallIndex]);
    if (this.turnIndicator) this.turnIndicator.hidePlayerTurn();

    print(
      "GameController: Wall confirmed — axis=" + wall.axis +
      " row=" + wall.row + " col=" + wall.col
    );

    this.clearPending();

    const winner = this.state.checkWinner();
    if (winner) {
      this.handleWin(winner);
      return;
    }

    this.isPlayerTurn = false;
    this.isProcessing = true;
    this.startAITurn();
  }

  private onRotate() {
    if (this.pendingWallIndex < 0 || this.gameOver) return;
    this.pendingAxis = this.pendingAxis === "H" ? "V" : "H";
    this.ghostAxis = this.pendingAxis;
    this.snapPlayerWallToSlot(
      this.playerWalls[this.pendingWallIndex],
      this.pendingSlotRow,
      this.pendingSlotCol,
      this.pendingAxis,
      this.pendingWallIndex
    );
    print("GameController: Wall rotated to " + this.pendingAxis);
  }

  private onCancel() {
    if (this.gameOver) return;
    if (this.pendingWallIndex >= 0) {
      this.snapPlayerWallToStack(this.pendingWallIndex);
      print("GameController: Wall cancelled");
    }
    this.clearPending();
  }

  private clearPending() {
    this.pendingWallIndex = -1;
    this.pendingSlotRow = -1;
    this.pendingSlotCol = -1;
    if (this.confirmPanelAnimator) this.confirmPanelAnimator.hide();
  }

  // ─── AI Turn ──────────────────────────────────────────────────────────────────

  private startAITurn() {
    print("GameController: AI thinking...");
    if (this.pawnAnimator) this.pawnAnimator.stopIdle();
    if (this.aiThinkingIndicator) this.aiThinkingIndicator.showThinking();

    const delay = this.createEvent("DelayedCallbackEvent");
    delay.bind(() => {
      const makeDecision = () => {
        const decision = AIController.decideMove(this.state);

        if (decision.type === "MOVE") {
          const fromCell = this.findCellObject(
            this.state.aiPos.row,
            this.state.aiPos.col
          );
          this.state.applyMove(decision.pos, "AI");
          const toCell = this.findCellObject(
            this.state.aiPos.row,
            this.state.aiPos.col
          );

          if (this.pawnAnimator && fromCell && toCell) {
            this.pawnAnimator.animateAIMove(
              fromCell.getTransform().getWorldPosition(),
              toCell.getTransform().getWorldPosition(),
              () => {
                print("GameController: AI move animation complete");
                if (this.audioManager) this.audioManager.playPawnMoved();
                const winner = this.state.checkWinner();
                if (winner) {
                  this.handleWin(winner);
                  return;
                }
                this.isPlayerTurn = true;
                this.isProcessing = false;
                if (this.pawnAnimator) this.pawnAnimator.startIdle();
                if (this.turnIndicator) this.turnIndicator.showPlayerTurn();
                print("GameController: Player turn");
              }
            );
          } else {
            this.snapPawnToCell(this.aiPawn, this.state.aiPos);
            if (this.audioManager) this.audioManager.playPawnMoved();
            const winner = this.state.checkWinner();
            if (winner) {
              this.handleWin(winner);
              return;
            }
            this.isPlayerTurn = true;
            this.isProcessing = false;
            if (this.pawnAnimator) this.pawnAnimator.startIdle();
            if (this.turnIndicator) this.turnIndicator.showPlayerTurn();
            print("GameController: Player turn");
          }
          print(
            "GameController: AI moved to R" +
            decision.pos.row + " C" + decision.pos.col
          );
          return;

        } else if (decision.type === "WALL") {
          this.state.applyWall(decision.wall);
          this.state.aiWallsLeft--;
          this.placeAIWall(decision.wall);
          if (this.audioManager) this.audioManager.playWallPlaced();
          print(
            "GameController: AI placed wall — axis=" + decision.wall.axis +
            " row=" + decision.wall.row + " col=" + decision.wall.col
          );
        }

        const winner = this.state.checkWinner();
        if (winner) {
          this.handleWin(winner);
          return;
        }

        this.isPlayerTurn = true;
        this.isProcessing = false;
        if (this.pawnAnimator) this.pawnAnimator.startIdle();
        if (this.turnIndicator) this.turnIndicator.showPlayerTurn();
        print("GameController: Player turn");
      };

      if (this.aiThinkingIndicator) {
        this.aiThinkingIndicator.hideThinking(() => makeDecision());
      } else {
        makeDecision();
      }
    });
    delay.reset(1.5 + Math.random() * 0.5);
  }

  private placeAIWall(wall: WallPlacement) {
    if (this.aiWallIndex >= this.aiWalls.length) return;
    const wallObj = this.aiWalls[this.aiWallIndex];
    if (!wallObj) return;
    this.snapAIWallToSlot(
      wallObj, wall.row, wall.col, wall.axis, this.aiWallIndex
    );
    if (this.boardSpawnAnimation) {
      this.boardSpawnAnimation.animateObject(wallObj);
    }
    this.aiWallIndex++;
  }

  // ─── Snap Helpers ─────────────────────────────────────────────────────────────

  private snapPawnToCell(pawn: SceneObject, cell: Vec2Int) {
    const cellObj = this.findCellObject(cell.row, cell.col);
    if (cellObj) {
      pawn.getTransform().setWorldPosition(
        cellObj.getTransform().getWorldPosition()
      );
    }
  }

  private snapPlayerWallToStack(index: number) {
    if (index < 0 || index >= this.playerWalls.length) return;
    const wall = this.playerWalls[index];
    if (!wall) return;
    if (this.wallOriginalParent) wall.setParent(this.wallOriginalParent);
    wall.getTransform().setLocalPosition(this.wallOriginalLocalPositions[index]);
    wall.getTransform().setLocalRotation(this.wallOriginalLocalRotations[index]);
    wall.getTransform().setWorldScale(this.wallOriginalScales[index]);
  }

  private snapPlayerWallToSlot(
    wallObj: SceneObject,
    row: number,
    col: number,
    axis: "H" | "V",
    index: number
  ) {
    const slotObj = this.findWallSlotObject(row, col);
    if (!slotObj) {
      print("GameController: Could not find wall slot R" + row + " C" + col);
      return;
    }
    const worldScale = this.wallOriginalScales[index];
    wallObj.setParent(slotObj);
    wallObj.getTransform().setLocalPosition(new vec3(0, 0, 0));
    if (axis === "H") {
      wallObj.getTransform().setLocalRotation(
        quat.fromEulerAngles(0, 90 * (Math.PI / 180), 0)
      );
    } else {
      wallObj.getTransform().setLocalRotation(quat.quatIdentity());
    }
    wallObj.getTransform().setWorldScale(worldScale);
  }

  private snapAIWallToSlot(
    wallObj: SceneObject,
    row: number,
    col: number,
    axis: "H" | "V",
    index: number
  ) {
    const slotObj = this.findWallSlotObject(row, col);
    if (!slotObj) {
      print("GameController: Could not find AI wall slot R" + row + " C" + col);
      return;
    }
    const worldScale = this.aiWallOriginalScales[index];
    wallObj.setParent(slotObj);
    wallObj.getTransform().setLocalPosition(new vec3(0, 0, 0));
    if (axis === "H") {
      wallObj.getTransform().setLocalRotation(
        quat.fromEulerAngles(0, 90 * (Math.PI / 180), 0)
      );
    } else {
      wallObj.getTransform().setLocalRotation(quat.quatIdentity());
    }
    wallObj.getTransform().setWorldScale(worldScale);
  }

  // ─── Object Finders ───────────────────────────────────────────────────────────

  private findCellObject(row: number, col: number): SceneObject | null {
    const name = "Cell_R" + row + "_C" + col;
    const count = this.gridParent.getChildrenCount();
    for (let i = 0; i < count; i++) {
      const child = this.gridParent.getChild(i);
      if (child.name.startsWith(name)) return child;
    }
    print("GameController: Could not find cell " + name);
    return null;
  }

  private findWallSlotObject(row: number, col: number): SceneObject | null {
    const name = "WallSlot_R" + row + "_C" + col;
    const count = this.wallSlotParent.getChildrenCount();
    for (let i = 0; i < count; i++) {
      const child = this.wallSlotParent.getChild(i);
      if (child.name.startsWith(name)) return child;
    }
    print("GameController: Could not find slot " + name);
    return null;
  }

  private findNearestCell(worldPos: vec3): Vec2Int | null {
    const count = this.gridParent.getChildrenCount();
    let nearest: Vec2Int | null = null;
    let nearestDist = this.snapThreshold;

    for (let i = 0; i < count; i++) {
      const child = this.gridParent.getChild(i);
      const dist = this.distXZ(
        worldPos,
        child.getTransform().getWorldPosition()
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = this.parseCellName(child.name);
      }
    }
    return nearest;
  }

  private findNearestWallSlot(
    worldPos: vec3
  ): { row: number; col: number } | null {
    const count = this.wallSlotParent.getChildrenCount();
    let nearest: { row: number; col: number } | null = null;
    let nearestDist = this.snapThreshold;

    for (let i = 0; i < count; i++) {
      const child = this.wallSlotParent.getChild(i);
      const dist = this.distXZ(
        worldPos,
        child.getTransform().getWorldPosition()
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = this.parseSlotName(child.name);
      }
    }
    return nearest;
  }

  // ─── Name Parsers ─────────────────────────────────────────────────────────────

  private parseCellName(name: string): Vec2Int | null {
    const clean = name.split(".")[0];
    const parts = clean.split("_");
    if (parts.length < 3) return null;
    const row = parseInt(parts[1].replace("R", ""));
    const col = parseInt(parts[2].replace("C", ""));
    if (isNaN(row) || isNaN(col)) return null;
    return { row, col };
  }

  private parseSlotName(
    name: string
  ): { row: number; col: number } | null {
    const clean = name.split(".")[0];
    const parts = clean.split("_");
    if (parts.length < 3) return null;
    const row = parseInt(parts[1].replace("R", ""));
    const col = parseInt(parts[2].replace("C", ""));
    if (isNaN(row) || isNaN(col)) return null;
    return { row, col };
  }

  // ─── Math ─────────────────────────────────────────────────────────────────────

  private distXZ(a: vec3, b: vec3): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}