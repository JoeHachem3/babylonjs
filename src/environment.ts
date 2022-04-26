import { MeshBuilder, Scene, Vector3 } from '@babylonjs/core';

export class Environment {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  async load() {
    const ground = MeshBuilder.CreateBox('ground', { size: 24 }, this._scene);
    ground.scaling = new Vector3(1, 0.02, 1);
  }
}
