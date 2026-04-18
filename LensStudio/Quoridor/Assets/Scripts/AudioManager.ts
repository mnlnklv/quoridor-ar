@component
export class AudioManager extends BaseScriptComponent {

  @input heavyThud1: AudioComponent;
  @input heavyThud2: AudioComponent;
  @input heavyThud3: AudioComponent;
  @input light1: AudioComponent;
  @input light2: AudioComponent;
  @input light3: AudioComponent;
  @input boardSpawn: AudioComponent;
  @input confettiPop: AudioComponent;
  @input crown: AudioComponent;
  @input jump: AudioComponent;
  @input sadTrumpet: AudioComponent;
  @input fanfare: AudioComponent;
  @input error: AudioComponent;
  @input buttonClick: AudioComponent;
  @input confirmSound: AudioComponent;
  @input rotateSound: AudioComponent;
  @input cancelSound: AudioComponent;

  private heavyThuds: AudioComponent[] = [];
  private lightSounds: AudioComponent[] = [];

  onAwake() {
    this.heavyThuds = [
      this.heavyThud1, this.heavyThud2, this.heavyThud3
    ];
    this.lightSounds = [
      this.light1, this.light2, this.light3
    ];
    print("AudioManager: Ready");
  }

  private playSound(audio: AudioComponent) {
    if (!audio) return;
    if (audio.isPlaying()) audio.stop(false);
    audio.play(1);
  }

  private playRandom(sounds: AudioComponent[]) {
    const index = Math.floor(Math.random() * sounds.length);
    this.playSound(sounds[index]);
  }

  playWallPlaced() { this.playRandom(this.heavyThuds); }
  playPawnMoved() { this.playRandom(this.lightSounds); }
  playBoardSpawn() { this.playSound(this.boardSpawn); }
  playConfettiPop() { this.playSound(this.confettiPop); }
  playCrown() { this.playSound(this.crown); }
  playJump() { this.playSound(this.jump); }
  playSadTrumpet() { this.playSound(this.sadTrumpet); }
  playFanfare() { this.playSound(this.fanfare); }
  playError() { this.playSound(this.error); }
  playButtonClick() { this.playSound(this.buttonClick); }
  playConfirm() { this.playSound(this.confirmSound); }
  playRotate() { this.playSound(this.rotateSound); }
  playCancel() { this.playSound(this.cancelSound); }
}