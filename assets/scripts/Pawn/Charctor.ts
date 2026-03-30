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
/**
 * 当前预制体一定要设置成default 不能使用2d_UI
 */
export class Charctor extends BasePawn {
  @property(Node)
  joystickNode: Node = null;
  speed = 500;

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
    //设置
    this.node.position = this._spawnPos
  }

  update(deltaTime: number) {
    if (this.joystick != null) {
      this.updatePosition(deltaTime);
    } else {
      console.error("没有找到joystick组件");
    }
  }



  private followSpeed: number = 5;         // 相机跟随速度

  updatePosition(deltaTime: number) {
    const dir = this.joystick.getDirection();
    if (dir.length() > 0.1) {
      const move = new Vec3(
        dir.x * this.speed * deltaTime,
        dir.y * this.speed * deltaTime,
        0
      );
      //更新pawn移动
      this.node.position = this.node.position.clone().add(move)


    }

    // ===== 相机永远追玩家=====
    const targetPos = this.node.worldPosition;
    const currentPos = this.cameraNode.worldPosition.clone();
    //阻尼跟随
    const t = 1 - Math.exp(-this.followSpeed * deltaTime);
    const newPos = currentPos.lerp(targetPos, t);
    //设置相机位置
    this.cameraNode.setWorldPosition(newPos);
  }

  protected lateUpdate(deltaTime: number) { }
}
