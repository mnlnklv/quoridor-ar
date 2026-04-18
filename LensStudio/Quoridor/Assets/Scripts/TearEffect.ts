@component
export class TearEffect extends BaseScriptComponent {

  @input playerPawn: SceneObject;
  @input tearTemplate: SceneObject;
  @input tearParent: SceneObject;

  @input tearCount: number = 40;
  @input streamDurationSeconds: number = 4.0;
  @input spawnIntervalSeconds: number = 0.1;
  @input shootSpread: number = 8.0;
  @input minUpSpeed: number = 1.0;
  @input maxUpSpeed: number = 2.5;
  @input gravity: number = -20.0;
  @input airResistance: number = 0.97;
  @input despawnY: number = -20.0;
  @input headHeightOffset: number = 3.0;

  // 0=+X, 1=-X, 2=+Z, 3=-Z — try each until tears face forward
  @input facingAxisIndex: number = 0;
  @input spreadAngleDegrees: number = 30.0;

  private tears: SceneObject[] = [];
  private velocities: vec3[] = [];
  private active: boolean[] = [];
  private isStreaming: boolean = false;
  private streamTime: number = 0;
  private spawnTimer: number = 0;
  private spawnSide: number = 0;

  onAwake() {
    for (let i = 0; i < this.tearCount; i++) {
      const tear = global.scene.createSceneObject("Tear_" + i);
      tear.setParent(this.tearParent);

      const templateMesh = this.tearTemplate.getComponent(
        "RenderMeshVisual"
      ) as RenderMeshVisual;
      const mesh = tear.createComponent(
        "RenderMeshVisual"
      ) as RenderMeshVisual;
      if (templateMesh) {
        mesh.mesh = templateMesh.mesh;
        mesh.clearMaterials();
        mesh.addMaterial(templateMesh.getMaterial(0));
      }

      tear.getTransform().setLocalScale(
        this.tearTemplate.getTransform().getLocalScale()
      );
      tear.enabled = false;

      this.tears.push(tear);
      this.velocities.push(new vec3(0, 0, 0));
      this.active.push(false);
    }

    this.createEvent("UpdateEvent").bind(() => this.onUpdate());
    print("TearEffect: Ready — " + this.tearCount + " tears pooled");
  }

  startTears() {
    this.isStreaming = true;
    this.streamTime = 0;
    this.spawnTimer = 0;
    this.spawnSide = 0;
    print("TearEffect: Tears started");
  }

  stopTears() {
    this.isStreaming = false;
  }

  reset() {
    this.isStreaming = false;
    for (let i = 0; i < this.tears.length; i++) {
      this.tears[i].enabled = false;
      this.active[i] = false;
    }
    print("TearEffect: Reset");
  }

  private getPawnForward(): vec3 {
    const rot = this.playerPawn.getTransform().getWorldRotation();
    switch (this.facingAxisIndex) {
      case 0: return rot.multiplyVec3(new vec3(1, 0, 0));
      case 1: return rot.multiplyVec3(new vec3(-1, 0, 0));
      case 2: return rot.multiplyVec3(new vec3(0, 0, 1));
      case 3: return rot.multiplyVec3(new vec3(0, 0, -1));
      default: return rot.multiplyVec3(new vec3(1, 0, 0));
    }
  }

  private spawnTear() {
    for (let i = 0; i < this.tears.length; i++) {
      if (this.active[i]) continue;

      const pawnPos = this.playerPawn.getTransform().getWorldPosition();
      const headPos = new vec3(
        pawnPos.x,
        pawnPos.y + this.headHeightOffset,
        pawnPos.z
      );

      // Get pawn-relative forward and right
      const forward = this.getPawnForward();
      forward.y = 0;
      const forwardNorm = forward.normalize();
      const right = new vec3(forwardNorm.z, 0, -forwardNorm.x);

      // Alternate left and right, spread within angle
      const side = this.spawnSide === 0 ? -1 : 1;
      this.spawnSide = this.spawnSide === 0 ? 1 : 0;

      const spreadRad = this.spreadAngleDegrees * (Math.PI / 180);
      const randomSpread = (Math.random() - 0.5) * spreadRad;
      const spreadAmount = this.shootSpread * (0.8 + Math.random() * 0.4);

      const sideDir = new vec3(
        right.x * side + forwardNorm.x * Math.sin(randomSpread),
        0,
        right.z * side + forwardNorm.z * Math.sin(randomSpread)
      ).normalize();

      const upY = this.minUpSpeed + Math.random() * (this.maxUpSpeed - this.minUpSpeed);

      this.velocities[i] = new vec3(
        sideDir.x * spreadAmount,
        upY,
        sideDir.z * spreadAmount
      );

      this.tears[i].getTransform().setWorldPosition(headPos);
      this.tears[i].getTransform().setWorldRotation(
        quat.fromEulerAngles(-90 * (Math.PI / 180), 0, 0)
      );
      this.tears[i].enabled = true;
      this.active[i] = true;
      return;
    }
  }

  private onUpdate() {
    const dt = getDeltaTime();

    if (this.isStreaming) {
      this.streamTime += dt;
      this.spawnTimer += dt;

      if (this.spawnTimer >= this.spawnIntervalSeconds) {
        this.spawnTimer = 0;
        this.spawnTear();
      }

      if (this.streamTime >= this.streamDurationSeconds) {
        this.isStreaming = false;
        print("TearEffect: Stream complete");
      }
    }

    for (let i = 0; i < this.tears.length; i++) {
      if (!this.active[i]) continue;

      const t = this.tears[i].getTransform();
      const pos = t.getWorldPosition();
      const vel = this.velocities[i];

      this.velocities[i] = new vec3(
        vel.x * this.airResistance,
        vel.y + this.gravity * dt,
        vel.z * this.airResistance
      );

      const newPos = new vec3(
        pos.x + vel.x * dt,
        pos.y + vel.y * dt,
        pos.z + vel.z * dt
      );

      t.setWorldPosition(newPos);

      const pawnPos = this.playerPawn.getTransform().getWorldPosition();
      if (newPos.y < pawnPos.y + this.despawnY) {
        this.tears[i].enabled = false;
        this.active[i] = false;
      }
    }
  }
}