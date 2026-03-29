import {
  _decorator,
  assetManager,
  Component,
  instantiate,
  Layers,
  log,
  math,
  Node,
  resources,
  Sprite,
  SpriteAtlas,
  Vec2,
  Vec3,
} from "cc";
import { GameManager } from "./GameManager";
import { Grid } from "./Grid/Grid";
const { ccclass, property } = _decorator;

@ccclass("MapManager")
export class MapManager extends Component {
  constructor() {
    super();
    MapManager._instance = this;
  }
  private static _instance: MapManager = null;
  // 只能通过自身进行初始化
  public static get Instance() {
    if (this._instance == null) {
      //获取单例失败
      console.error("获取MapManager单例失败");
    }
    return this._instance;
  }

  start() {
    this.loadAtlas();
  }

  update(deltaTime: number) {}

  tileWidth = 190;
  tileHeight = 115;

  //地图尺寸  200x149

  mapWidth = 20;
  mapHeight = 20;

  //草地渲染网格
  private _mapSprites: Grid[][] = [];
  public get mapSprites(): Grid[][] {
    return this._mapSprites;
  }

  loadAtlas() {
    assetManager.loadBundle("netRes", (err, bundle) => {
      bundle.load(
        "atlas/ground/isometric_grass_normal",
        SpriteAtlas,
        (err, atlas) => {
          this.generateMap(atlas);

          console.log("加载成功");
        }
      );
    });
  }

  generateMap(atlas) {
    //地形层
    var ground = this.node.getChildByName("GroundNode");
    var gridPrefb = GameManager.Instance.prefabMap["Grid"];

    for (let x = 0; x < this.mapWidth; x++) {
      this._mapSprites[x] = new Array<Grid>(this.mapHeight); // 每行一个数组
      for (let y = 0; y < this.mapHeight; y++) {
        let tileNode = instantiate(gridPrefb);
        var grid = tileNode.getComponent(Grid);
        //标记索引
        grid.gridIndex = new Vec2(x, y);
        let sprite = tileNode.getComponent(Sprite);
        //设置到数值
        this._mapSprites[x][y] = grid;
        //设置元素默认不是UI层
        tileNode.layer = Layers.Enum.DEFAULT;

        var randex = math.randomRangeInt(1, 9);
        // 图集里的名字
        sprite.spriteFrame = atlas.getSpriteFrame(
          "isometric_grass_normal_tileset_0" + randex
        );

        // 👉 坐标转换
        let posX = ((x - y) * this.tileWidth) / 2;
        let posY = ((x + y) * this.tileHeight) / 2;

        tileNode.setPosition(posX, -posY); // 注意Y轴反向

        ground.addChild(tileNode);
        //展示索引
        grid.showIndexLabel(true);
      }
    }

    // //设置镜头Charactor和镜头的初始位置
    var CenerIndex = new Vec2(
      Math.floor(this.mapWidth / 2),
      Math.floor(this.mapHeight / 2)
    );
    var _firstPos = this._mapSprites[0][0].node.position;
    var CenterPos = this._mapSprites[CenerIndex.x][CenerIndex.y].node.position;
    GameManager.Instance.initSpawn(CenterPos, _firstPos);

  }
}
