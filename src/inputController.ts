import {
  ActionManager,
  ExecuteCodeAction,
  Scalar,
  Scene,
} from '@babylonjs/core';

export class PlayerInput {
  inputMap: { [key: string]: boolean };
  vertical: number = 0;
  verticalAxis: number = 0;
  horizontal: number = 0;
  horizontalAxis: number = 0;
  dashing: boolean = false;
  jumping: boolean = false;

  constructor(scene: Scene) {
    scene.actionManager = new ActionManager(scene);

    this.inputMap = {};
    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (e) => {
        this.inputMap[e.sourceEvent.key] = e.sourceEvent.type == 'keydown';
      })
    );
    scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (e) => {
        this.inputMap[e.sourceEvent.key] = e.sourceEvent.type == 'keydown';
      })
    );

    scene.onBeforeRenderObservable.add(() => {
      this._updateFromKeyboard();
    });
  }

  private _updateFromKeyboard() {
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
    } else if (this.inputMap['ArrowRight']) {
      this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2);
      this.horizontalAxis = 1;
    } else {
      this.horizontal = 0;
      this.horizontalAxis = 0;
    }

    this.dashing = this.inputMap.Shift;
    this.jumping = this.inputMap[' '];
  }
}
