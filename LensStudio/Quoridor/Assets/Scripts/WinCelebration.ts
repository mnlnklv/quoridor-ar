import { LSTween } from "LSTween.lspkg/LSTween";
import { Easing } from "LSTween.lspkg/TweenJS/Easing";
import { AudioManager } from "./AudioManager";

@component
export class WinCelebration extends BaseScriptComponent {

  @input playerPawn: SceneObject;
  @input crown: SceneObject;
  @input crownEmpty: SceneObject;
  @input confetti: SceneObject;
  @input audioManager: AudioManager;

  @input hopHeight: number = 2;
  @input hopDurationMs: number = 300;
  @input squashAmount: number = 0.06;
  @input stretchAmount: number = 0.08;
  @input landSquashAmount: number = 0.08;

  private baseScale: vec3 = new vec3(1, 1, 1);
  private crownOriginalScale: vec3 = new vec3(1, 1, 1);
  private crownOriginalParent: SceneObject | null = null;
  private vfxComponent: VFXComponent | null = null;

  onAwake() {
    this.baseScale = this.playerPawn.getTransform().getLocalScale();
    this.crownOriginalScale = this.crown.getTransform().getLocalScale();
    this.crownOriginalParent = this.crown.getParent();

    this.vfxComponent = this.confetti.getComponent(
      "VFXComponent"
    ) as VFXComponent;

    print("WinCelebration: Ready — crownOriginalScale=" +
      this.crownOriginalScale.x + "," +
      this.crownOriginalScale.y + "," +
      this.crownOriginalScale.z
    );
  }

  // ─── Win Trigger ─────────────────────────────────────────────────────────────

  triggerPlayerWin() {
    print("WinCelebration: Player wins — starting celebration");
    if (this.audioManager) this.audioManager.playFanfare();
    this.playCelebration();
  }

  private playCelebration() {
    const transform = this.playerPawn.getTransform();
    const bs = this.baseScale;
    const pawnPos = transform.getWorldPosition();

    this.popCrown();
    this.launchConfetti();
    this.playVictoryDance(transform, bs, pawnPos);
  }

  // ─── Crown ───────────────────────────────────────────────────────────────────

  private popCrown() {
    const emptyPos = this.crownEmpty.getTransform().getWorldPosition();
    const emptyRot = this.crownEmpty.getTransform().getWorldRotation();
    const ct = this.crown.getTransform();

    ct.setWorldPosition(emptyPos);
    ct.setWorldRotation(emptyRot);
    ct.setLocalScale(new vec3(0, 0, 0));
    this.crown.enabled = true;

    if (this.audioManager) this.audioManager.playCrown();

    LSTween.scaleFromToLocal(
      ct,
      new vec3(0, 0, 0),
      this.crownOriginalScale,
      500
    ).easing(Easing.Back.Out).onComplete(() => {
      const savedWorldPos = ct.getWorldPosition();
      const savedWorldRot = ct.getWorldRotation();
      const savedWorldScale = ct.getWorldScale();
      this.crown.setParent(this.playerPawn);
      ct.setWorldPosition(savedWorldPos);
      ct.setWorldRotation(savedWorldRot);
      ct.setWorldScale(savedWorldScale);
      print("WinCelebration: Crown parented to pawn");
    }).start();

    print("WinCelebration: Crown popped in");
  }

  // ─── Confetti ─────────────────────────────────────────────────────────────────

  private launchConfetti() {
    if (this.audioManager) this.audioManager.playConfettiPop();
    if (this.vfxComponent) this.vfxComponent.restart();
    print("WinCelebration: Confetti launched");
  }

  // ─── Victory Dance ────────────────────────────────────────────────────────────

  private playVictoryDance(transform: Transform, bs: vec3, pos: vec3) {
    const originalRotation = transform.getLocalRotation();

    this.doHop(transform, bs, pos, 0, () => {
      this.doHop(transform, bs, pos, 200, () => {
        this.doHop(transform, bs, pos, 200, () => {
          LSTween.scaleFromToLocal(
            transform,
            bs,
            new vec3(bs.x * 1.03, bs.y * 1.03, bs.z * 1.03),
            300
          ).easing(Easing.Back.Out).onComplete(() => {
            LSTween.scaleFromToLocal(
              transform,
              new vec3(bs.x * 1.03, bs.y * 1.03, bs.z * 1.03),
              bs,
              200
            ).easing(Easing.Quadratic.Out).onComplete(() => {
              transform.setLocalScale(bs);
              transform.setLocalRotation(originalRotation);
              print("WinCelebration: Dance complete");
            }).start();
          }).start();
        });
      });
    });
  }

  private doHop(
    transform: Transform,
    bs: vec3,
    pos: vec3,
    delayMs: number,
    onComplete: () => void
  ) {
    const hd = this.hopDurationMs;
    const midPos = new vec3(pos.x, pos.y + this.hopHeight, pos.z);
    const sq = this.squashAmount;
    const st = this.stretchAmount;
    const ls = this.landSquashAmount;

    const doHopNow = () => {
      LSTween.scaleFromToLocal(
        transform,
        bs,
        new vec3(bs.x * (1 + sq), bs.y * (1 - sq), bs.z * (1 + sq)),
        120
      ).easing(Easing.Quadratic.Out).onComplete(() => {

        LSTween.moveFromToWorld(
          transform, pos, midPos, hd
        ).easing(Easing.Quadratic.Out).start();

        LSTween.scaleFromToLocal(
          transform,
          new vec3(bs.x * (1 + sq), bs.y * (1 - sq), bs.z * (1 + sq)),
          new vec3(bs.x * (1 - st * 0.5), bs.y * (1 + st), bs.z * (1 - st * 0.5)),
          hd
        ).easing(Easing.Quadratic.Out).onComplete(() => {

          LSTween.moveFromToWorld(
            transform, midPos, pos, hd
          ).easing(Easing.Quadratic.In).start();

          LSTween.scaleFromToLocal(
            transform,
            new vec3(bs.x * (1 - st * 0.5), bs.y * (1 + st), bs.z * (1 - st * 0.5)),
            bs,
            hd
          ).easing(Easing.Quadratic.In).onComplete(() => {

            LSTween.scaleFromToLocal(
              transform,
              bs,
              new vec3(bs.x * (1 + ls), bs.y * (1 - ls), bs.z * (1 + ls)),
              100
            ).easing(Easing.Quadratic.Out).onComplete(() => {

              LSTween.scaleFromToLocal(
                transform,
                new vec3(bs.x * (1 + ls), bs.y * (1 - ls), bs.z * (1 + ls)),
                bs,
                150
              ).easing(Easing.Back.Out).onComplete(() => {
                onComplete();
              }).start();

            }).start();

          }).start();

        }).start();

      }).start();
    };

    if (delayMs > 0) {
      const delayEvent = this.createEvent("DelayedCallbackEvent");
      delayEvent.bind(doHopNow);
      delayEvent.reset(delayMs / 1000);
    } else {
      doHopNow();
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────────

    reset() {
      this.crown.enabled = false;
      if (this.crownOriginalParent) {
        this.crown.setParent(this.crownOriginalParent);
      }
      this.crown.getTransform().setLocalScale(new vec3(0, 0, 0));
    
      print("WinCelebration: Reset");
    }
}