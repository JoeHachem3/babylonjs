import {
  Effect,
  ParticleSystem,
  PostProcess,
  Scene,
  Sound,
} from '@babylonjs/core';
import {
  TextBlock,
  AdvancedDynamicTexture,
  StackPanel,
  Image,
  Button,
  Control,
  Rectangle,
} from '@babylonjs/gui';

export class Hud {
  private _clockTime: TextBlock = null;
  public time: number;
  private _startTime: number;
  private _prevTime: number = 0;
  private _scene: Scene;
  private _playerUI: AdvancedDynamicTexture;
  private _sString: string = '00';
  private _mString: number = 11;
  private _stopTimer: boolean = false;
  public gamePaused: boolean = false;
  public stopSpark: boolean;
  private _handle: NodeJS.Timeout;
  private _sparkHandle: NodeJS.Timeout;
  private _sparklerLife: Image;
  private _spark: Image;
  public pauseBtn: Button;
  private _pauseMenu: Rectangle;
  private _controls: Rectangle;
  public fadeLevel: number;
  public transition: boolean = false;
  private _pause: Sound;
  private _sfx: Sound;
  public quitSfx: Sound;
  private _sparkWarningSfx: Sound;

  constructor(scene: Scene) {
    this._scene = scene;

    this._playerUI = AdvancedDynamicTexture.CreateFullscreenUI('UI');
    this._playerUI.idealHeight = 720;

    const stackPanel = new StackPanel();
    stackPanel.height = '100%';
    stackPanel.width = '100%';
    stackPanel.top = '14px';
    stackPanel.verticalAlignment = 0;
    this._playerUI.addControl(stackPanel);

    const clockTime = new TextBlock();
    clockTime.name = 'clock';
    clockTime.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_CENTER;
    clockTime.fontSize = '48px';
    clockTime.color = 'white';
    clockTime.text = '11:00';
    clockTime.resizeToFit = true;
    clockTime.height = '96px';
    clockTime.width = '220px';
    clockTime.fontFamily = 'Viga';
    stackPanel.addControl(clockTime);
    this._clockTime = clockTime;

    const sparklerLife = new Image('sparkLife', './sprites/sparkLife.png');
    sparklerLife.width = '54px';
    sparklerLife.height = '162px';
    sparklerLife.cellId = 0;
    sparklerLife.cellHeight = 108;
    sparklerLife.cellWidth = 36;
    sparklerLife.sourceWidth = 36;
    sparklerLife.sourceHeight = 108;
    sparklerLife.horizontalAlignment = 0;
    sparklerLife.verticalAlignment = 0;
    sparklerLife.left = '14px';
    sparklerLife.top = '14px';
    this._playerUI.addControl(sparklerLife);
    this._sparklerLife = sparklerLife;

    const spark = new Image('spark', './sprites/spark.png');
    spark.width = '40px';
    spark.height = '40px';
    spark.cellId = 0;
    spark.cellHeight = 20;
    spark.cellWidth = 20;
    spark.sourceWidth = 20;
    spark.sourceHeight = 20;
    spark.horizontalAlignment = 0;
    spark.verticalAlignment = 0;
    spark.left = '21px';
    spark.top = '20px';
    this._playerUI.addControl(spark);
    this._spark = spark;

    const pauseBtn = Button.CreateImageOnlyButton(
      'pauseBtn',
      './sprites/pauseBtn.png'
    );
    pauseBtn.width = '48px';
    pauseBtn.height = '86px';
    pauseBtn.thickness = 0;
    pauseBtn.verticalAlignment = 0;
    pauseBtn.horizontalAlignment = 1;
    pauseBtn.top = '-16px';
    this._playerUI.addControl(pauseBtn);
    pauseBtn.zIndex = 10;
    this.pauseBtn = pauseBtn;
    pauseBtn.onPointerDownObservable.add(() => {
      this._pauseMenu.isVisible = true;
      this._playerUI.addControl(this._pauseMenu);
      this.pauseBtn.isHitTestVisible = false;

      this.gamePaused = true;
      this._prevTime = this.time;

      this._scene.getSoundByName('gameSong').pause();
      this._pause.play();
    });

    this._createPauseMenu();
    this._createControlsMenu();
    this._loadSounds(scene);
  }

