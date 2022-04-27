import {
  AnimationGroup,
  Color3,
  Mesh,
  MeshBuilder,
  PBRMetallicRoughnessMaterial,
  PointLight,
  Scene,
  Vector3,
} from '@babylonjs/core';

export class Lantern {
  private _scene: Scene;
  private _lightMtl: PBRMetallicRoughnessMaterial;
  public mesh: Mesh;
  private _lightSphere: Mesh;
  public isLit: boolean = false;

  constructor(
    lightMtl: PBRMetallicRoughnessMaterial,
    mesh: Mesh,
    scene: Scene,
    position: Vector3,
    animationGroups?: AnimationGroup
  ) {
    this._scene = scene;
    this._lightMtl = lightMtl;

    this._lightSphere = MeshBuilder.CreateSphere(
      'illum',
      { segments: 4, diameter: 20 },
      this._scene
    );
    this._lightSphere.scaling.y = 2;
    this._lightSphere.setAbsolutePosition(position);
    this._lightSphere.parent = mesh;
    this._lightSphere.isVisible = false;
    this._lightSphere.isPickable = false;

    this._loadLantern(mesh, position);

    const light = new PointLight(
      'lantern light',
      this.mesh.getAbsolutePosition(),
      this._scene
    );
    light.intensity = 30;
    light.radius = 2;
    light.diffuse = new Color3(0.45, 0.56, 0.8);
    this._findNearestMeshes(light);
  }

  private _loadLantern(mesh: Mesh, position: Vector3): void {
    this.mesh = mesh;
    this.mesh.scaling = new Vector3(0.8, 0.8, 0.8);
    this.mesh.setAbsolutePosition(position);
    this.mesh.isPickable = false;
  }

  public setEmissiveTexture(): void {
    this.isLit = true;
    this.mesh.material = this._lightMtl;
  }

  private _findNearestMeshes(light: PointLight): void {
    this._scene
      .getMeshByName('__root__')
      .getChildMeshes()
      .forEach((mesh) => {
        if (this._lightSphere.intersectsMesh(mesh))
          light.includedOnlyMeshes.push(mesh);
      });
    this._lightSphere.dispose();
  }
}
