import { _decorator, Component, Node, Vec3, UITransform, EventTouch } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Joystick')
export class Joystick extends Component {

    @property(Node)
    stick: Node = null;

    @property
    radius: number = 100;

    private dir = new Vec3(0, 0, 0);

    start() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(event: EventTouch) {
        this.updateStick(event);
    }

    onTouchMove(event: EventTouch) {
        this.updateStick(event);
    }

    onTouchEnd() {
        this.stick.setPosition(0, 0, 0);
        this.dir.set(0, 0, 0);
    }

    updateStick(event: EventTouch) {
        let pos = event.getUILocation();

        let ui = this.node.getComponent(UITransform);
        let localPos = ui.convertToNodeSpaceAR(new Vec3(pos.x, pos.y, 0));

        let len = Math.sqrt(localPos.x * localPos.x + localPos.y * localPos.y);

        if (len > this.radius) {
            localPos.x = localPos.x / len * this.radius;
            localPos.y = localPos.y / len * this.radius;
        }

        this.stick.setPosition(localPos);

        // 👉 归一化方向
        this.dir.set(localPos.x, localPos.y, 0).normalize();


        //console.log("设置Joystick:",this.dir);
        
    }

    getDirection(): Vec3 {
        return this.dir;
    }
}