import {
  _decorator,
  AnimationClip,
  assetManager,
  AssetManager,
  Component,
  director,
  instantiate,
  JsonAsset,
  log,
  Node,
  Prefab,
  resources,
  SpriteAtlas,
  Vec2,
  Vec3,
} from "cc";
import { Charctor } from "./Pawn/Charctor";
import { MapManager } from "./MapManager";
const { ccclass, property } = _decorator;

@ccclass("GameManager")
export class GameManager extends Component {
  constructor() {
    super();
    GameManager._instance = this;
  }
  private static _instance: GameManager = null;
  // 只能通过自身进行初始化
  public static get Instance() {
    if (this._instance == null) {
      //获取单例失败
      console.error("获取GameManager单例失败");
    }
    return this._instance;
  }

  start() {
    this.initGameConfig();
  }

  private async initGameConfig() {
    const prifabPathAsset = await this.loadJson("config/prefabsList");
    this.prefabPaths = prifabPathAsset.json;
    //加载bund
    const bundleUrl = "netRes";
    // 1. 加载 bundle
    const bundle = await this.loadAllBundle("netRes");
    this.netResBundle = bundle;

    // 2. 加载 atlas
    const atlas: SpriteAtlas = await new Promise((resolve, reject) => {
      bundle.load(
        "atlas/ground/isometric_grass_ext",
        SpriteAtlas,
        (err, atlas) => {
          if (err) reject(err);
          else {
            resolve(atlas);
            console.log("加载成功");
          }
        }
      );
    });

    // 3. prefab 已经加载完成，atlas 也准备好了，可以生成地图
    MapManager.Instance.generateMap(atlas);

    //执行加载完所有东西后执行初始化
    this.initGame();
  }

  private initGame() {
    //this.initSpawn(new Vec2())
  }

  /**
   *
   * @param spawnPos 人物生成格子位置
   * @param orginPos 屏幕中心 00位置
   */
  public initSpawn(spawnPos: Vec3) {
    //地形层
    var c_layer = this.node.getChildByName("PawnActNode");
    console.log(
      "this.prefabMap:",
      this.prefabMap,
      this.prefabMap["userCharactor"]
    );

    var userCha = instantiate(this.prefabMap["userCharactor"]);
    c_layer.addChild(userCha);
    userCha.setPosition(Vec3.ZERO);

    //设置差量位置 等待charator start函数处理
    var charctor = userCha.getComponent(Charctor);
    charctor._spawnPos = spawnPos;
  }

  update(deltaTime: number) {}

  private prefabPaths; //配置Prefab的Json
  private animclipPaths; //配置动画Clip的Json
  private _npcCof; //npc配置
  public get npcCof() {
    return this._npcCof;
  }

  //存储prefab
  private _prefabMap = {};
  private set prefabMap(v) {
    this._prefabMap = v;
  }
  public get prefabMap() {
    return this._prefabMap;
  }

  //存储资源
  private _netResBundle;
  public set netResBundle(v: any) {
    this._netResBundle = v;
  }
  public get netResBundle() {
    return this._netResBundle;
  }

  //动画存储
  private _animClipMap = {};
  private set animClipMap(v) {
    this._animClipMap = v;
  }

  private loadJson(path: string): Promise<JsonAsset> {
    return new Promise((resolve, reject) => {
      resources.load(path, JsonAsset, (err, jsonAsset) => {
        if (err || !jsonAsset) {
          reject(err);
        } else {
          resolve(jsonAsset);
        }
      });
    });
  }

  /**
   * 加载所有任务
   * @param name 
   * @returns 
   */
  private async loadAllBundle(name: string): Promise<AssetManager.Bundle> {
    try {
      const bundle = await this.loadBundleAsync(name);
      // 合并所有加载操作：prefab 和 animation clip
      const loadTasks: Promise<void>[] = [
        ...this.prefabPaths.map((path) => this.loadPrefabAsync(bundle, path)),
        // ...this.animclipPaths.map((path) =>
        //   this.loadAnimationClipAsync(bundle, path)
        // ),
      ];

      await Promise.all(loadTasks); // 等待所有资源加载完成
      console.log("All prefabs and animation clips loaded successfully");

      return bundle;
    } catch (err) {
      console.error("Error loading bundle:", err);
      throw err;
    }
  }

  // 异步加载 bundle
  private loadBundleAsync(name: string): Promise<AssetManager.Bundle> {
    return new Promise((resolve, reject) => {
      assetManager.loadBundle(name, (err, bundle) => {
        if (err || !bundle) {
          reject(err);
        } else {
          resolve(bundle);
        }
      });
    });
  }

  // 异步加载单个 prefab
  private loadPrefabAsync(
    bundle: AssetManager.Bundle,
    path: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      bundle.load(path, Prefab, (err, prefab) => {
        if (err) {
          reject(err);
        } else {
          const dicName =
            path.indexOf("/") === -1 ? path : path.split("/").pop() || "";
          this.prefabMap[dicName] = prefab;
          console.log("存储prefab->" + dicName + "  成功");
          resolve(); // 加载成功
        }
      });
    });
  }

  //异步加载动画
  private loadAnimationClipAsync(
    bundle: AssetManager.Bundle,
    path: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      bundle.load(path, AnimationClip, (err, clip) => {
        if (err) {
          reject(err);
        } else {
          const dicName =
            path.indexOf("/") === -1 ? path : path.split("/").pop() || "";
          this.animClipMap[dicName] = clip;
          resolve();
        }
      });
    });
  }
}
