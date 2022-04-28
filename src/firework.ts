import {
  Color4,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  Scene,
  Sound,
  Texture,
  Vector3,
  VertexBuffer,
} from '@babylonjs/core';

export class Firework {
  private _emitter: Mesh;
  private _height: number;
  private _delay: number;
  private _rocket: ParticleSystem;
  private _scene: Scene;
  private _exploded: boolean = false;
  private _started: boolean = false;
  private _rocketSfx: Sound;
  private _explosionSfx: Sound;

  constructor(scene: Scene, i: number) {
    this._scene = scene;

    const sphere = MeshBuilder.CreateSphere(
      'rocket',
      { segments: 4, diameter: 1 },
      scene
    );
    sphere.isVisible = false;

    const randPos = Math.random() * 10;
    const fireworks = scene
      .getTransformNodeByName('fireworks')
      .getAbsolutePosition();
    sphere.position = new Vector3(
      fireworks.x + randPos * -1,
      fireworks.y,
      fireworks.z
    );

    this._emitter = sphere;
    this._height = sphere.position.y + Math.random() * 21 + 4;
    this._delay = (Math.random() * i + 1) * 60;

    const rocket = new ParticleSystem('rocket', 350, scene);
    rocket.particleTexture = new Texture('./textures/flare.png', scene);
    rocket.emitter = sphere;
    rocket.emitRate = 20;
    rocket.minEmitBox = Vector3.Zero();
    rocket.maxEmitBox = Vector3.Zero();
    rocket.color1 = new Color4(0.49, 0.57, 0.76);
    rocket.color2 = new Color4(0.29, 0.29, 0.66);
    rocket.colorDead = new Color4(0, 0, 0.2, 0.5);
    rocket.minSize = 1;
    rocket.maxSize = 1;
    rocket.addSizeGradient(0, 1);
    rocket.addSizeGradient(1, 0.01);
    this._rocket = rocket;

    this._loadSounds();
  }

  private _explosions(position: Vector3): void {
    const explosion = MeshBuilder.CreateSphere(
      'explosion',
      { segments: 4, diameter: 1 },
      this._scene
    );
    explosion.isVisible = false;
    explosion.position = position;
    const emitter = explosion;
    emitter.useVertexColors = true;
    const vertPos = emitter.getVerticesData(VertexBuffer.PositionKind);
    const vertNorms = emitter.getVerticesData(VertexBuffer.NormalKind);
    const vertColors = [];

    for (let i = 0; i < vertPos.length - 2; i += 3) {
      const vertPosition = new Vector3(
        vertPos[i],
        vertPos[i + 1],
        vertPos[i + 2]
      );
      const vertNormal = new Vector3(
        vertNorms[i],
        vertNorms[i + 1],
        vertNorms[i + 2]
      );
      const r = Math.random();
      const g = Math.random();
      const b = Math.random();
      const alpha = 1;
      const color = new Color4(r, g, b, alpha);
      vertColors.push(r);
      vertColors.push(g);
      vertColors.push(b);
      vertColors.push(alpha);

      const gizmo = MeshBuilder.CreateBox(
        'gizmo',
        { size: 0.001 },
        this._scene
      );
      gizmo.position = vertPosition;
      gizmo.parent = emitter;
      const direction = vertNormal.normalize().scale(1);

      const particleSys = new ParticleSystem('particles', 500, this._scene);
      particleSys.particleTexture = new Texture(
        './textures/flare.png',
        this._scene
      );
      particleSys.emitter = gizmo;
      particleSys.minEmitBox = new Vector3(1, 0, 0);
      particleSys.maxEmitBox = new Vector3(1, 0, 0);
      particleSys.minSize = 0.1;
      particleSys.maxSize = 0.1;
      particleSys.color1 = color;
      particleSys.color2 = color;
      particleSys.colorDead = new Color4(0, 0, 0, 0.0);
      particleSys.minLifeTime = 1;
      particleSys.maxLifeTime = 2;
      particleSys.emitRate = 500;
      particleSys.gravity = new Vector3(0, -9.8, 0);
      particleSys.direction1 = direction;
      particleSys.direction2 = direction;
      particleSys.minEmitPower = 10;
      particleSys.maxEmitPower = 13;
      particleSys.updateSpeed = 0.01;
      particleSys.targetStopDuration = 0.2;
      particleSys.disposeOnStop = true;
      particleSys.start();
    }

    emitter.setVerticesData(VertexBuffer.ColorKind, vertColors);
  }

  startFirework(): void {
    if (this._started) {
      if (this._emitter.position.y >= this._height && !this._exploded) {
        this._explosionSfx.play();
        this._exploded = true;
        this._explosions(this._emitter.position);
        this._emitter.dispose();
        this._rocket.stop();
      } else {
        this._emitter.position.y += 0.2;
      }
    } else {
      if (this._delay <= 0) {
        this._started = true;
        this._rocketSfx.play();
        this._rocket.start();
      } else this._delay--;
    }
  }

  private _loadSounds(): void {
    this._rocketSfx = new Sound(
      'selection',
      './sounds/fw_05.wav',
      this._scene,
      function () {},
      {
        volume: 0.5,
      }
    );

    this._explosionSfx = new Sound(
      'selection',
      './sounds/fw_03.wav',
      this._scene,
      function () {},
      {
        volume: 0.5,
      }
    );
  }
}
