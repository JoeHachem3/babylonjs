import '@babylonjs/loaders/glTF';
import {
  AnimationGroup,
  ArcRotateCamera,
  Color3,
  Color4,
  CubeTexture,
  Effect,
  Engine,
  FreeCamera,
  GlowLayer,
  HemisphericLight,
  Matrix,
  Mesh,
  MeshBuilder,
  PointLight,
  PostProcess,
  Quaternion,
  Scene,
  SceneLoader,
  ShadowGenerator,
  Sound,
  Vector3,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Image,
  Rectangle,
  TextBlock,
  StackPanel,
} from '@babylonjs/gui';
import { Player } from './characterController';
import { Environment } from './environment';
import { PlayerInput } from './inputController';
import { Hud } from './ui';

enum State {
  START = 0,
  GAME = 1,
  LOSE = 2,
  CUTSCENE = 3,
}

class App {
  private _scene: Scene;
  private _gameScene: Scene;
  private _cutScene: Scene;
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;
  private _environment: Environment;
  private _state: State = State.START;
  private _player: Player;
  private _input: PlayerInput;
  private _ui: Hud;
  private _transition: boolean = false;
  game: Sound;
  end: Sound;

  public assets: {
    mesh: Mesh;
    animationGroups: AnimationGroup[];
  };

  constructor() {
    this._createCanvas();

    this._engine = new Engine(this._canvas, true);
    this._scene = new Scene(this._engine);

    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 2,
      Math.PI / 2,
      2,
      Vector3.Zero(),
      this._scene
    );
    camera.attachControl(this._canvas, true);

    const light1 = new HemisphericLight(
      'light1',
      new Vector3(1, 1, 0),
      this._scene
    );

    const sphere = MeshBuilder.CreateSphere(
      'sphere',
      { diameter: 1 },
      this._scene
    );

