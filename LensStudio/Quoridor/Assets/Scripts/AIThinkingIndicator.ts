@component
export class AIThinkingIndicator extends BaseScriptComponent {

  @input thinkingIndicatorParent: SceneObject;
  @input dotsRoot: SceneObject;
  @input aiPawn: SceneObject;

  @input popDurationMs: number = 400;
  @input pulseMin: number = 0.5;
  @input pulseMax: number = 1.4;
  @input pulseSpeed: number = 0.8;

  private isFloating: boolean = false;
  private isPopingIn: boolean = false;
  private isPopingOut: boolean = false;
  private floatTime: number = 0;
  private popTime: number = 0;
  private baseY: number = 0;
  private pulseTime: number = 0;

  private finalScale: vec3 = new vec3(1, 1, 1);
  private onHideComplete: (() => void) | null = null;

  private dots: SceneObject[] = [];
  private dotBaseScales: vec3[] = [];
  private dotsRootBaseRotation: quat = quat.quatIdentity();

  onAwake() {
    this.finalScale = this.thinkingIndicatorParent.getTransform().getLocalScale();
    this.baseY = this.thinkingIndicatorParent.getTransform().getWorldPosition().y;

    const count = this.dotsRoot.getChildrenCount();
    for (let i = 0; i < count; i++) {
      const dot = this.dotsRoot.getChild(i);
      this.dots.push(dot);
      this.dotBaseScales.push(dot.getTransform().getLocalScale());
    }

    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
    print("AIThinkingIndicator: Ready — " + this.dots.length + " dots found");
  }

  showThinking() {
    if (this.isFloating || this.isPopingIn) return;

    const pawnPos = this.aiPawn.getTransform().getWorldPosition();
    const t = this.thinkingIndicatorParent.getTransform();
    t.setWorldPosition(new vec3(pawnPos.x, pawnPos.y, pawnPos.z));
    this.baseY = pawnPos.y;
    t.setLocalScale(new vec3(0, 0, 0));

    this.dotsRootBaseRotation = this.dotsRoot.getTransform().getLocalRotation();

    this.thinkingIndicatorParent.enabled = true;
    this.floatTime = 0;
    this.popTime = 0;
    this.pulseTime = 0;
    this.isPopingIn = true;
    this.isFloating = false;
    this.isPopingOut = false;

    print("AIThinkingIndicator: Showing");
  }

  hideThinking(onComplete: () => void) {
    if (!this.thinkingIndicatorParent.enabled) {
      onComplete();
      return;
    }

    this.isFloating = false;
    this.isPopingIn = false;
    this.isPopingOut = true;
    this.popTime = 0;
    this.onHideComplete = onComplete;

    const t = this.thinkingIndicatorParent.getTransform();
    const pos = t.getWorldPosition();
    t.setWorldPosition(new vec3(pos.x, this.baseY, pos.z));

    print("AIThinkingIndicator: Hiding");
  }

  reset() {
    this.isFloating = false;
    this.isPopingIn = false;
    this.isPopingOut = false;
    this.thinkingIndicatorParent.enabled = false;
    this.onHideComplete = null;
    print("AIThinkingIndicator: Reset");
  }

  private updateDots() {
    const dotCount = this.dots.length;
    if (dotCount === 0) return;

    for (let i = 0; i < dotCount; i++) {
      const phase = (i / dotCount) * Math.PI * 2;
      const wave = Math.sin(this.pulseTime * this.pulseSpeed * Math.PI * 2 - phase);
      const tVal = (wave + 1) / 2;
      const s = this.pulseMin + tVal * (this.pulseMax - this.pulseMin);

      const base = this.dotBaseScales[i];
      this.dots[i].getTransform().setLocalScale(
        new vec3(base.x * s, base.y * s, base.z * s)
      );
    }
  }

  private onUpdate() {
    if (this.thinkingIndicatorParent.enabled) {
      const pawnPos = this.aiPawn.getTransform().getWorldPosition();
      const currentPos = this.thinkingIndicatorParent.getTransform().getWorldPosition();
      this.thinkingIndicatorParent.getTransform().setWorldPosition(
        new vec3(pawnPos.x, currentPos.y, pawnPos.z)
      );
    }

    if (!this.thinkingIndicatorParent.enabled &&
      !this.isPopingIn && !this.isPopingOut) return;

    const dt = getDeltaTime();
    const t = this.thinkingIndicatorParent.getTransform();
    const dur = this.popDurationMs / 1000;

    if (this.isPopingIn) {
      this.popTime += dt;
      const progress = Math.min(this.popTime / dur, 1.0);

      const c1 = 1.70158;
      const c3 = c1 + 1;
      const eased = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
      const s = Math.max(0, eased);

      t.setLocalScale(new vec3(
        this.finalScale.x * s,
        this.finalScale.y * s,
        this.finalScale.z * s
      ));
      t.setWorldPosition(new vec3(
        t.getWorldPosition().x,
        this.baseY,
        t.getWorldPosition().z
      ));

      if (progress >= 1.0) {
        this.isPopingIn = false;
        this.isFloating = true;
        this.floatTime = 0;
        t.setLocalScale(this.finalScale);
        print("AIThinkingIndicator: Pop in complete");
      }
      return;
    }

    if (this.isPopingOut) {
      this.popTime += dt;
      const progress = Math.min(this.popTime / dur, 1.0);
      const s = 1.0 - (progress * progress);

      t.setLocalScale(new vec3(
        this.finalScale.x * s,
        this.finalScale.y * s,
        this.finalScale.z * s
      ));

      if (progress >= 1.0) {
        this.isPopingOut = false;
        t.setLocalScale(this.finalScale);
        this.thinkingIndicatorParent.enabled = false;
        if (this.onHideComplete) {
          this.onHideComplete();
          this.onHideComplete = null;
        }
        print("AIThinkingIndicator: Pop out complete");
      }
      return;
    }

    if (this.isFloating) {
      this.floatTime += dt;
      this.pulseTime += dt;
      this.updateDots();
    }
  }
}