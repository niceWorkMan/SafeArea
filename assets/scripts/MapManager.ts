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

  start() {}

  update(deltaTime: number) {}

  tileWidth = 200 * 2;
  tileHeight = 100 * 2;

  //地图尺寸  200x149

  mapWidth = 20;
  mapHeight = 20;

  //草地渲染网格
  private _mapSprites: Grid[][] = [];
  public get mapSprites(): Grid[][] {
    return this._mapSprites;
  }

  generateMap(atlas) {
    if (!atlas) {
      console.error("generateMap: atlas is undefined!");
      return;
    }

    // 地形层
    const ground = this.node.getChildByName("GroundNode");
    if (!ground) {
      console.error("generateMap: GroundNode not found!");
      return;
    }

    const gridPrefb = GameManager.Instance?.prefabMap?.["Grid"];
    if (!gridPrefb) {
      console.error("generateMap: Grid prefab not loaded!");
      return;
    }

    this._mapSprites = [];

    for (let x = 0; x < this.mapWidth; x++) {
      this._mapSprites[x] = [];
      for (let y = 0; y < this.mapHeight; y++) {
        const tileNode = instantiate(gridPrefb);
        if (!tileNode) {
          console.warn(`instantiate failed at ${x},${y}`);
          continue;
        }

        const grid = tileNode.getComponent(Grid);
        if (!grid) {
          console.warn(`Grid component missing at ${x},${y}`);
          continue;
        }

        grid.gridIndex = new Vec2(x, y);

        const sprite = tileNode.getComponent(Sprite);
        if (!sprite) {
          console.warn(`Sprite component missing at ${x},${y}`);
        } else {
          var randex = math.random() > 0.2 ? 1 : math.randomRangeInt(1, 9);
          const frameName = "isometric_grass_tileset_0" + randex;
          const spriteFrame = atlas.getSpriteFrame(frameName);
          if (!spriteFrame) {
            console.warn(`SpriteFrame not found: ${frameName}`);
          } else {
            sprite.spriteFrame = spriteFrame;
          }
        }

        // 坐标转换
        const posX = ((x - y) * this.tileWidth) / 2;
        const posY = ((x + y) * this.tileHeight) / 2;
        tileNode.setPosition(posX, -posY);

        tileNode.layer = Layers.Enum.DEFAULT;
        ground.addChild(tileNode);

        grid.showIndexLabel(true);
        this._mapSprites[x][y] = grid;
      }
    }

    // 设置镜头 Character 和初始位置
    const CenerIndex = new Vec2(
      Math.floor(this.mapWidth / 2),
      Math.floor(this.mapHeight / 2)
    );

    const _firstGrid = this._mapSprites[0]?.[0];
    const centerGrid = this._mapSprites[CenerIndex.x]?.[CenerIndex.y];

    console.log("CenerIndex:", CenerIndex);

    if (!_firstGrid || !centerGrid) {
      console.error("generateMap: invalid _mapSprites grid!");
      return;
    }

    GameManager.Instance.initSpawn(centerGrid.node.position);
  }
}