  updateHud(): void {
    this.time =
      Math.floor((new Date().getTime() - this._startTime) / 1000) +
      this._prevTime;
    this._clockTime.text = this._formatTime(this.time);
  }

  private _formatTime(time: number): string {
    const minsPassed = Math.floor(time / 60);
    const secPassed = time % 240;

    if (!(secPassed % 4)) {
      this._mString = Math.floor(minsPassed / 4) + 11;
      this._sString = (secPassed / 4 < 10 ? '0' : '') + secPassed / 4;
    }
    const day = this._mString === 11 ? 'PM' : 'AM';
    return this._mString + ':' + this._sString + day;
  }

  startTimer(): void {
    this._startTime = new Date().getTime();
    this._stopTimer = false;
  }
  stopTimer(): void {
    this._stopTimer = true;
  }

  startSparklerTimer(sparkler: ParticleSystem): void {
    this.stopSpark = false;
    this._sparklerLife.cellId = 0;
    this._spark.cellId = 0;

    clearInterval(this._handle);
    clearInterval(this._sparkHandle);

    this._sparkWarningSfx.stop();

    if (sparkler) {
      sparkler.start();
      this._scene.getLightByName('sparkLight').intensity = 35;
    }

    this._handle = setInterval(() => {
      if (!this.gamePaused) {
        if (this._sparklerLife.cellId < 10) {
          this._sparklerLife.cellId++;
        } else if (this._sparklerLife.cellId == 9) {
          this._sparkWarningSfx.play();
        } else if (this._sparklerLife.cellId == 10) {
          this.stopSpark = true;
          clearInterval(this._handle);
          this._sparkWarningSfx.stop();
        }
      } else this._sparkWarningSfx.pause();
    }, 2000);

    this._sparkHandle = setInterval(() => {
      if (!this.gamePaused) {
        if (this._sparklerLife.cellId < 10 && this._spark.cellId < 5) {
          this._spark.cellId++;
        } else if (this._sparklerLife.cellId < 10 && this._spark.cellId >= 5) {
          this._spark.cellId = 0;
        } else {
          this._spark.cellId = 0;
          clearInterval(this._sparkHandle);
        }
      }
    }, 185);
  }

  stopSparklerTimer(sparkler: ParticleSystem): void {
    this.stopSpark = true;

    if (sparkler) {
      sparkler.stop();
      this._scene.getLightByName('sparkLight').intensity = 0;
    }
  }

