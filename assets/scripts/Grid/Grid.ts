import { _decorator, Component, Node, Vec2 } from "cc";
import { BaseGrid } from "./BaseGrid";
const { ccclass, property } = _decorator;
/**
 * 当前预制体一定要设置成default 不能使用2d_UI
 */
@ccclass("Grid")
export class Grid extends BaseGrid {
  start() {}

  update(deltaTime: number) {}

  private wordPos: Vec2 = new Vec2();
  public set WordPos(v: Vec2) {
    this.wordPos = v;
  }

  public get WordPos(): Vec2 {
    return this.wordPos;
  }
}
