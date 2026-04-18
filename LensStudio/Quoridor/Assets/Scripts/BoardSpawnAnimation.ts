import { LSTween } from "LSTween.lspkg/LSTween";
import { Easing } from "LSTween.lspkg/TweenJS/Easing";
import { AudioManager } from "./AudioManager";

@component
export class BoardSpawnAnimation extends BaseScriptComponent {

  @input boardObject: SceneObject;
  @input audioManager: AudioManager;

  private hasPlayed: boolean = false;
  private boardFinalScale: vec3 = new vec3(1, 1, 1);

  onBoardReady: (() => void) | null = null;

  onAwake() {
    this.boardFinalScale = this.boardObject.getTransform().getLocalScale();
    this.boardObject.getTransform().setLocalScale(new vec3(0, 0, 0));
    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
    print("BoardSpawnAnimation: Ready");
  }

      private onUpdate() {
      if (this.hasPlayed) return;
    
      if (this.boardObject.enabled) {
        this.hasPlayed = true;
        if (this.audioManager) this.audioManager.playBoardSpawn();
        this.animateFromZero(
          this.boardObject.getTransform(),
          this.boardFinalScale,
          () => {
            print("BoardSpawnAnimation: Board spawn complete");
            if (this.onBoardReady) this.onBoardReady();
          }
        );
      }
    }

  animateObject(obj: SceneObject) {
    const transform = obj.getTransform();
    const finalScale = transform.getLocalScale();
    transform.setLocalScale(new vec3(0, 0, 0));
    this.animateFromZero(transform, finalScale, null);
  }

  private animateFromZero(
    transform: Transform,
    finalScale: vec3,
    onComplete: (() => void) | null
  ) {
    const tween = LSTween.scaleFromToLocal(
      transform,
      new vec3(0, 0, 0),
      finalScale,
      500
    ).easing(Easing.Back.Out);

    if (onComplete) tween.onComplete(onComplete);
    tween.start();
  }
}