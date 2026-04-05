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
  private mapData: TileType[][] = [];

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

  fixTileWithBase(baseMap: TileType[][], x: number, y: number): TileType {
    const tile = baseMap[x][y];
  
    const neighbors = [
      baseMap[x]?.[y + 1],
      baseMap[x + 1]?.[y],
      baseMap[x]?.[y - 1],
      baseMap[x - 1]?.[y],
    ].filter((v) => v !== undefined);
  
    const nearWater = neighbors.some((t) => t === TileType.Water);
    const nearGrass = neighbors.some((t) => t === TileType.Grass);
  
    // ===== 1. 沼泽：只在 水+草 之间生成 =====
    if (tile === TileType.Grass && nearWater) {
      const r = this.rand(x, y, 888);
      if (r < 0.3) return TileType.Swamp;
    }
  
    // ===== 2. 禁止 水 紧挨 石头 =====
    if (tile === TileType.Water) {
      const nearStone = neighbors.some((t) => t === TileType.Stone);
      if (nearStone) return TileType.Swamp; // 👉 变缓冲层
    }
  
    // ===== 3. 禁止 石头 靠水 =====
    if (tile === TileType.Stone && nearWater) {
      return TileType.Grass; // 👉 或者 Swamp
    }
  
    return tile;
  }
  generateMap(atlas) {
    if (!atlas) return;

    this.atlas = atlas;

    const ground = this.node.getChildByName("GroundNode");
    const gridPrefb = GameManager.Instance?.prefabMap?.["Grid"];

    this._mapSprites = [];
    this.viewTiles = [];

    // 第一遍：只生成 base
    let baseMap: TileType[][] = [];

    for (let x = 0; x < this.mapWidth; x++) {
      baseMap[x] = [];
      for (let y = 0; y < this.mapHeight; y++) {
        baseMap[x][y] = this.getBaseTile(x, y);
      }
    }

    // 第二遍：再修正
    for (let x = 0; x < this.mapWidth; x++) {
      this.mapData[x] = [];

      for (let y = 0; y < this.mapHeight; y++) {
        this.mapData[x][y] = this.fixTileWithBase(baseMap, x, y);
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

        const sprite = node.getComponent(Sprite);

        const type = this.mapData[worldX][worldY];
        const key = this.getTileKey(type); // ✅ 转成string
        let frameName = this.getRandomFrame(key, worldX, worldY);

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
  noise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  // getBaseTile(x: number, y: number): TileType {
  //   // 大地形（决定区域）
  //   const macro = this.smoothNoise(x * 0.02, y * 0.02, 100);

  //   // 小变化（增加细节）
  //   const detail = this.smoothNoise(x * 0.08, y * 0.08, 200);

  //   const n = macro * 0.8 + detail * 0.2;

  //   if (n < 0.35) return TileType.Water;
  //   if (n < 0.5) return TileType.Grass;
  //   if (n < 0.7) return TileType.Stone;
  //   return TileType.Desert;
  // }

  pickByRate(x: number, y: number): TileType {
    const r = this.rand(x, y, 12345); // ✅ 真·均匀随机

    const water = 0.15;
    const desert = 0.15;
    const grass = 0.5;
    const stone = 0.2;

    if (r < water) return TileType.Water;
    if (r < water + desert) return TileType.Desert;
    if (r < water + desert + grass) return TileType.Grass;
    return TileType.Stone;
  }

  getBiome(x: number, y: number): number {
    return this.smoothNoise(x * 0.01, y * 0.01, 999); // 超低频
  }

  getBaseTile(x: number, y: number): TileType {
    // ===== 1. 中心保护 =====
    const centerX = this.mapWidth / 2;
    const centerY = this.mapHeight / 2;

    const dx = x - centerX;
    const dy = y - centerY;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    const distFactor = dist / maxDist;

    // ===== 2. 中心区域（强制草地）=====
    if (distFactor < 0.2) {
      return TileType.Grass;
    }

    // ===== 3. 大区块（让地图成片）=====
    const biome = this.getBiome(x, y);

    // 👉 控制：哪里更容易出什么
    if (biome < 0.3) {
      // 水区（但不是全水）
      return this.rand(x, y, 1) < 0.6 ? TileType.Water : TileType.Swamp;
    }

    if (biome < 0.5) {
      return TileType.Desert;
    }

    if (biome < 0.8) {
      return TileType.Grass;
    }

    // 石头区
    return this.rand(x, y, 2) < 0.7 ? TileType.Stone : TileType.Grass;
  }
  getNeighbors(x: number, y: number): TileType[] {
    const dirs = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];

    const list: TileType[] = [];

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (this.mapData[nx] && this.mapData[nx][ny] !== undefined) {
        list.push(this.mapData[nx][ny]);
      }
    }

    return list;
  }

  getTileSprite(type: TileType): string {
    switch (type) {
      case TileType.Grass:
        return "grass";
      case TileType.Stone:
        return "stone";
      case TileType.Desert:
        return "desert";
      case TileType.Water:
        return "water";
      case TileType.Swamp:
        return "swamp";
    }
  }

  fixTile(x: number, y: number, tile: TileType): TileType {
    const neighbors = this.getNeighbors(x, y);

    const nearWater = neighbors.some((t) => t === TileType.Water);
    const nearDesert = neighbors.some((t) => t === TileType.Desert);

    // 🌊 水不能靠沙漠
    if (tile === TileType.Water && nearDesert) {
      return TileType.Stone;
    }

    // 🐊 沼泽：必须靠水
    if (tile !== TileType.Water && nearWater) {
      return TileType.Swamp;
    }

    // 🏜️ 沙漠：不能靠水
    if (tile === TileType.Desert && nearWater) {
      return TileType.Grass;
    }

    return tile;
  }

  getTileKey(type: TileType): string {
    switch (type) {
      case TileType.Grass:
        return "grass";
      case TileType.Stone:
        return "stone";
      case TileType.Desert:
        return "sand";
      case TileType.Water:
        return "water";
      case TileType.Swamp:
        return "swamp";
    }
  }

  /**
   * 定义配置
   */
  private tileConfig: Record<string, { frame: string; weight: number }[]> = {
    water: [
      { frame: "isometric_lake_water_08", weight: 70 },
      { frame: "isometric_lake_water_04", weight: 30 },
    ],

    swamp: [
      { frame: "isometric_swamp_tileset_03", weight: 70 },
      { frame: "isometric_swamp_tileset_06", weight: 30 },
    ],

    sand: [{ frame: "isometric_desert_tileset_12", weight: 100 }],

    grass: [
      { frame: "isometric_grass_tileset_ext_09", weight: 70 },
      { frame: "isometric_grass_tileset_ext_04", weight: 30 },
    ],

    stone: [
      { frame: "isometric_stone_tileset_11", weight: 70 },
      { frame: "isometric_stone_tileset_03", weight: 30 },
    ],
  };

  /**
   * 权重随机函数
   * @param type
   * @param x
   * @param y
   * @returns
   */
  getRandomFrame(type: string, x: number, y: number) {
    const list = this.tileConfig[type];
    if (!list || list.length === 0) return "";

    //  用坐标做“稳定随机”（保证同一格不会跳变）
    const r = this.rand(x, y, 9999); // 0~1

    let total = 0;
    for (let i = 0; i < list.length; i++) {
      total += list[i].weight;
    }

    let acc = 0;
    for (let i = 0; i < list.length; i++) {
      acc += list[i].weight / total;
      if (r <= acc) {
        return list[i].frame;
      }
    }

    return list[0].frame;
  }
}

enum TileType {
  Grass = 0,
  Stone = 1,
  Desert = 2,
  Water = 3,
  Swamp = 4,
}
