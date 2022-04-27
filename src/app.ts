import '@babylonjs/loaders/glTF';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  FreeCamera,
  HemisphericLight,
  Matrix,
  Mesh,
  MeshBuilder,
  PointLight,
  Quaternion,
  Scene,
  SceneLoader,
  ShadowGenerator,
  Vector3,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Button, Control } from '@babylonjs/gui';
import { Player } from './characterController';
import { Environment } from './environment';
import { PlayerInput } from './inputController';

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

  public assets;

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

    const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI('ui');
    guiMenu.idealHeight = 720;

    const startBtn = Button.CreateSimpleButton('start', 'PLAY');
    startBtn.width = 0.2;
    startBtn.height = '14px';
    startBtn.color = 'white';
    startBtn.top = '-14px';
    startBtn.thickness = 0;
    startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    guiMenu.addControl(startBtn);

    startBtn.onPointerDownObservable.add(() => {
      this._goToCutScene();
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

    const cutScene = AdvancedDynamicTexture.CreateFullscreenUI('cutScene');

    const nextBtn = Button.CreateSimpleButton('next', 'NEXT');
    nextBtn.color = 'white';
    nextBtn.thickness = 0;
    nextBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    nextBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    nextBtn.width = '64px';
    nextBtn.height = '64px';
    nextBtn.top = '-3%';
    nextBtn.left = '-12%';
    cutScene.addControl(nextBtn);

    nextBtn.onPointerUpObservable.add(() => {
      this._goToGame();
    });

    await this._cutScene.whenReadyAsync();
    this._scene.dispose();
    this._state = State.CUTSCENE;
    this._scene = this._cutScene;
    this._engine.hideLoadingUI();
    this._scene.attachControl();

    let finishedLoading = false;
    this._setUpGame().then(() => {
      finishedLoading = true;
      this._goToGame();
    });
  }

  private async _goToGame() {
    this._scene.detachControl();
    const scene = this._gameScene;
    scene.clearColor = new Color4(
      0.01568627450980392,
      0.01568627450980392,
      0.20392156862745098
    );

    const playerUI = AdvancedDynamicTexture.CreateFullscreenUI('UI');
    scene.detachControl();

    const loseBtn = Button.CreateSimpleButton('lose', 'LOSE');
    loseBtn.width = 0.2;
    loseBtn.height = '40px';
    loseBtn.color = 'white';
    loseBtn.top = '-14px';
    loseBtn.thickness = 0;
    loseBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    playerUI.addControl(loseBtn);

    loseBtn.onPointerDownObservable.add(() => {
      this._goToLose();
      scene.detachControl();
    });

    this._input = new PlayerInput(scene);
    await this._initializeGameAsync(scene);

    await scene.whenReadyAsync();
    scene.getMeshByName('outer').position = scene
      .getTransformNodeByName('startPosition')
      .getAbsolutePosition();

    this._scene.dispose();
    this._state = State.GAME;
    this._scene = scene;
    this._engine.hideLoadingUI();
    this._scene.attachControl();
  }

  private async _goToLose() {
    this._engine.displayLoadingUI();

    this._scene.detachControl();
    const scene = new Scene(this._engine);
    scene.clearColor = new Color4(0, 0, 0, 1);
    const camera = new FreeCamera('camera1', Vector3.Zero(), scene);
    camera.setTarget(Vector3.Zero());

    const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI('UI');
    const mainBtn = Button.CreateSimpleButton('mainMenu', 'MAIN MENU');
    mainBtn.width = 0.2;
    mainBtn.height = '40px';
    mainBtn.color = 'white';
    guiMenu.addControl(mainBtn);

    mainBtn.onPointerUpObservable.add(() => {
      this._goToStart();
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

        return { mesh: outer };
      });
    }

    return loadCharacter().then((assets) => {
      this.assets = assets;
    });
  }

  private async _initializeGameAsync(scene: Scene) {
    const light0 = new HemisphericLight(
      'hemiLight',
      new Vector3(0, 1, 0),
      scene
    );
    const light = new PointLight('sparkLight', Vector3.Zero(), scene);
    light.diffuse = new Color3(
      0.08627450980392157,
      0.10980392156862745,
      0.15294117647058825
    );
    light.intensity = 35;
    light.radius = 1;
    const shadowGenerator = new ShadowGenerator(1024, light);
    shadowGenerator.darkness = 0.4;

    this._player = new Player(this.assets, scene, shadowGenerator, this._input);
    const camera = this._player.activatePlayerCamera();

    this._environment.checkLanterns(this._player);
  }
}

new App();
