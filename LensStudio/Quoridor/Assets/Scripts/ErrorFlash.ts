import { TurnIndicator } from "./TurnIndicator";

@component
export class ErrorFlash extends BaseScriptComponent {

  @input playerPawnGlow: SceneObject;
  @input wallGhost: SceneObject;
  @input wallGhostMaterial: Material;
  @input errorMaterial: Material;
  @input turnIndicator: TurnIndicator;

  @input flashDuration: number = 0.3;

  private wallOriginalColor: vec4 = new vec4(1, 1, 1, 1);
  private pawnGlowMesh: RenderMeshVisual | null = null;
  private originalPawnMaterial: Material | null = null;

  onAwake() {
    // Save original pawn glow material
    this.pawnGlowMesh = this.playerPawnGlow.getComponent(
      "RenderMeshVisual"
    ) as RenderMeshVisual;
    if (this.pawnGlowMesh) {
      this.originalPawnMaterial = this.pawnGlowMesh.getMaterial(0);
    }

    this.wallOriginalColor =
      (this.wallGhostMaterial.mainPass as any).rimColor2;
    print("ErrorFlash: Ready");
  }

  flashPawn() {
    if (!this.pawnGlowMesh) return;

    // Pause turn indicator pulse
    if (this.turnIndicator) this.turnIndicator.pause();

    // Swap to red error material and enable
    this.pawnGlowMesh.clearMaterials();
    this.pawnGlowMesh.addMaterial(this.errorMaterial);
    this.playerPawnGlow.enabled = true;

    const delay = this.createEvent("DelayedCallbackEvent");
    delay.bind(() => {
      // Swap back to original material and disable
      this.pawnGlowMesh.clearMaterials();
      this.pawnGlowMesh.addMaterial(this.originalPawnMaterial);
      this.playerPawnGlow.enabled = false;
      if (this.turnIndicator) this.turnIndicator.resume();
    });
    delay.reset(this.flashDuration);
  }

  flashWall() {
    (this.wallGhostMaterial.mainPass as any).rimColor2 = new vec4(1, 0, 0, 1);
    this.wallGhost.enabled = true;

    const delay = this.createEvent("DelayedCallbackEvent");
    delay.bind(() => {
      (this.wallGhostMaterial.mainPass as any).rimColor2 =
        this.wallOriginalColor;
      this.wallGhost.enabled = false;
    });
    delay.reset(this.flashDuration);
  }
}