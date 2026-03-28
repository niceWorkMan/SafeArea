import {
  _decorator,
  AnimationClip,
  assetManager,
  AssetManager,
  Component,
  instantiate,
  JsonAsset,
  Node,
  Prefab,
  resources,
  Vec3,
} from "cc";
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
    const bundle = await this.loadBundle(bundleUrl);
    this.netResBundle = bundle;

    //执行加载完所有东西后执行初始化
    this.initGame();
  }

  private initGame() {
    this.initSpawn();
  }

  private initSpawn() {
    //地形层
    var c_layer = this.node.getChildByName("PawnActNode");
    console.log(
      "this.prefabMap:",
      this.prefabMap,
      this.prefabMap["userCharactor"]
    );

    var userCha = instantiate(this.prefabMap["userCharactor"]);
    c_layer.addChild(userCha);
    userCha.setPosition(new Vec3(0, 0, 0));
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

  private async loadBundle(name: string): Promise<AssetManager.Bundle> {
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
