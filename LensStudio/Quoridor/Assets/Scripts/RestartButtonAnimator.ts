import { LSTween } from "LSTween.lspkg/LSTween";
import { Easing } from "LSTween.lspkg/TweenJS/Easing";

@component
export class RestartButtonAnimator extends BaseScriptComponent {

  @input restartButton: SceneObject;
  @input handHint: SceneObject;

  @input popInDurationMs: number = 500;
  @input popOutDurationMs: number = 300;
  @input spinDegrees: number = 180;
  @input handHintDelayMs: number = 800;

  private finalScale: vec3 = new vec3(1, 1, 1);
  private baseRotation: quat = quat.quatIdentity();
  private isShowing: boolean = false;

  onAwake() {
    this.finalScale = this.restartButton.getTransform().getLocalScale();
    this.baseRotation = this.restartButton.getTransform().getLocalRotation();
    if (this.handHint) this.handHint.enabled = false;
    print("RestartButtonAnimator: Ready");
  }

  show() {
    this.isShowing = true;

    const t = this.restartButton.getTransform();
    t.setLocalScale(new vec3(0, 0, 0));

    const startRot = quat.fromEulerAngles(
      0, this.spinDegrees * (Math.PI / 180), 0
    ).multiply(this.baseRotation);
    t.setLocalRotation(startRot);

    this.restartButton.enabled = true;

    LSTween.scaleFromToLocal(
      t,
      new vec3(0, 0, 0),
      this.finalScale,
      this.popInDurationMs
    ).easing(Easing.Back.Out).start();

    LSTween.rotateFromToLocal(
      t,
      startRot,
      this.baseRotation,
      this.popInDurationMs
    ).easing(Easing.Back.Out).start();

    // Only show hand hint if button is still visible when delay completes
    if (this.handHint) {
      const delay = this.createEvent("DelayedCallbackEvent");
      delay.bind(() => {
        if (this.isShowing && this.handHint) {
          this.handHint.enabled = true;
          print("RestartButtonAnimator: Hand hint shown");
        }
      });
      delay.reset((this.popInDurationMs + this.handHintDelayMs) / 1000);
    }

    print("RestartButtonAnimator: Showing");
  }

  hideHandHint() {
    this.isShowing = false;
    if (this.handHint) {
      this.handHint.enabled = false;
      print("RestartButtonAnimator: Hand hint hidden immediately");
    }
  }

  hide(onComplete: () => void) {
    this.isShowing = false;

    if (this.handHint) {
      this.handHint.enabled = false;
      print("RestartButtonAnimator: Hand hint hidden");
    }

    const t = this.restartButton.getTransform();

    const endRot = quat.fromEulerAngles(
      0, -this.spinDegrees * (Math.PI / 180), 0
    ).multiply(this.baseRotation);

    LSTween.scaleFromToLocal(
      t,
      this.finalScale,
      new vec3(0, 0, 0),
      this.popOutDurationMs
    ).easing(Easing.Back.In).onComplete(() => {
      this.restartButton.enabled = false;
      t.setLocalScale(this.finalScale);
      t.setLocalRotation(this.baseRotation);
      onComplete();
      print("RestartButtonAnimator: Hidden");
    }).start();

    LSTween.rotateFromToLocal(
      t,
      this.baseRotation,
      endRot,
      this.popOutDurationMs
    ).easing(Easing.Back.In).start();
  }
}