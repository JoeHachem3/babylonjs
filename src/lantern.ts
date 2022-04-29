import {
  AnimationGroup,
  Color3,
  Color4,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PBRMetallicRoughnessMaterial,
  PointLight,
  Scene,
  Texture,
  Vector3,
} from '@babylonjs/core';

export class Lantern {
  private _scene: Scene;
  private _lightMtl: PBRMetallicRoughnessMaterial;
  public mesh: Mesh;
  private _lightSphere: Mesh;
  public isLit: boolean = false;
  private _spinAnim: AnimationGroup;
  private _light: PointLight;
  private _stars: ParticleSystem;

  constructor(
    lightMtl: PBRMetallicRoughnessMaterial,
    mesh: Mesh,
    scene: Scene,
    position: Vector3,
    animationGroups: AnimationGroup
  ) {
    this._scene = scene;
    this._lightMtl = lightMtl;

    this._loadLantern(mesh, position);

    this._loadStars();

    this._spinAnim = animationGroups;

    const light = new PointLight(
      'lantern light',
      this.mesh.getAbsolutePosition(),
      this._scene
    );
    light.intensity = 0;
    light.radius = 2;
    light.diffuse = new Color3(0.45, 0.56, 0.8);
    this._light = light;

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

    this._stars.start();
    this._spinAnim.play();
    this.mesh.material = this._lightMtl;
    this._light.intensity = 30;
  }

  private _findNearestMeshes(light: PointLight): void {
    if (this.mesh.name.includes('14') || this.mesh.name.includes('15')) {
      light.includedOnlyMeshes.push(
        this._scene.getMeshByName('festivalPlatform1')
      );
    } else if (this.mesh.name.includes('16') || this.mesh.name.includes('17')) {
      light.includedOnlyMeshes.push(
        this._scene.getMeshByName('festivalPlatform2')
      );
    } else if (this.mesh.name.includes('18') || this.mesh.name.includes('19')) {
      light.includedOnlyMeshes.push(
        this._scene.getMeshByName('festivalPlatform3')
      );
    } else if (this.mesh.name.includes('20') || this.mesh.name.includes('21')) {
      light.includedOnlyMeshes.push(
        this._scene.getMeshByName('festivalPlatform4')
      );
    }

    this._scene
      .getTransformNodeByName(this.mesh.name + 'lights')
      .getChildMeshes()
      .forEach((mesh) => {
        light.includedOnlyMeshes.push(mesh);
      });
  }

  private _loadStars(): void {
    const particleSystem = new ParticleSystem('stars', 1000, this._scene);

    particleSystem.particleTexture = new Texture(
      './textures/solidStar.png',
      this._scene
    );
    particleSystem.emitter = new Vector3(
      this.mesh.position.x,
      this.mesh.position.y + 1.5,
      this.mesh.position.z
    );
    particleSystem.createPointEmitter(
      new Vector3(0.6, 1, 0),
      new Vector3(0, 1, 0)
    );
    particleSystem.color1 = new Color4(1, 1, 1);
    particleSystem.color2 = new Color4(1, 1, 1);
    particleSystem.colorDead = new Color4(1, 1, 1, 1);
    particleSystem.emitRate = 12;
    particleSystem.minEmitPower = 14;
    particleSystem.maxEmitPower = 14;
    particleSystem.addStartSizeGradient(0, 2);
    particleSystem.addStartSizeGradient(1, 0.8);
    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = 2;
    particleSystem.addDragGradient(0, 0.7, 0.7);
    particleSystem.targetStopDuration = 0.25;

    this._stars = particleSystem;
  }
}
