@component
export class TurnIndicator extends BaseScriptComponent {

  @input playerPawnGlow: SceneObject;
  @input glowMaterial: Material;

  @input pulseMin: number = 0.3;
  @input pulseMax: number = 1.0;
  @input pulseSpeed: number = 0.35;

  private isActive: boolean = false;
  private isPaused: boolean = false;
  private pulseTime: number = 0;

  onAwake() {
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
    print("TurnIndicator: Ready");
  }

  showPlayerTurn() {
    if (this.isActive) return;
    this.isActive = true;
    this.isPaused = false;
    this.pulseTime = 0;
    this.playerPawnGlow.enabled = true;
    print("TurnIndicator: Player turn — glow on");
  }

  hidePlayerTurn() {
    if (!this.isActive) return;
    this.isActive = false;
    this.isPaused = false;
    this.playerPawnGlow.enabled = false;
    (this.glowMaterial.mainPass as any).rimIntensity = 1.0;
    print("TurnIndicator: Player turn — glow off");
  }

  pause() {
    this.isPaused = true;
    this.playerPawnGlow.enabled = false;
  }

  resume() {
    if (!this.isActive) return;
    this.isPaused = false;
    this.playerPawnGlow.enabled = true;
  }

  private onUpdate() {
    if (!this.isActive || this.isPaused) return;

    const dt = getDeltaTime();
    this.pulseTime += dt;

    const t = (Math.sin(
      this.pulseTime * this.pulseSpeed * Math.PI * 2
    ) + 1) / 2;

    const intensity = this.pulseMin + t * (this.pulseMax - this.pulseMin);
    (this.glowMaterial.mainPass as any).rimIntensity = intensity;
  }
}