    this._main();
  }

  private _createCanvas() {
    document.documentElement.style['overflow'] = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    this._canvas = document.createElement('canvas');
    this._canvas.style.width = '100%';
    this._canvas.style.height = '100%';
    this._canvas.id = 'gameCanvas';
    document.body.appendChild(this._canvas);
  }

  private async _main() {
    await this._goToStart();

    this._engine.runRenderLoop(() => {
      if (
        this._state === State.GAME &&
        this._ui.time >= 240 &&
        !this._player.win
      ) {
        this._goToLose();
        this._ui.stopTimer();
      }
      this._scene.render();
    });

    window.addEventListener('resize', () => this._engine.resize());
  }

  private async _goToStart() {
    this._engine.displayLoadingUI();

    this._scene.detachControl();
    const scene = new Scene(this._engine);
    scene.clearColor = new Color4(0, 0, 0, 1);
    const camera = new FreeCamera('camera1', new Vector3(0, 0, 0), scene);
    camera.setTarget(Vector3.Zero());

    const start = new Sound(
      'startSong',
      './sounds/copycat(revised).mp3',
      scene,
      () => {},
      { volume: 0.25, loop: true, autoplay: true }
    );
    const sfx = new Sound(
      'selection',
      './sounds/vgmenuselect.wav',
      scene,
      () => {}
    );

    const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI('ui');
    guiMenu.idealHeight = 720;

    const imageRect = new Rectangle('titleContainer');
    imageRect.width = 0.8;
    imageRect.thickness = 0;
    guiMenu.addControl(imageRect);

    const startbg = new Image('startbg', 'sprites/start.jpeg');
    imageRect.addControl(startbg);

    const title = new TextBlock('title', "SUMMER'S FESTIVAL");
    title.resizeToFit = true;
    title.fontFamily = 'Ceviche One';
    title.fontSize = '64px';
    title.color = 'white';
    title.resizeToFit = true;
    title.top = '14px';
    title.width = 0.8;
    title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    imageRect.addControl(title);

    const startBtn = Button.CreateSimpleButton('start', 'PLAY');
    startBtn.fontFamily = 'Viga';
    startBtn.width = 0.2;
    startBtn.height = '40px';
    startBtn.color = 'white';
    startBtn.top = '-14px';
    startBtn.thickness = 0;
    startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    imageRect.addControl(startBtn);

    Effect.RegisterShader(
      'fade',
      'precision highp float;' +
        'varying vec2 vUV;' +
        'uniform sampler2D textureSampler; ' +
        'uniform float fadeLevel; ' +
        'void main(void){' +
        'vec4 baseColor = texture2D(textureSampler, vUV) * fadeLevel;' +
        'baseColor.a = 1.0;' +
        'gl_FragColor = baseColor;' +
        '}'
    );

    let fadeLevel = 1.0;
    this._transition = false;
    scene.registerBeforeRender(() => {
      if (this._transition) {
        fadeLevel -= 0.05;
        if (fadeLevel <= 0) {
          this._goToCutScene();
          this._transition = false;
        }
      }
    });

    startBtn.onPointerDownObservable.add(() => {
      const postProcess = new PostProcess(
        'Fade',
        'fade',
        ['fadeLevel'],
        null,
        1.0,
        camera
      );
      postProcess.onApply = (effect) => {
        effect.setFloat('fadeLevel', fadeLevel);
      };
      this._transition = true;
      sfx.play();

      scene.detachControl();
    });

    await scene.whenReadyAsync();
    this._engine.hideLoadingUI();

    this._scene.dispose();
    this._scene = scene;
    this._state = State.START;
  }

  private async _goToCutScene() {
    this._engine.displayLoadingUI();

    this._scene.detachControl();
    this._cutScene = new Scene(this._engine);
    this._cutScene.clearColor = new Color4(0, 0, 0, 1);
    const camera = new FreeCamera('camera1', Vector3.Zero(), this._cutScene);
    camera.setTarget(Vector3.Zero());

    const cutScene = AdvancedDynamicTexture.CreateFullscreenUI('cutscene');
    let transition = 0; //increment based on dialogue
    let canplay = false;
    let finished_anim = false;
    let anims_loaded = 0;

    //Animations
    const beginning_anim = new Image(
      'sparkLife',
      './sprites/beginning_anim.png'
    );
    beginning_anim.stretch = Image.STRETCH_UNIFORM;
    beginning_anim.cellId = 0;
    beginning_anim.cellHeight = 480;
    beginning_anim.cellWidth = 480;
    beginning_anim.sourceWidth = 480;
    beginning_anim.sourceHeight = 480;
    cutScene.addControl(beginning_anim);
    beginning_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const working_anim = new Image('sparkLife', './sprites/working_anim.png');
    working_anim.stretch = Image.STRETCH_UNIFORM;
    working_anim.cellId = 0;
    working_anim.cellHeight = 480;
    working_anim.cellWidth = 480;
    working_anim.sourceWidth = 480;
    working_anim.sourceHeight = 480;
    working_anim.isVisible = false;
    cutScene.addControl(working_anim);
    working_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const dropoff_anim = new Image('sparkLife', './sprites/dropoff_anim.png');
    dropoff_anim.stretch = Image.STRETCH_UNIFORM;
    dropoff_anim.cellId = 0;
    dropoff_anim.cellHeight = 480;
    dropoff_anim.cellWidth = 480;
    dropoff_anim.sourceWidth = 480;
    dropoff_anim.sourceHeight = 480;
    dropoff_anim.isVisible = false;
    cutScene.addControl(dropoff_anim);
    dropoff_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const leaving_anim = new Image('sparkLife', './sprites/leaving_anim.png');
    leaving_anim.stretch = Image.STRETCH_UNIFORM;
    leaving_anim.cellId = 0;
    leaving_anim.cellHeight = 480;
    leaving_anim.cellWidth = 480;
    leaving_anim.sourceWidth = 480;
    leaving_anim.sourceHeight = 480;
    leaving_anim.isVisible = false;
    cutScene.addControl(leaving_anim);
    leaving_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const watermelon_anim = new Image(
      'sparkLife',
      './sprites/watermelon_anim.png'
    );
    watermelon_anim.stretch = Image.STRETCH_UNIFORM;
    watermelon_anim.cellId = 0;
    watermelon_anim.cellHeight = 480;
    watermelon_anim.cellWidth = 480;
    watermelon_anim.sourceWidth = 480;
    watermelon_anim.sourceHeight = 480;
    watermelon_anim.isVisible = false;
    cutScene.addControl(watermelon_anim);
    watermelon_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });
    const reading_anim = new Image('sparkLife', './sprites/reading_anim.png');
    reading_anim.stretch = Image.STRETCH_UNIFORM;
    reading_anim.cellId = 0;
    reading_anim.cellHeight = 480;
    reading_anim.cellWidth = 480;
    reading_anim.sourceWidth = 480;
    reading_anim.sourceHeight = 480;
    reading_anim.isVisible = false;
    cutScene.addControl(reading_anim);
    reading_anim.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });

    //Dialogue animations
    const dialogueBg = new Image(
      'sparkLife',
      './sprites/bg_anim_text_dialogue.png'
    );
    dialogueBg.stretch = Image.STRETCH_UNIFORM;
    dialogueBg.cellId = 0;
    dialogueBg.cellHeight = 480;
    dialogueBg.cellWidth = 480;
    dialogueBg.sourceWidth = 480;
    dialogueBg.sourceHeight = 480;
    dialogueBg.horizontalAlignment = 0;
    dialogueBg.verticalAlignment = 0;
    dialogueBg.isVisible = false;
    cutScene.addControl(dialogueBg);
    dialogueBg.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });

    const dialogue = new Image('sparkLife', './sprites/text_dialogue.png');
    dialogue.stretch = Image.STRETCH_UNIFORM;
    dialogue.cellId = 0;
    dialogue.cellHeight = 480;
    dialogue.cellWidth = 480;
    dialogue.sourceWidth = 480;
    dialogue.sourceHeight = 480;
    dialogue.horizontalAlignment = 0;
    dialogue.verticalAlignment = 0;
    dialogue.isVisible = false;
    cutScene.addControl(dialogue);
    dialogue.onImageLoadedObservable.add(() => {
      anims_loaded++;
    });

    const dialogueTimer = setInterval(() => {
      if (finished_anim && dialogueBg.cellId < 3) {
        dialogueBg.cellId++;
      } else {
        dialogueBg.cellId = 0;
      }
    }, 250);

    const skipBtn = Button.CreateSimpleButton('skip', 'SKIP');
    skipBtn.fontFamily = 'Viga';
    skipBtn.width = '45px';
    skipBtn.left = '-14px';
    skipBtn.height = '40px';
    skipBtn.color = 'white';
    skipBtn.top = '14px';
    skipBtn.thickness = 0;
    skipBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    skipBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    cutScene.addControl(skipBtn);

    skipBtn.onPointerDownObservable.add(() => {
      this._cutScene.detachControl();
      clearInterval(animTimer);
      clearInterval(anim2Timer);
      clearInterval(dialogueTimer);
      this._engine.displayLoadingUI();
      canplay = true;
    });

    let animTimer: NodeJS.Timeout;
    let anim2Timer: NodeJS.Timeout;
    let anim = 1;
    this._cutScene.onBeforeRenderObservable.add(() => {
      if (anims_loaded == 8) {
        this._engine.hideLoadingUI();
        anims_loaded = 0;

        animTimer = setInterval(() => {
          switch (anim) {
            case 1:
              if (beginning_anim.cellId == 9) {
                anim++;
                beginning_anim.isVisible = false;
                working_anim.isVisible = true;
              } else {
                beginning_anim.cellId++;
              }
              break;
            case 2:
              if (working_anim.cellId == 11) {
                anim++;
                working_anim.isVisible = false;
                dropoff_anim.isVisible = true;
              } else {
                working_anim.cellId++;
              }
              break;
            case 3:
              if (dropoff_anim.cellId == 11) {
                anim++;
                dropoff_anim.isVisible = false;
                leaving_anim.isVisible = true;
              } else {
                dropoff_anim.cellId++;
              }
              break;
            case 4:
              if (leaving_anim.cellId == 9) {
                anim++;
                leaving_anim.isVisible = false;
                watermelon_anim.isVisible = true;
              } else {
                leaving_anim.cellId++;
              }
              break;
            default:
              break;
          }
        }, 250);

        anim2Timer = setInterval(() => {
          switch (anim) {
            case 5:
              if (watermelon_anim.cellId == 8) {
                anim++;
                watermelon_anim.isVisible = false;
                reading_anim.isVisible = true;
              } else {
                watermelon_anim.cellId++;
              }
              break;
            case 6:
              if (reading_anim.cellId == 11) {
                reading_anim.isVisible = false;
                finished_anim = true;
                dialogueBg.isVisible = true;
                dialogue.isVisible = true;
                next.isVisible = true;
              } else {
                reading_anim.cellId++;
              }
              break;
          }
        }, 750);
      }

      if (finishedLoading && canplay) {
        canplay = false;
        this._goToGame();
      }
    });

    const next = Button.CreateImageOnlyButton('next', './sprites/arrowBtn.png');
    next.rotation = Math.PI / 2;
    next.thickness = 0;
    next.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    next.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    next.width = '64px';
    next.height = '64px';
    next.top = '-3%';
    next.left = '-12%';
    next.isVisible = false;
    cutScene.addControl(next);

    next.onPointerUpObservable.add(() => {
      if (transition == 8) {
        this._cutScene.detachControl();
        this._engine.displayLoadingUI();
        transition = 0;
        canplay = true;
      } else if (transition < 8) {
        transition++;
        dialogue.cellId++;
      }
    });

    await this._cutScene.whenReadyAsync();
    this._scene.dispose();
    this._state = State.CUTSCENE;
    this._scene = this._cutScene;

    let finishedLoading = false;
    this._setUpGame().then(() => {
      finishedLoading = true;
    });
  }

  private async _goToGame() {
    this._scene.detachControl();
    const scene = this._gameScene;

    this._ui = new Hud(scene);

    scene.detachControl();

    const envHdri = CubeTexture.CreateFromPrefilteredData(
      './textures/envtext.env',
      scene
    );
    envHdri.name = 'env';
    envHdri.gammaSpace = false;
    scene.environmentTexture = envHdri;
    scene.environmentIntensity = 0.04;

    this._input = new PlayerInput(scene, this._ui);
    await this._initializeGameAsync(scene);

    await scene.whenReadyAsync();
    scene.getMeshByName('outer').position = scene
      .getTransformNodeByName('startPosition')
      .getAbsolutePosition();

    this._ui.startTimer();
    this._ui.startSparklerTimer(this._player.sparkler);

    this._scene.dispose();
    this._state = State.GAME;
    this._scene = scene;
    this._engine.hideLoadingUI();
    this._scene.attachControl();

    this.game.play();
  }

  private async _goToLose() {
    this._engine.displayLoadingUI();

    this._scene.detachControl();
    const scene = new Scene(this._engine);
    scene.clearColor = new Color4(0, 0, 0, 1);
    const camera = new FreeCamera('camera1', Vector3.Zero(), scene);
    camera.setTarget(Vector3.Zero());

    const start = new Sound(
      'loseSong',
      './sounds/Eye of the Storm.mp3',
      scene,
      function () {},
      {
        volume: 0.25,
        loop: true,
        autoplay: true,
      }
    );
    const sfx = new Sound(
      'selection',
      './sounds/vgmenuselect.wav',
      scene,
      function () {}
    );

    const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI('UI');
    guiMenu.idealHeight = 720;

    //background image
    const image = new Image('lose', 'sprites/lose.jpeg');
    image.autoScale = true;
    guiMenu.addControl(image);

    const panel = new StackPanel();
    guiMenu.addControl(panel);

    const text = new TextBlock();
    text.fontSize = 24;
    text.color = 'white';
    text.height = '100px';
    text.width = '100%';
    panel.addControl(text);

    text.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
    text.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_CENTER;
    text.text = "There's no fireworks this year";
    const dots = new TextBlock();
    dots.color = 'white';
    dots.fontSize = 24;
    dots.height = '100px';
    dots.width = '100%';
    dots.text = '....';

    const mainBtn = Button.CreateSimpleButton('mainmenu', 'MAIN MENU');
    mainBtn.width = 0.2;
    mainBtn.height = '40px';
    mainBtn.color = 'white';
    panel.addControl(mainBtn);

    Effect.RegisterShader(
      'fade',
      'precision highp float;' +
        'varying vec2 vUV;' +
        'uniform sampler2D textureSampler; ' +
        'uniform float fadeLevel; ' +
        'void main(void){' +
        'vec4 baseColor = texture2D(textureSampler, vUV) * fadeLevel;' +
        'baseColor.a = 1.0;' +
        'gl_FragColor = baseColor;' +
        '}'
    );

    let fadeLevel = 1.0;
    this._transition = false;
    scene.registerBeforeRender(() => {
      if (this._transition) {
        fadeLevel -= 0.05;
        if (fadeLevel <= 0) {
          this._goToStart();
          this._transition = false;
        }
      }
    });

    mainBtn.onPointerUpObservable.add(() => {
      const postProcess = new PostProcess(
        'Fade',
        'fade',
        ['fadeLevel'],
        null,
        1.0,
        camera
      );
      postProcess.onApply = (effect) => {
        effect.setFloat('fadeLevel', fadeLevel);
      };
      this._transition = true;
      sfx.play();

      scene.detachControl();
    });

    await scene.whenReadyAsync();
    this._engine.hideLoadingUI();

    this._scene.dispose();
    this._scene = scene;
    this._state = State.LOSE;
  }

  private async _setUpGame() {
    const scene = new Scene(this._engine);
    this._gameScene = scene;

    this._loadSounds(scene);

    this._environment = new Environment(scene);
    await this._environment.load();
    await this._loadCharacterAssets(scene);
  }

  private async _loadCharacterAssets(scene: Scene) {
    async function loadCharacter() {
      const outer = MeshBuilder.CreateBox(
        'outer',
        { width: 2, depth: 1, height: 3 },
        scene
      );
      outer.isVisible = false;
      outer.isPickable = false;
      outer.checkCollisions = true;

      outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

      outer.ellipsoid = new Vector3(1, 1.5, 1);
      outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

      outer.rotationQuaternion = new Quaternion(0, 1, 0, 0);

      return SceneLoader.ImportMeshAsync(
        null,
        './models/',
        'player.glb',
        scene
      ).then((result) => {
        const body = result.meshes[0];
        body.parent = outer;
        body.isPickable = false;
        body.getChildMeshes().forEach((mesh) => (mesh.isPickable = false));

        return { mesh: outer, animationGroups: result.animationGroups };
      });
    }

    return loadCharacter().then((assets) => {
      this.assets = assets;
    });
  }

  private async _initializeGameAsync(scene: Scene) {
    scene.ambientColor = new Color3(
      0.34509803921568627,
      0.5568627450980392,
      0.8352941176470589
    );
    scene.clearColor = new Color4(
      0.01568627450980392,
      0.01568627450980392,
      0.20392156862745098
    );

    const light = new PointLight('sparkLight', Vector3.Zero(), scene);
    light.diffuse = new Color3(1, 1, 1);
    light.intensity = 35;
    light.radius = 1;

    const shadowGenerator = new ShadowGenerator(1024, light);
    shadowGenerator.darkness = 0.4;

    this._player = new Player(this.assets, scene, shadowGenerator, this._input);
    const camera = this._player.activatePlayerCamera();

    this._environment.checkLanterns(this._player);

    scene.onBeforeRenderObservable.add(() => {
      if (this._player.sparkReset) {
        this._ui.startSparklerTimer(this._player.sparkler);
        this._player.sparkReset = false;

        this._ui.updateLanternCount(this._player.lanternsLit);
      } else if (this._ui.stopSpark && this._player.sparkLit) {
        this._ui.stopSparklerTimer(this._player.sparkler);
        this._player.sparkLit = false;
      }

      if (!this._ui.gamePaused) {
        this._ui.updateHud();
      }

      if (this._ui.quit) {
        this._ui.quit = false;
        this._goToStart();
      }
    });

    const gl = new GlowLayer('glow', scene);
    gl.intensity = 0.4;
    this._environment.lanternObjs.forEach((lantern) => {
      gl.addIncludedOnlyMesh(lantern.mesh);
    });
  }

  private _loadSounds(scene: Scene): void {
    this.game = new Sound(
      'gameSong',
      './sounds/Christmassynths.wav',
      scene,
      function () {},
      {
        loop: true,
        volume: 0.1,
      }
    );

    this.end = new Sound(
      'endSong',
      './sounds/copycat(revised).mp3',
      scene,
      function () {},
      {
        volume: 0.25,
      }
    );
  }
}

new App();