  private _createPauseMenu(): void {
    this.gamePaused = false;

    const pauseMenu = new Rectangle();
    pauseMenu.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    pauseMenu.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    pauseMenu.height = 0.8;
    pauseMenu.width = 0.5;
    pauseMenu.thickness = 0;
    pauseMenu.isVisible = false;

    const image = new Image('pause', 'sprites/pause.jpeg');
    pauseMenu.addControl(image);

    const stackPanel = new StackPanel();
    stackPanel.width = 0.83;
    pauseMenu.addControl(stackPanel);

    const resumeBtn = Button.CreateSimpleButton('resume', 'RESUME');
    resumeBtn.width = 0.18;
    resumeBtn.height = '44px';
    resumeBtn.color = 'white';
    resumeBtn.fontFamily = 'Viga';
    resumeBtn.paddingBottom = '14px';
    resumeBtn.cornerRadius = 14;
    resumeBtn.fontSize = '12px';
    resumeBtn.textBlock.resizeToFit = true;
    resumeBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    resumeBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    stackPanel.addControl(resumeBtn);

    this._pauseMenu = pauseMenu;

    resumeBtn.onPointerDownObservable.add(() => {
      this._pauseMenu.isVisible = false;
      this._playerUI.removeControl(pauseMenu);
      this.pauseBtn.isHitTestVisible = true;

      this.gamePaused = false;
      this._startTime = new Date().getTime();

      this._scene.getSoundByName('gameSong').play();
      this._pause.stop();

      this._scene.getSoundByName('gameSong').play();
      this._pause.stop();

      if (this._sparkWarningSfx.isPaused) {
        this._sparkWarningSfx.play();
      }
      this._sfx.play();
    });

    const controlsBtn = Button.CreateSimpleButton('controls', 'CONTROLS');
    controlsBtn.width = 0.18;
    controlsBtn.height = '44px';
    controlsBtn.color = 'white';
    controlsBtn.fontFamily = 'Viga';
    controlsBtn.paddingBottom = '14px';
    controlsBtn.cornerRadius = 14;
    controlsBtn.fontSize = '12px';
    resumeBtn.textBlock.resizeToFit = true;
    controlsBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    controlsBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    stackPanel.addControl(controlsBtn);

    controlsBtn.onPointerDownObservable.add(() => {
      this._controls.isVisible = true;
      this._pauseMenu.isVisible = false;

      this._sfx.play();
    });

    const quitBtn = Button.CreateSimpleButton('quit', 'QUIT');
    quitBtn.width = 0.18;
    quitBtn.height = '44px';
    quitBtn.color = 'white';
    quitBtn.fontFamily = 'Viga';
    quitBtn.paddingBottom = '12px';
    quitBtn.cornerRadius = 14;
    quitBtn.fontSize = '12px';
    resumeBtn.textBlock.resizeToFit = true;
    quitBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    quitBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    stackPanel.addControl(quitBtn);

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
    this.fadeLevel = 1.0;

    quitBtn.onPointerDownObservable.add(() => {
      const postProcess = new PostProcess(
        'Fade',
        'fade',
        ['fadeLevel'],
        null,
        1.0,
        this._scene.getCameraByName('cam')
      );
      postProcess.onApply = (effect) => {
        effect.setFloat('fadeLevel', this.fadeLevel);
      };
      this.transition = true;

      this.quitSfx.play();
      if (this._pause.isPlaying) {
        this._pause.stop();
      }
    });
  }

  private _createControlsMenu(): void {
    const controls = new Rectangle();
    controls.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    controls.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    controls.height = 0.8;
    controls.width = 0.5;
    controls.thickness = 0;
    controls.color = 'white';
    controls.isVisible = false;
    this._playerUI.addControl(controls);
    this._controls = controls;

    //background image
    const image = new Image('controls', 'sprites/controls.jpeg');
    controls.addControl(image);

    const title = new TextBlock('title', 'CONTROLS');
    title.resizeToFit = true;
    title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    title.fontFamily = 'Viga';
    title.fontSize = '32px';
    title.top = '14px';
    controls.addControl(title);

    const backBtn = Button.CreateImageOnlyButton(
      'back',
      './sprites/lanternbutton.jpeg'
    );
    backBtn.width = '40px';
    backBtn.height = '40px';
    backBtn.top = '14px';
    backBtn.thickness = 0;
    backBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    backBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    controls.addControl(backBtn);

    //when the button is down, make menu invisable and remove control of the menu
    backBtn.onPointerDownObservable.add(() => {
      this._pauseMenu.isVisible = true;
      this._controls.isVisible = false;

      this._sfx.play();
    });
  }

  private _loadSounds(scene: Scene): void {
    this._pause = new Sound(
      'pauseSong',
      './sounds/Snowland.wav',
      scene,
      function () {},
      {
        volume: 0.2,
      }
    );

    this._sfx = new Sound(
      'selection',
      './sounds/vgmenuselect.wav',
      scene,
      function () {}
    );

    this.quitSfx = new Sound(
      'quit',
      './sounds/Retro Event UI 13.wav',
      scene,
      function () {}
    );

    this._sparkWarningSfx = new Sound(
      'sparkWarning',
      './sounds/Retro Water Drop 01.wav',
      scene,
      function () {},
      {
        loop: true,
        volume: 0.5,
        playbackRate: 0.6,
      }
    );
  }
}
