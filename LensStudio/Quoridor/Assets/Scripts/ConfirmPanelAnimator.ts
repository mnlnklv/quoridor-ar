import { LSTween } from "LSTween.lspkg/LSTween";
import { Easing } from "LSTween.lspkg/TweenJS/Easing";

@component
export class ConfirmPanelAnimator extends BaseScriptComponent {

  @input confirmPanel: SceneObject;
  @input confirmButton: SceneObject;
  @input rotateButton: SceneObject;
  @input cancelButton: SceneObject;

  @input popInDurationMs: number = 400;
  @input popOutDurationMs: number = 300;
  @input staggerDelayMs: number = 80;

  private confirmFinalScale: vec3 = new vec3(1, 1, 1);
  private rotateFinalScale: vec3 = new vec3(1, 1, 1);
  private cancelFinalScale: vec3 = new vec3(1, 1, 1);
  private isVisible: boolean = false;

  onAwake() {
    this.confirmFinalScale = this.confirmButton.getTransform().getLocalScale();
    this.rotateFinalScale = this.rotateButton.getTransform().getLocalScale();
    this.cancelFinalScale = this.cancelButton.getTransform().getLocalScale();
    print("ConfirmPanelAnimator: Ready");
  }

  show() {
    // Already visible — do nothing
    if (this.isVisible) return;
    this.isVisible = true;

    if (this.confirmPanel) this.confirmPanel.enabled = true;

    this.popIn(this.confirmButton, this.confirmFinalScale, 0);
    this.popIn(this.rotateButton, this.rotateFinalScale, this.staggerDelayMs);
    this.popIn(this.cancelButton, this.cancelFinalScale, this.staggerDelayMs * 2);
  }

  hide() {
    // Already hidden — do nothing
    if (!this.isVisible) return;
    this.isVisible = false;

    this.popOut(this.cancelButton, this.cancelFinalScale, 0);
    this.popOut(this.rotateButton, this.rotateFinalScale, 0);
    this.popOut(this.confirmButton, this.confirmFinalScale, 0);

    const totalDuration = this.popOutDurationMs / 1000;
    const delay = this.createEvent("DelayedCallbackEvent");
    delay.bind(() => {
      if (this.confirmPanel) this.confirmPanel.enabled = false;
    });
    delay.reset(totalDuration);
  }

  private popIn(obj: SceneObject, finalScale: vec3, delayMs: number) {
    const t = obj.getTransform();
    t.setLocalScale(new vec3(0, 0, 0));
    obj.enabled = true;

    const doPopIn = () => {
      LSTween.scaleFromToLocal(
        t,
        new vec3(0, 0, 0),
        finalScale,
        this.popInDurationMs
      ).easing(Easing.Back.Out).start();
    };

    if (delayMs > 0) {
      const delay = this.createEvent("DelayedCallbackEvent");
      delay.bind(doPopIn);
      delay.reset(delayMs / 1000);
    } else {
      doPopIn();
    }
  }

  private popOut(obj: SceneObject, finalScale: vec3, delayMs: number) {
    const t = obj.getTransform();

    const doPopOut = () => {
      LSTween.scaleFromToLocal(
        t,
        finalScale,
        new vec3(0, 0, 0),
        this.popOutDurationMs
      ).easing(Easing.Back.In).onComplete(() => {
        obj.enabled = false;
        t.setLocalScale(finalScale);
      }).start();
    };

    if (delayMs > 0) {
      const delay = this.createEvent("DelayedCallbackEvent");
      delay.bind(doPopOut);
      delay.reset(delayMs / 1000);
    } else {
      doPopOut();
    }
  }
}