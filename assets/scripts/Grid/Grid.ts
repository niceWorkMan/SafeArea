import { _decorator, Component, Node } from 'cc';
import { BaseGrid } from './BaseGrid';
const { ccclass, property } = _decorator;
/**
 * 当前预制体一定要设置成default 不能使用2d_UI
 */
@ccclass('Grid')
export class Grid extends BaseGrid {
    start() {

    }

    update(deltaTime: number) {
        
    }
}


