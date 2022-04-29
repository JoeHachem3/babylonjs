import {
  ActionManager,
  ExecuteCodeAction,
  Scalar,
  Scene,
} from '@babylonjs/core';
import { Hud } from './ui';

export class PlayerInput {
  inputMap: { [key: string]: boolean };
  vertical: number = 0;
  verticalAxis: number = 0;
  horizontal: number = 0;
  horizontalAxis: number = 0;
  dashing: boolean = false;
  jumping: boolean = false;
  private _ui: Hud;

  constructor(scene: Scene, ui: Hud) {
    scene.actionManager = new ActionManager(scene);
    this._ui = ui;

    this.inputMap = {};

    if (this._ui.isMobile) this._setUpMobile();
    else {
      scene.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (e) => {
          this.inputMap[e.sourceEvent.key] = true;
        })
      );
      scene.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (e) => {
          this.inputMap[e.sourceEvent.key] = false;
        })
      );
    }

    scene.onBeforeRenderObservable.add(() => {
      if (this._ui.gamePaused || this._ui.gameFinished) {
        this.vertical = 0;
        this.verticalAxis = 0;
        this.horizontal = 0;
        this.horizontalAxis = 0;
      } else this._updateMovement();
    });
  }

  private _updateMovement() {
    if (this.inputMap.ArrowUp) {
      this.vertical = Scalar.Lerp(this.vertical, 1, 0.2);
      this.verticalAxis = 1;
    } else if (this.inputMap.ArrowDown) {
      this.vertical = Scalar.Lerp(this.vertical, -1, 0.2);
      this.verticalAxis = -1;
    } else {
      this.vertical = 0;
      this.verticalAxis = 0;
    }

    if (this.inputMap.ArrowLeft) {
      this.horizontal = Scalar.Lerp(this.horizontal, -1, 0.2);
      this.horizontalAxis = -1;
    } else if (this.inputMap.ArrowRight) {
      this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2);
      this.horizontalAxis = 1;
    } else {
      this.horizontal = 0;
      this.horizontalAxis = 0;
    }

    this.dashing = this.inputMap.Shift;
    this.jumping = this.inputMap[' '];
  }

  private _setUpMobile(): void {
    this._ui.jumpBtn.onPointerDownObservable.add(() => {
      this.inputMap[' '] = true;
    });
    this._ui.jumpBtn.onPointerUpObservable.add(() => {
      this.inputMap[' '] = false;
    });

    this._ui.dashBtn.onPointerDownObservable.add(() => {
      this.inputMap.Shift = true;
    });
    this._ui.dashBtn.onPointerUpObservable.add(() => {
      this.inputMap.Shift = false;
    });

    this._ui.leftBtn.onPointerDownObservable.add(() => {
      this.inputMap.ArrowLeft = true;
    });
    this._ui.leftBtn.onPointerUpObservable.add(() => {
      this.inputMap.ArrowLeft = false;
    });

    this._ui.rightBtn.onPointerDownObservable.add(() => {
      this.inputMap.ArrowRight = true;
    });
    this._ui.rightBtn.onPointerUpObservable.add(() => {
      this.inputMap.ArrowRight = false;
    });

    this._ui.upBtn.onPointerDownObservable.add(() => {
      this.inputMap.ArrowUp = true;
    });
    this._ui.upBtn.onPointerUpObservable.add(() => {
      this.inputMap.ArrowUp = false;
    });

    this._ui.downBtn.onPointerDownObservable.add(() => {
      this.inputMap.ArrowDown = true;
    });
    this._ui.downBtn.onPointerUpObservable.add(() => {
      this.inputMap.ArrowDown = false;
    });
  }
}
