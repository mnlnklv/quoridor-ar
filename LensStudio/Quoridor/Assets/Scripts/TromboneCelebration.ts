import { LSTween } from "LSTween.lspkg/LSTween";
import { Easing } from "LSTween.lspkg/TweenJS/Easing";

@component
export class TromboneCelebration extends BaseScriptComponent {

  @input tromboneLeft: SceneObject;
  @input tromboneRight: SceneObject;
  @input orbitPivot: SceneObject;

  @input orbitSpeed: number = 90;
  @input orbitRadius: number = 5;
  @input bobSpeed: number = 2.0;
  @input bobAmount: number = 1.5;
  @input popDurationMs: number = 500;

  private isOrbitActive: boolean = false;
  private orbitTime: number = 0;
  private leftAngle: number = 0;
  private rightAngle: number = 180;
  private leftFinalScale: vec3 = new vec3(1, 1, 1);
  private rightFinalScale: vec3 = new vec3(1, 1, 1);

  onAwake() {
    this.leftFinalScale = this.tromboneLeft.getTransform().getLocalScale();
    this.rightFinalScale = this.tromboneRight.getTransform().getLocalScale();
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
    print("TromboneCelebration: Ready");
  }

  triggerAIWin() {
    print("TromboneCelebration: AI wins — spawning trombones");
    this.spawnTrombones();
  }

  private spawnTrombones() {
    const pivot = this.orbitPivot.getTransform().getWorldPosition();

    const leftRad = 0 * (Math.PI / 180);
    const rightRad = 180 * (Math.PI / 180);

    const leftStartPos = new vec3(
      pivot.x + this.orbitRadius * Math.cos(leftRad),
      pivot.y,
      pivot.z + this.orbitRadius * Math.sin(leftRad)
    );
    const rightStartPos = new vec3(
      pivot.x + this.orbitRadius * Math.cos(rightRad),
      pivot.y,
      pivot.z + this.orbitRadius * Math.sin(rightRad)
    );

    this.tromboneLeft.getTransform().setWorldPosition(leftStartPos);
    this.tromboneLeft.getTransform().setLocalScale(new vec3(0, 0, 0));
    this.tromboneLeft.enabled = true;

    this.tromboneRight.getTransform().setWorldPosition(rightStartPos);
    this.tromboneRight.getTransform().setLocalScale(new vec3(0, 0, 0));
    this.tromboneRight.enabled = true;

    LSTween.scaleFromToLocal(
      this.tromboneLeft.getTransform(),
      new vec3(0, 0, 0),
      this.leftFinalScale,
      this.popDurationMs
    ).easing(Easing.Back.Out).start();

    LSTween.scaleFromToLocal(
      this.tromboneRight.getTransform(),
      new vec3(0, 0, 0),
      this.rightFinalScale,
      this.popDurationMs
    ).easing(Easing.Back.Out).delay(150).start();

    this.isOrbitActive = true;
    this.orbitTime = 0;
    this.leftAngle = 0;
    this.rightAngle = 180;
    print("TromboneCelebration: Orbit started");
  }

  reset() {
    this.isOrbitActive = false;
    this.tromboneLeft.enabled = false;
    this.tromboneRight.enabled = false;
    this.tromboneLeft.getTransform().setLocalScale(this.leftFinalScale);
    this.tromboneRight.getTransform().setLocalScale(this.rightFinalScale);
    print("TromboneCelebration: Reset");
  }

  private onUpdate() {
    if (!this.isOrbitActive) return;

    const dt = getDeltaTime();
    this.orbitTime += dt;

    const angleDelta = this.orbitSpeed * dt;
    this.leftAngle = (this.leftAngle + angleDelta) % 360;
    this.rightAngle = (this.rightAngle + angleDelta) % 360;

    const pivot = this.orbitPivot.getTransform().getWorldPosition();

    const bob = Math.sin(
      this.orbitTime * this.bobSpeed * Math.PI * 2
    ) * this.bobAmount;

    const uprightCorrection = quat.fromEulerAngles(
      90 * (Math.PI / 180), 0, -20 * (Math.PI / 180)
    );

    const leftRad = this.leftAngle * (Math.PI / 180);
    const leftPos = new vec3(
      pivot.x + this.orbitRadius * Math.cos(leftRad),
      pivot.y + bob,
      pivot.z + this.orbitRadius * Math.sin(leftRad)
    );
    this.tromboneLeft.getTransform().setWorldPosition(leftPos);
    const leftDir = new vec3(
      Math.cos(leftRad), 0, Math.sin(leftRad)
    ).normalize();
    const leftRot = quat.lookAt(leftDir, vec3.up());
    this.tromboneLeft.getTransform().setWorldRotation(
      leftRot.multiply(uprightCorrection)
    );

    const rightRad = this.rightAngle * (Math.PI / 180);
    const rightPos = new vec3(
      pivot.x + this.orbitRadius * Math.cos(rightRad),
      pivot.y + bob,
      pivot.z + this.orbitRadius * Math.sin(rightRad)
    );
    this.tromboneRight.getTransform().setWorldPosition(rightPos);
    const rightDir = new vec3(
      Math.cos(rightRad), 0, Math.sin(rightRad)
    ).normalize();
    const rightRot = quat.lookAt(rightDir, vec3.up());
    this.tromboneRight.getTransform().setWorldRotation(
      rightRot.multiply(uprightCorrection)
    );
  }
}