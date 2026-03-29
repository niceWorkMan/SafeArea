import {
  _decorator,
  Component,
  director,
  instantiate,
  log,
  Node,
  Vec2,
  Vec3,
} from "cc";
import { BasePawn } from "./BasePawn";
import { UIManager } from "../UI/UIManager";
import { GameManager } from "../GameManager";
const { ccclass, property } = _decorator;

@ccclass("Charctor")
export class Charctor extends BasePawn {
  @property(Node)
  joystickNode: Node = null;
  speed = 200;

  cameraNode: Node = null;

  public _spawnPos: Vec3 = null;

  private joystick: any;
  start() {
    const scene = director.getScene();
    this.cameraNode = scene.getChildByName("mainCamera");
    this.joystick = UIManager.Instance.node
      .getChildByName("Joystick")
      .getComponent("Joystick");

    //设置镜头初始位置
    this.cameraNode.setWorldPosition(
      this.node.worldPosition.add(this._spawnPos)
    );
  }

  update(deltaTime: number) {
    if (this.joystick != null) {
      this.updatePosition(deltaTime);
    } else {
      console.error("没有找到joystick组件");
    }
  }

  updatePosition(deltaTime: number) {
    const dir = this.joystick.getDirection();
    if (dir.length() > 0) {
      const move = new Vec3(
        dir.x * this.speed * deltaTime,
        dir.y * this.speed * deltaTime,
        0
      );
      // Player 和 Charactor 移动
      this.cameraNode.setWorldPosition(this.node.worldPosition.add(move));
    }
  }

  protected lateUpdate(deltaTime: number) {}
}
