import { _decorator, Component, Node } from "cc";
const { ccclass, property } = _decorator;

@ccclass("UIManager")
export class UIManager extends Component {
  constructor() {
    super();
    UIManager._instance = this;
  }
  private static _instance: UIManager = null;
  // 只能通过自身进行初始化
  public static get Instance() {
    if (this._instance == null) {
      //获取单例失败
      console.error("获取UIManager单例失败");
    }
    return this._instance;
  }

  start() {}

  update(deltaTime: number) {}
}
