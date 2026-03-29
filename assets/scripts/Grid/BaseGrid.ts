import { _decorator, Component, Label, Node, Vec2 } from "cc";
const { ccclass, property } = _decorator;

@ccclass("BaseGrid")
export class BaseGrid extends Component {
  constructor() {
    super();
  }

  //位置索引
  private _gridIndex: Vec2 = null;
  public set gridIndex(v: Vec2) {
    this._gridIndex = v;
  }

  public showIndexLabel(ishow) {
    var labNode = this.node.getChildByName("indexLab");
    if (labNode && ishow) {
      var lc = labNode.getComponent(Label);
      if (lc && this._gridIndex) {
        lc.string = this._gridIndex.x + "--" + this._gridIndex.y;
      }
    }
  }

  public get value(): Vec2 {
    return this._gridIndex;
  }

  start() {}

  update(deltaTime: number) {}
}
