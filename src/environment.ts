import {
  AbstractMesh,
  MeshBuilder,
  Scene,
  SceneLoader,
  Vector3,
} from '@babylonjs/core';

export class Environment {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  async load(): Promise<void> {
    const assets = await this._loadAsset();

    assets.allMeshes.forEach((mesh) => {
      mesh.receiveShadows = true;
      mesh.checkCollisions = true;
    });
  }

  private async _loadAsset(): Promise<{
    env: AbstractMesh;
    allMeshes: AbstractMesh[];
  }> {
    const result = await SceneLoader.ImportMeshAsync(
      null,
      './models/',
      'envSetting.glb',
      this._scene
    );

    let env = result.meshes[0];
    let allMeshes = env.getChildMeshes();

    return { env, allMeshes };
  }
}
