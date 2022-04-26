import {
  ArcRotateCamera,
  Color4,
  Engine,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Button, Control } from '@babylonjs/gui';

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
  private _state: State = State.START;

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

    window.addEventListener('keydown', (e) => {
      if (e.shiftKey && e.ctrlKey && e.altKey && e.key === 'I') {
        if (this._scene.debugLayer.isVisible()) this._scene.debugLayer.hide();
        else this._scene.debugLayer.show();
      }
    });

    this._goToStart();

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

    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 2,
      Math.PI / 2,
      2,
      Vector3.Zero(),
      scene
    );
    camera.setTarget(Vector3.Zero());

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
    // !to remove
    const light1 = new HemisphericLight('light1', new Vector3(1, 1, 0), scene);

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
    let scene = new Scene(this._engine);
    this._gameScene = scene;

    //...load assets
  }
}

new App();
