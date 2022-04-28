import {
  AbstractMesh,
  ActionManager,
  AnimationGroup,
  Color3,
  ExecuteCodeAction,
  Mesh,
  PBRMetallicRoughnessMaterial,
  Scene,
  SceneLoader,
  Texture,
  TransformNode,
} from '@babylonjs/core';
import { Player } from './characterController';
import { Firework } from './firework';
import { Lantern } from './lantern';

export class Environment {
  private _scene: Scene;
  private _lanternObjs: Lantern[] = [];
  private _fireworkObjs: Firework[] = [];
  private _lightMtl: PBRMetallicRoughnessMaterial;
  private _startFireworks: boolean = false;

  constructor(scene: Scene) {
    this._scene = scene;

    this._lightMtl = new PBRMetallicRoughnessMaterial(
      'lantern mesh light',
      this._scene
    );
    this._lightMtl.emissiveTexture = new Texture(
      './textures/litLantern.png',
      this._scene,
      true,
      false
    );
    this._lightMtl.emissiveColor = new Color3(
      0.8784313725490196,
      0.7568627450980392,
      0.6235294117647059
    );
  }

  async load(): Promise<void> {
    const assets = await this._loadAsset();

    assets.allMeshes.forEach((mesh) => {
      mesh.receiveShadows = true;
      mesh.checkCollisions = true;

      if (mesh.name === 'ground') {
        mesh.checkCollisions = false;
        mesh.isPickable = false;
      }

      if (
        mesh.name.includes('stairs') ||
        mesh.name == 'cityentranceground' ||
        mesh.name == 'fishingground.001' ||
        mesh.name.includes('lilyflwr')
      ) {
        mesh.checkCollisions = false;
        mesh.isPickable = false;
      }

      if (mesh.name.includes('collision')) {
        mesh.isVisible = false;
        mesh.isPickable = true;
      }

      if (mesh.name.includes('Trigger')) {
        mesh.isVisible = false;
        mesh.isPickable = false;
        mesh.checkCollisions = false;
      }
    });

    assets.lantern.isVisible = false;
    const lanternHolder = new TransformNode('lanternHolder', this._scene);

    for (let i = 0; i < 22; i++) {
      const lanternInstance = assets.lantern.clone('lantern' + i);
      lanternInstance.isVisible = true;
      lanternInstance.setParent(lanternHolder);

      const animGroupClone = new AnimationGroup('lanternAnimGroup ' + i);
      animGroupClone.addTargetedAnimation(
        assets.animationGroups.targetedAnimations[0].animation,
        lanternInstance
      );

      const newLantern = new Lantern(
        this._lightMtl,
        lanternInstance,
        this._scene,
        assets.env
          .getChildTransformNodes(false)
          .find((mesh) => mesh.name === 'lantern ' + i)
          .getAbsolutePosition(),
        animGroupClone
      );
      this._lanternObjs.push(newLantern);
    }

    assets.lantern.dispose();
    assets.animationGroups.dispose();
  }

  private async _loadAsset(): Promise<{
    env: AbstractMesh;
    allMeshes: AbstractMesh[];
    lantern: Mesh;
    animationGroups: AnimationGroup;
  }> {
    const envResult = await SceneLoader.ImportMeshAsync(
      null,
      './models/',
      'envSetting.glb',
      this._scene
    );

    let env = envResult.meshes[0];
    let allMeshes = env.getChildMeshes();

    const lanternResult = await SceneLoader.ImportMeshAsync(
      '',
      './models/',
      'lantern.glb',
      this._scene
    );
    const lantern = lanternResult.meshes[0].getChildren()[0];
    lantern.parent = null;
    lanternResult.meshes[0].dispose();

    const importedAnims = lanternResult.animationGroups;
    const animation = importedAnims[0].targetedAnimations[0].animation;
    importedAnims[0].dispose();
    const animGroup = new AnimationGroup('lanternAnimGroup');
    animGroup.addTargetedAnimation(animation, lanternResult.meshes[1]);

    for (let i = 0; i < 20; i++) {
      this._fireworkObjs.push(new Firework(this._scene, i));
    }

    this._scene.onBeforeRenderObservable.add(() => {
      if (this._startFireworks)
        this._fireworkObjs.forEach((firework) => firework.startFirework());
    });

    return {
      env,
      allMeshes,
      lantern: lantern as Mesh,
      animationGroups: animGroup,
    };
  }

  public checkLanterns(player: Player): void {
    if (!this._lanternObjs[0].isLit) this._lanternObjs[0].setEmissiveTexture();

    this._lanternObjs.forEach((lantern) => {
      player.mesh.actionManager.registerAction(
        new ExecuteCodeAction(
          {
            trigger: ActionManager.OnIntersectionEnterTrigger,
            parameter: lantern.mesh,
          },
          () => {
            if (!lantern.isLit && player.sparkLit) {
              player.lanternsLit += 1;
              lantern.setEmissiveTexture();
              player.sparkReset = true;
              player.sparkLit = true;

              player.lightSfx.play();
            } else if (lantern.isLit) {
              player.sparkReset = true;
              player.sparkLit = true;

              player.sparkResetSfx.play();
            }
          }
        )
      );
    });
  }
}
