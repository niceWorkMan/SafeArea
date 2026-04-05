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

enum TileType {
  Grass = 0,
  Stone = 1,
  Desert = 2,
  Water = 3,
  Swamp = 4,

  DeepWater = 5,
  GrassDense = 6,
  GrassDirt = 7,
  Rock = 8,
  deepSand = 9,
}

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


  terrainConfig = {
    scale: {
      biome: 0.02,      // ⭐ 放大（不然没水）
      moisture: 0.02,
      detail: 0.05,
      rock: 0.02,
    },
  };


  terrainRules = [
   // 🌊 小水块（优先）
   {
    type: TileType.Water,
    cond: (b) => b < 0.25, // 小水块 -> 改成 0.25 保证触发
  },

  // 🐊 沼泽（湿地区）
  {
    type: TileType.Swamp,
    cond: (b, m) => b < 0.6 && m > 0.6,
  },

  // 🌊 深水（大块水域）
  {
    type: TileType.DeepWater,
    cond: (b, m, d, r) => b < 0.5 && d > 0.8,
  },

  
    // ===== 🌿 水岸缓冲（非常关键）=====
    {
      type: TileType.Grass,
      cond: (b) => b < 0.48,
    },
  
    // ===== 🐊 沼泽（只在草区）=====
    {
      type: TileType.Swamp,
      cond: (b, m) => b < 0.25 && m > 0.85,
    },
  
    // ===== 🏜 沙漠 =====
    {
      type: TileType.Desert,
      cond: (b, m) => b < 0.7 && m < 0.35,
    },
  
    // ===== 🌿 草地细分 =====
    {
      type: TileType.GrassDense,
      cond: (b, m, d) => b < 0.8 && d > 0.7,
    },
    {
      type: TileType.GrassDirt,
      cond: (b, m, d) => b < 0.8 && d < 0.3,
    },
  
    // ===== 🌱 草 =====
    {
      type: TileType.Grass,
      cond: (b) => b < 0.85,
    },
  
    // ===== 🪨 石头（限制区域！！）=====
    {
      type: TileType.Rock,
      cond: (b, m, d, r) => b > 0.7 && r > 0.7,
    },
  
    // ===== fallback =====
    {
      type: TileType.Stone,
      cond: () => true,
    },
  ];
  //草地渲染网格
  private _mapSprites: Grid[][] = [];
  public get mapSprites(): Grid[][] {
    return this._mapSprites;
  }
  private mapData: TileType[][] = [];

  //视窗宽度格子数量
  viewWidth = 20;
  //视窗高度格子数量
  viewHeight = 20;

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
  
    const nearWater = neighbors.some(
      (t) => t === TileType.Water || t === TileType.DeepWater
    );
  
    // 只做一件事：草边变沼泽
    if (tile === TileType.Grass && nearWater) {
      const n = this.smoothNoise(x * 0.1, y * 0.1, 777);
      if (n > 0.7) return TileType.Swamp;
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
        console.log("type检查:", type);

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
    const cfg = this.terrainConfig;
  
    // ===== 中心保护（缩小范围，否则看不到水）=====
    const cx = this.mapWidth / 2;
    const cy = this.mapHeight / 2;
  
    const dx = x - cx;
    const dy = y - cy;
  
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.sqrt(cx * cx + cy * cy);
  
    if (dist / maxDist < 0.1) { // ⭐ 从 0.2 改 0.1
      return TileType.Grass;
    }
  
    // ===== 噪声 =====
    const b = this.smoothNoise(x * cfg.scale.biome, y * cfg.scale.biome, 1);
    const m = this.smoothNoise(x * cfg.scale.moisture, y * cfg.scale.moisture, 2);
    const d = this.smoothNoise(x * cfg.scale.detail, y * cfg.scale.detail, 3);
    const r = this.smoothNoise(x * cfg.scale.rock, y * cfg.scale.rock, 4);
  
    // ===== 调试（可开）=====
    // if (x % 50 === 0 && y % 50 === 0) console.log("b:", b);
  
    // ===== 规则驱动 =====
    for (let i = 0; i < this.terrainRules.length; i++) {
      const rule = this.terrainRules[i];
      if (rule.cond(b, m, d, r)) {
        return rule.type;
      }
    }
  
    return TileType.Grass;
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

      case TileType.DeepWater:
        return "deepWater";
      case TileType.deepSand:
        return "deepSand";
      case TileType.GrassDense:
        return "grassDense";
      case TileType.GrassDirt:
        return "grassDirt";
      case TileType.Rock:
        return "rock";

      default:
        console.error("非法TileType:", type);
        return "grass";
    }
  }

  /**
   * 定义配置
   */
  private tileConfig: Record<string, { frame: string; weight: number }[]> = {
    water: [{ frame: "isometric_lake_water_08", weight: 100 }],
    deepWater: [{ frame: "isometric_lake_water_04", weight: 100 }],

    swamp: [
      { frame: "isometric_swamp_tileset_03", weight: 70 },
      { frame: "isometric_swamp_tileset_06", weight: 30 },
    ],

    sand: [{ frame: "isometric_desert_tileset_12", weight: 100 }],
    deepSand: [{ frame: "isometric_desert_tileset_11", weight: 100 }],

    grass: [{ frame: "isometric_grass_tileset_ext_01", weight: 100 }],
    grassDense: [{ frame: "isometric_grass_tileset_ext_02", weight: 100 }],
    grassDirt: [{ frame: "isometric_grass_tileset_ext_05", weight: 100 }],

    stone: [{ frame: "isometric_stone_tileset_11", weight: 100 }],
    rock: [{ frame: "isometric_stone_tileset_03", weight: 100 }],
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
