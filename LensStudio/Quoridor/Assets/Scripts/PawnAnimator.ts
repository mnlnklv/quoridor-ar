import { LSTween } from "LSTween.lspkg/LSTween";
import { Easing } from "LSTween.lspkg/TweenJS/Easing";
import { AudioManager } from "./AudioManager";

@component
export class PawnAnimator extends BaseScriptComponent {

  @input aiPawn: SceneObject;
  @input jumpHeight: number = 5;
  @input audioManager: AudioManager;

  private baseScale: vec3 = new vec3(1, 1, 1);
  private isIdling: boolean = false;
  private idleTime: number = 0;
  private breatheSpeed: number = 0.33;
  private breatheAmount: number = 0.03;

  onAwake() {
    this.baseScale = this.aiPawn.getTransform().getLocalScale();
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
    print("PawnAnimator: Ready");
  }

  // ─── Idle ─────────────────────────────────────────────────────────────────────

  startIdle() {
    if (this.isIdling) return;
    this.isIdling = true;
    this.idleTime = 0;
    print("PawnAnimator: Idle started");
  }

  stopIdle() {
    if (!this.isIdling) return;
    this.isIdling = false;
    this.aiPawn.getTransform().setLocalScale(this.baseScale);
    print("PawnAnimator: Idle stopped");
  }

  private onUpdate() {
    if (!this.isIdling) return;
    const dt = getDeltaTime();
    this.idleTime += dt;
    const bs = this.baseScale;
    const breathe = Math.sin(
      this.idleTime * this.breatheSpeed * Math.PI * 2
    );
    const s = 1.0 + breathe * this.breatheAmount;
    this.aiPawn.getTransform().setLocalScale(
      new vec3(bs.x * s, bs.y * s, bs.z * s)
    );
  }

  // ─── Jump Animation ───────────────────────────────────────────────────────────

  animateAIMove(fromPos: vec3, toPos: vec3, onComplete: () => void) {
    this.stopIdle();

    const transform = this.aiPawn.getTransform();
    const bs = this.baseScale;

    transform.setWorldPosition(fromPos);
    transform.setLocalScale(bs);
    transform.setLocalRotation(quat.quatIdentity());

    const anticipationTime = 120;
    const riseTime = 200;
    const fallTime = 180;
    const landTime = 100;
    const settleTime = 120;

    // Anticipation squash
    LSTween.scaleFromToLocal(
      transform,
      bs,
      new vec3(bs.x * 1.08, bs.y * 0.88, bs.z * 1.08),
      anticipationTime
    ).easing(Easing.Quadratic.Out).onComplete(() => {

      const midPos = new vec3(
        (fromPos.x + toPos.x) / 2,
        fromPos.y + this.jumpHeight,
        (fromPos.z + toPos.z) / 2
      );

      // Play jump sound at launch
      if (this.audioManager) this.audioManager.playJump();

      // Rise
      LSTween.moveFromToWorld(
        transform, fromPos, midPos, riseTime
      ).easing(Easing.Quadratic.Out).start();

      LSTween.scaleFromToLocal(
        transform,
        new vec3(bs.x * 1.08, bs.y * 0.88, bs.z * 1.08),
        new vec3(bs.x * 0.92, bs.y * 1.15, bs.z * 0.92),
        riseTime
      ).easing(Easing.Quadratic.Out).onComplete(() => {

        // Fall
        LSTween.moveFromToWorld(
          transform, midPos, toPos, fallTime
        ).easing(Easing.Quadratic.In).start();

        LSTween.scaleFromToLocal(
          transform,
          new vec3(bs.x * 0.92, bs.y * 1.15, bs.z * 0.92),
          bs,
          fallTime
        ).easing(Easing.Quadratic.In).onComplete(() => {

          // Land squash
          LSTween.scaleFromToLocal(
            transform,
            bs,
            new vec3(bs.x * 1.12, bs.y * 0.82, bs.z * 1.12),
            landTime
          ).easing(Easing.Quadratic.Out).onComplete(() => {

            // Settle
            LSTween.scaleFromToLocal(
              transform,
              new vec3(bs.x * 1.12, bs.y * 0.82, bs.z * 1.12),
              bs,
              settleTime
            ).easing(Easing.Back.Out).onComplete(() => {
              transform.setLocalScale(bs);
              transform.setLocalRotation(quat.quatIdentity());
              onComplete();
            }).start();

          }).start();

        }).start();

      }).start();

    }).start();
  }
}