import {
  ActionManager,
  AnimationGroup,
  ArcRotateCamera,
  Color3,
  Color4,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  Quaternion,
  Ray,
  Scene,
  ShadowGenerator,
  SphereParticleEmitter,
  Texture,
  TransformNode,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core';
import { PlayerInput } from './inputController';

export class Player extends TransformNode {
  public camera: UniversalCamera;
  public scene: Scene;
  public sparkler: ParticleSystem;
  private _input: PlayerInput;
  public mesh: Mesh;
  private _camRoot: TransformNode;
  private _yTilt: TransformNode;
  private _moveDirection: Vector3;
  private _h: number = 0;
  private _v: number = 0;
  private _inputAmt: number = 0;
  private _deltaTime: number = 0;
  private _gravity: Vector3 = new Vector3();
  private _grounded: boolean;
  private _lastGroundPos: Vector3 = Vector3.Zero();
  private _jumpCount: number = 1;
  private _canDash: boolean = true;
  private _dashPressed: boolean = false;
  public dashTime: number = 0;
  public lanternsLit: number = 1;
  public sparkReset: boolean = false;
  public sparkLit: boolean = true;
  public win: boolean = false;
  private _dash: AnimationGroup;
  private _idle: AnimationGroup;
  private _jump: AnimationGroup;
  private _land: AnimationGroup;
  private _run: AnimationGroup;
  private _currentAnim: AnimationGroup = null;
  private _prevAnim: AnimationGroup;
  private _isFalling: boolean = false;
  private _jumped: boolean = false;

  private static readonly PLAYER_SPEED: number = 0.45;
  private static readonly JUMP_FORCE: number = 0.8;
  private static readonly GRAVITY: number = -2.8;
  private static readonly DASH_FACTOR: number = 2.5;
  private static readonly DASH_TIME: number = 10;
  private static readonly ORIGINAL_TILT: Vector3 = new Vector3(
    0.5934119456780721,
    0,
    0
  );
  private static readonly DOWN_TILT: Vector3 = new Vector3(
    0.8290313946973066,
    0,
    0
  );

  constructor(
    assets: { mesh: Mesh; animationGroups: AnimationGroup[] },
    scene: Scene,
    shadowGenerator: ShadowGenerator,
    input?: PlayerInput
  ) {
    super('player', scene);
    this.scene = scene;
    this._setupPlayerCamera();

    this.mesh = assets.mesh;
    this.mesh.parent = this;

    this._setUpMeshActions();

    this._dash = assets.animationGroups[0];
    this._idle = assets.animationGroups[1];
    this._jump = assets.animationGroups[2];
    this._land = assets.animationGroups[3];
    this._run = assets.animationGroups[4];

    this._createSparkles();
    this._setUpAnimations();

    this.scene.getLightByName('sparkLight').parent =
      this.scene.getTransformNodeByName('Empty');
    shadowGenerator.addShadowCaster(assets.mesh);

    this._input = input;
  }

  private _setupPlayerCamera(): void {
    this._camRoot = new TransformNode('root');
    this._camRoot.position = Vector3.Zero();
    this._camRoot.rotation = new Vector3(0, Math.PI, 0);

    const yTilt = new TransformNode('yTilt');
    yTilt.rotation = Player.ORIGINAL_TILT;
    this._yTilt = yTilt;
    yTilt.parent = this._camRoot;

    this.camera = new UniversalCamera(
      'cam',
      new Vector3(0, 0, -30),
      this.scene
    );
    this.camera.lockedTarget = this._camRoot.position;
    this.camera.fov = 0.47350045992678597;
    this.camera.parent = yTilt;

    this.scene.activeCamera = this.camera;
  }

  private _updateCamera(): void {
    if (this.mesh.intersectsMesh(this.scene.getMeshByName('cornerTrigger'))) {
      if (this._input.horizontalAxis > 0) {
        this._camRoot.rotation = Vector3.Lerp(
          this._camRoot.rotation,
          new Vector3(
            this._camRoot.rotation.x,
            Math.PI / 2,
            this._camRoot.rotation.z
          ),
          0.4
        );
      } else if (this._input.horizontalAxis < 0) {
        this._camRoot.rotation = Vector3.Lerp(
          this._camRoot.rotation,
          new Vector3(
            this._camRoot.rotation.x,
            Math.PI,
            this._camRoot.rotation.z
          ),
          0.4
        );
      }
    }

    if (this.mesh.intersectsMesh(this.scene.getMeshByName('festivalTrigger'))) {
      if (this._input.verticalAxis > 0) {
        this._yTilt.rotation = Vector3.Lerp(
          this._yTilt.rotation,
          Player.DOWN_TILT,
          0.4
        );
      } else if (this._input.verticalAxis < 0) {
        this._yTilt.rotation = Vector3.Lerp(
          this._yTilt.rotation,
          Player.ORIGINAL_TILT,
          0.4
        );
      }
    }

    if (
      this.mesh.intersectsMesh(this.scene.getMeshByName('destinationTrigger'))
    ) {
      if (this._input.verticalAxis > 0) {
        this._yTilt.rotation = Vector3.Lerp(
          this._yTilt.rotation,
          Player.ORIGINAL_TILT,
          0.4
        );
      } else if (this._input.verticalAxis < 0) {
        this._yTilt.rotation = Vector3.Lerp(
          this._yTilt.rotation,
          Player.DOWN_TILT,
          0.4
        );
      }
    }

    const centerPlayer = this.mesh.position.y + 2;
    this._camRoot.position = Vector3.Lerp(
      this._camRoot.position,
      new Vector3(this.mesh.position.x, centerPlayer, this.mesh.position.z),
      0.4
    );
  }

  activatePlayerCamera(): UniversalCamera {
    this.scene.registerBeforeRender(() => {
      this._beforeRenderUpdate();
      this._updateCamera();
    });

    return this.camera;
  }

  private _beforeRenderUpdate(): void {
    this._updateFromControls();
    this._updateGroundDetection();
    this._animatePlayer();
  }

  private _updateFromControls(): void {
    this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

    this._moveDirection = Vector3.Zero();
    this._h = this._input.horizontal;
    this._v = this._input.vertical;

    if (
      this._input.dashing &&
      !this._dashPressed &&
      this._canDash &&
      !this._grounded
    ) {
      this._canDash = false;
      this._dashPressed = true;

      this._currentAnim = this._dash;
    }

    let dashFactor = 1;
    if (this._dashPressed) {
      if (this.dashTime > Player.DASH_TIME) {
        this.dashTime = 0;
        this._dashPressed = false;
      } else dashFactor = Player.DASH_FACTOR;
      this.dashTime++;
    }

    const correctedVertical = this._camRoot.forward.scaleInPlace(this._v);
    const correctedHorizontal = this._camRoot.right.scaleInPlace(this._h);

    const move = correctedHorizontal.addInPlace(correctedVertical).normalize();

    this._moveDirection = new Vector3(
      move.x * dashFactor,
      0,
      move.z * dashFactor
    );

    this._inputAmt = Math.min(Math.abs(this._h) + Math.abs(this._v), 1);

    this._moveDirection = this._moveDirection.scaleInPlace(
      this._inputAmt * Player.PLAYER_SPEED
    );

    const input = new Vector3(
      this._input.horizontalAxis,
      0,
      this._input.verticalAxis
    );
    if (!input.length()) return;

    let angle = Math.atan2(
      this._input.horizontalAxis,
      this._input.verticalAxis
    );
    angle += this._camRoot.rotation.y;
    this.mesh.rotationQuaternion = Quaternion.Slerp(
      this.mesh.rotationQuaternion,
      Quaternion.FromEulerAngles(0, angle, 0),
      10 * this._deltaTime
    );
  }

  private _floorRayCast(
    offsetX: number = 0,
    offsetZ: number = 0,
    raycastlen: number
  ): Vector3 {
    const rayCastFloorPos = new Vector3(
      this.mesh.position.x + offsetX,
      this.mesh.position.y + 0.5,
      this.mesh.position.z + offsetZ
    );
    const ray = new Ray(rayCastFloorPos, Vector3.Up().scale(-1), raycastlen);

    const predicate = (mesh: Mesh) => mesh.isPickable && mesh.isEnabled();

    const pick = this.scene.pickWithRay(ray, predicate);

    return pick.hit ? pick.pickedPoint : Vector3.Zero();
  }

  private _isGrounded(): boolean {
    return !this._floorRayCast(0, 0, 0.6).equals(Vector3.Zero());
  }

  private _updateGroundDetection(): void {
    this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

    if (this._input.jumping && this._jumpCount) {
      this._gravity.y = Player.JUMP_FORCE;
      this._jumpCount--;

      this._jumped = true;
      this._isFalling = false;
    } else if (!this._isGrounded()) {
      if (this._checkSlope() && this._gravity.y <= 0) {
        this._gravity.y = 0;
        this._jumpCount = 1;
        this._grounded = true;
      } else {
        this._gravity = this._gravity.addInPlace(
          Vector3.Up().scale(this._deltaTime * Player.GRAVITY)
        );
        this._grounded = false;
      }
    } else {
      this._gravity.y = 0;
      this._grounded = true;
      this._lastGroundPos.copyFrom(this.mesh.position);

      this._jumpCount = 1;

      this._canDash = true;
      this.dashTime = 0;
      this._dashPressed = false;

      this._jumped = false;
      this._isFalling = false;
    }

    if (this._gravity.y < -Player.JUMP_FORCE)
      this._gravity.y = -Player.JUMP_FORCE;

    if (this._gravity.y < 0 && this._jumped) this._isFalling = true;

    this.mesh.moveWithCollisions(this._moveDirection.addInPlace(this._gravity));
  }

  private _checkSlope(): boolean {
    const predicate = function (mesh) {
      return mesh.isPickable && mesh.isEnabled();
    };

    return !![
      { x: 0, z: 0.25 },
      { x: 0, z: -0.25 },
      { x: 0.25, z: 0 },
      { x: -0.25, z: 0 },
    ].find((position) => {
      const rayCast = new Vector3(
        this.mesh.position.x + position.x,
        this.mesh.position.y + 0.5,
        this.mesh.position.z + position.z
      );
      const ray = new Ray(rayCast, Vector3.Up().scale(-1), 1.5);
      const pick = this.scene.pickWithRay(ray, predicate);
      return (
        pick.hit &&
        !pick.getNormal().equals(Vector3.Up()) &&
        pick.pickedMesh.name.includes('stair')
      );
    });
  }

  private _setUpMeshActions(): void {
    this.mesh.actionManager = new ActionManager(this.scene);

    this.mesh.actionManager.registerAction(
      new ExecuteCodeAction(
        {
          trigger: ActionManager.OnIntersectionEnterTrigger,
          parameter: this.scene.getMeshByName('destination'),
        },
        () => {
          if (this.lanternsLit == 22) {
            this.win = true;
            //tilt camera to look at where the fireworks will be displayed
            this._yTilt.rotation = new Vector3(
              5.689773361501514,
              0.23736477827122882,
              0
            );
            this._yTilt.position = new Vector3(0, 6, 0);
            this.camera.position.y = 17;
          }
        }
      )
    );

    this.mesh.actionManager.registerAction(
      new ExecuteCodeAction(
        {
          trigger: ActionManager.OnIntersectionEnterTrigger,
          parameter: this.scene.getMeshByName('ground'),
        },
        () => {
          this.mesh.position.copyFrom(this._lastGroundPos);
        }
      )
    );
  }

  private _setUpAnimations(): void {
    this.scene.stopAllAnimations();
    this._run.loopAnimation = true;
    this._idle.loopAnimation = true;
    this._currentAnim = this._idle;
    this._prevAnim = this._land;
  }

  private _animatePlayer(): void {
    if (
      !this._dashPressed &&
      !this._isFalling &&
      !this._jumped &&
      (this._input.inputMap['ArrowUp'] ||
        this._input.inputMap['ArrowDown'] ||
        this._input.inputMap['ArrowLeft'] ||
        this._input.inputMap['ArrowRight'])
    )
      this._currentAnim = this._run;
    else if (this._jumped && !this._isFalling && !this._dashPressed)
      this._currentAnim = this._jump;
    else if (!this._isFalling && this._grounded) this._currentAnim = this._idle;
    else if (this._isFalling) this._currentAnim = this._land;

    if (this._currentAnim != null && this._prevAnim !== this._currentAnim) {
      this._prevAnim.stop();
      this._currentAnim.play(this._currentAnim.loopAnimation);
      this._prevAnim = this._currentAnim;
    }
  }

  private _createSparkles(): void {
    const sphere = MeshBuilder.CreateSphere(
      'sparkles',
      { segments: 4, diameter: 1 },
      this.scene
    );
    sphere.position = new Vector3(0, 0, 0);
    sphere.parent = this.scene.getTransformNodeByName('Empty');
    sphere.isVisible = false;

    let particleSystem = new ParticleSystem('sparkles', 1000, this.scene);
    particleSystem.particleTexture = new Texture(
      './textures/flwr.png',
      this.scene
    );
    particleSystem.emitter = sphere;
    particleSystem.particleEmitterType = new SphereParticleEmitter(0);

    particleSystem.updateSpeed = 0.014;
    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = 360;
    particleSystem.minEmitPower = 1;
    particleSystem.maxEmitPower = 3;

    particleSystem.minSize = 0.5;
    particleSystem.maxSize = 2;
    particleSystem.minScaleX = 0.5;
    particleSystem.minScaleY = 0.5;
    particleSystem.color1 = new Color4(0.8, 0.8549019607843137, 1, 1);
    particleSystem.color2 = new Color4(
      0.8509803921568627,
      0.7647058823529411,
      1,
      1
    );

    particleSystem.addRampGradient(0, Color3.White());
    particleSystem.addRampGradient(1, Color3.Black());
    particleSystem.getRampGradients()[0].color =
      Color3.FromHexString('#BBC1FF');
    particleSystem.getRampGradients()[1].color =
      Color3.FromHexString('#FFFFFF');
    particleSystem.maxAngularSpeed = 0;
    particleSystem.maxInitialRotation = 360;
    particleSystem.minAngularSpeed = -10;
    particleSystem.maxAngularSpeed = 10;

    particleSystem.start();

    this.sparkler = particleSystem;
  }
}
