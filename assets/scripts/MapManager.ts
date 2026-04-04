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

  tileWidth = 200;
  tileHeight = 100;

  //地图尺寸  200x200
  mapWidth = 200;
  mapHeight = 200;

  //草地渲染网格
  private _mapSprites: Grid[][] = [];
  public get mapSprites(): Grid[][] {
    return this._mapSprites;
  }
  private mapData: string[][] = [];


  //视窗宽度格子数量
  viewWidth = 15;
  //视窗高度格子数量
  viewHeight = 15;

  // 当前视野左下角 tile
  viewStartX = 0;
  viewStartY = 0;

  private atlas: any;

  // 节点缓存（10x10）
  private viewTiles: Grid[][] = [];

  generateMap(atlas) {
    if (!atlas) return;

    this.atlas = atlas;

    const ground = this.node.getChildByName("GroundNode");
    const gridPrefb = GameManager.Instance?.prefabMap?.["Grid"];

    this._mapSprites = [];
    this.viewTiles = [];

    //  先生成地图数据（可以 100x100）
    for (let x = 0; x < this.mapWidth; x++) {
      this.mapData[x] = [];
      for (let y = 0; y < this.mapHeight; y++) {
        this.mapData[x][y] = this.getTileType(x, y);
      }
    }

    //  只创建 10x10 节点
    for (let x = 0; x < this.viewWidth; x++) {
      this.viewTiles[x] = [];

      for (let y = 0; y < this.viewHeight; y++) {
        const tileNode = instantiate(gridPrefb);
        const grid = tileNode.getComponent(Grid);

        grid.gridIndex = new Vec2(x, y);

        tileNode.layer = Layers.Enum.DEFAULT;
        ground.addChild(tileNode);

        this.viewTiles[x][y] = grid;
      }
    }

    // 设置出生点
    const centerX = Math.floor(this.mapWidth / 2);
    const centerY = Math.floor(this.mapHeight / 2);

    const startX = centerX - Math.floor(this.viewWidth / 2);
    const startY = centerY - Math.floor(this.viewHeight / 2);
    //设置初始位置
    this.updateView(startX, startY);

    // ⭐把“tile坐标 → 世界坐标”
    const posX = ((centerX - centerY) * this.tileWidth) / 2;
    const posY = ((centerX + centerY) * this.tileHeight) / 2;

    // ⭐出生点放在地图中心tile
    GameManager.Instance.initSpawn(new Vec3(posX, posY));
  }

  updateView(startX: number, startY: number) {
    this.viewStartX = startX;
    this.viewStartY = startY;

    let nodes: Node[] = [];

    for (let x = 0; x < this.viewWidth; x++) {
      for (let y = 0; y < this.viewHeight; y++) {
        let worldX = startX + x;
        let worldY = startY + y;

        const grid = this.viewTiles[x][y];
        const node = grid.node;

        // 越界保护
        if (
          worldX < 0 ||
          worldY < 0 ||
          worldX >= this.mapWidth ||
          worldY >= this.mapHeight
        ) {
          node.active = false;
          continue;
        }

        node.active = true;

        grid.WordPos = new Vec2(worldX, worldY);

        const type = this.mapData[worldX][worldY];

        const sprite = node.getComponent(Sprite);

        //  根据地形设置图
        let frameName = "";

        switch (type) {
          case "water":
            frameName = "isometric_grass_tileset_ext_01";
            break;
          case "sand":
            frameName = "isometric_grass_tileset_ext_06";
            break;
          case "grass":
            frameName = "isometric_grass_tileset_ext_08";
            break;
          case "stone":
            frameName = "isometric_grass_tileset_ext_10";
            break;
          default:
            frameName = "isometric_grass_tileset_ext_08"; // 防御
        }

        var spriteFrame = this.atlas.getSpriteFrame(frameName);
        if (!spriteFrame) {
          console.warn(`SpriteFrame not found: ${frameName}`);
        } else {
          sprite.spriteFrame = spriteFrame;
        }

        const posX = ((worldX - worldY) * this.tileWidth) / 2;
        const posY = ((worldX + worldY) * this.tileHeight) / 2;

        node.setPosition(posX, posY);

        // ⭐记录“世界排序值”（关键！！）
        (node as any)._order = worldX + worldY;

        nodes.push(node);
      }
    }

    nodes.sort((a, b) => {
      return (b as any)._order - (a as any)._order;
    });

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].setSiblingIndex(i);
    }
  }

  //地图坐标转TileIndex
  worldToTile(pos: Vec3) {
    const halfW = this.tileWidth / 2;
    const halfH = this.tileHeight / 2;

    const tx = (pos.x / halfW + pos.y / halfH) / 2;
    const ty = (pos.y / halfH - pos.x / halfW) / 2;

    return {
      x: Math.floor(tx),
      y: Math.floor(ty),
    };
  }
  updateMap(playerPos) {
    const tile = this.worldToTile(playerPos);
    const newStartX = tile.x - Math.floor(this.viewWidth / 2);
    const newStartY = tile.y - Math.floor(this.viewHeight / 2);
    if (newStartX !== this.viewStartX || newStartY !== this.viewStartY) {
      this.updateView(newStartX, newStartY);
    }
  }

  /**
   * Hash 随机（基础）
   * @param x
   * @param y
   * @param seed
   * @returns
   */
  rand(x: number, y: number, seed: number) {
    let n = x * 374761393 + y * 668265263 + seed * 1447;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) & 0xff) / 255;
  }

  lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  /**
   * 平滑插值（重点）
   * @param x
   * @param y
   * @param seed
   * @returns
   */
  smoothNoise(x: number, y: number, seed: number) {
    let ix = Math.floor(x);
    let iy = Math.floor(y);

    let fx = x - ix;
    let fy = y - iy;

    let v00 = this.rand(ix, iy, seed);
    let v10 = this.rand(ix + 1, iy, seed);
    let v01 = this.rand(ix, iy + 1, seed);
    let v11 = this.rand(ix + 1, iy + 1, seed);

    let vx0 = this.lerp(v00, v10, fx);
    let vx1 = this.lerp(v01, v11, fx);

    return this.lerp(vx0, vx1, fy);
  }

  /**
   * 3. 多层噪声（地形关键）
   * @param x
   * @param y
   * @param seed
   * @returns
   */
  noise(x: number, y: number, seed: number) {
    let v = 0;

    let scale = 0.03; // ⭐ 比你原来更大块

    v += this.smoothNoise(x * scale, y * scale, seed) * 0.6;
    v += this.smoothNoise(x * scale * 2, y * scale * 2, seed) * 0.3;
    v += this.smoothNoise(x * scale * 4, y * scale * 4, seed) * 0.1;

    return v;
  }

  getTileType(x: number, y: number) {
    let v = this.noise(x, y, 12345);

    if (v < 0.35) return "water";
    if (v < 0.45) return "sand";
    if (v < 0.75) return "grass";
    return "stone";
  }
}
