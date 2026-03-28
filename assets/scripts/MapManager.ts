import {
  _decorator,
  assetManager,
  Component,
  Layers,
  log,
  math,
  Node,
  resources,
  Sprite,
  SpriteAtlas,
} from "cc";
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

  mapWidth = 10;
  mapHeight = 10;

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

    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        let tileNode = new Node();
        let sprite = tileNode.addComponent(Sprite);
        //设置元素默认不是UI层
        tileNode.layer = Layers.Enum.DEFAULT;

        var randex = math.randomRangeInt(1, 9);
        // 👉 图集里的名字
        sprite.spriteFrame = atlas.getSpriteFrame(
          "isometric_grass_normal_tileset_0" + randex
        );

        // 👉 坐标转换
        let posX = ((x - y) * this.tileWidth) / 2;
        let posY = ((x + y) * this.tileHeight) / 2;

        tileNode.setPosition(posX, -posY); // 注意Y轴反向

        ground.addChild(tileNode);
      }
    }
  }
}
