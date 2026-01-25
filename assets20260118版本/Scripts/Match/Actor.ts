import { _decorator, Component, Node, Label, Sprite, Tween, tween, Vec3, UITransform } from 'cc';
import { ActorState } from '../Constants'; // 导入单位状态枚举
const { ccclass, property } = _decorator;

/**
 * @class Actor
 * @extends Component
 * @description 战场单位（Actor）的基类。
 *              负责管理所有战场单位（如卡牌、英雄）的基础属性和行为，
 *              包括血量、攻击力、名称、视觉表现以及通用的生命周期管理。
 */
@ccclass('Actor')
export class Actor extends Component {

    /**
     * @property nameLabel
     * @type {Label}
     * @description 单位名称的文本标签，通过编辑器关联。
     */
    @property(Label)
    nameLabel: Label | null = null;

    /**
     * @property hpLabel
     * @type {Label}
     * @description 单位血量文本标签，通过编辑器关联。
     */
    @property(Label)
    hpLabel: Label | null = null;

    /**
     * @property attackLabel
     * @type {Label}
     * @description 单位攻击力文本标签，通过编辑器关联。
     */
    @property(Label)
    attackLabel: Label | null = null;

    /**
     * @property visual
     * @type {Sprite}
     * @description 单位的主要视觉表现，通常是一个Sprite组件，通过编辑器关联。
     */
    @property(Sprite)
    visual: Sprite | null = null;

    public maxHp: number = 0; // 最大血量
    private _hp: number = 0;   // 当前血量，私有属性
    private _attack: number = 0; // 当前攻击力，私有属性
    protected _state: ActorState = ActorState.Normal; // 单位当前状态 (正常/死亡)

    /**
     * @property state
     * @description 获取或设置单位的当前状态。
     *              改为 getter/setter 以便子类可以重写它。
     */
    get state() { return this._state; }
    set state(val: ActorState) { this._state = val; }

    /**
     * @property hp
     * @description 获取或设置单位的当前血量。
     *              设置血量时会自动更新 `hpLabel` 的显示，并在血量归零时触发 `die` 方法。
     */
    get hp() { return this._hp; }
    set hp(val: number) {
        this._hp = val;
        // 确保血量显示不为负数，并向下取整
        if (this.hpLabel) this.hpLabel.string = Math.max(0, Math.floor(this._hp)).toString();
        // 如果血量归零且单位未处于死亡状态，则触发死亡逻辑
        if (this._hp <= 0 && this.state !== ActorState.Dead) {
            this.die();
        }
    }

    /**
     * @property attack
     * @description 获取或设置单位的攻击力。
     *              设置攻击力时会自动更新 `attackLabel` 的显示，并向下取整。
     */
    get attack() { return this._attack; }
    set attack(val: number) {
        this._attack = val;
        if (this.attackLabel) this.attackLabel.string = Math.floor(this._attack).toString();
    }

    /**
     * @method init
     * @description 初始化单位的基本属性和UI显示。
     * @param name 单位名称。
     * @param hp 单位血量。
     * @param attack 单位攻击力。
     */
    init(name: string, hp: number, attack: number) {
        this.maxHp = hp;      // 设置最大血量
        this.hp = hp;         // 设置当前血量 (会触发setter更新UI)
        this.attack = attack; // 设置攻击力 (会触发setter更新UI)
        if (this.nameLabel) this.nameLabel.string = name; // 更新名称UI
        this.state = ActorState.Normal; // 设置为正常状态
        this.node.active = true;     // 激活节点
        this.node.setScale(1, 1, 1); // 重置缩放
    }

    /**
     * @method die
     * @description 处理单位的死亡逻辑。
     *              将单位状态设置为死亡，并播放一个简单的淡出/缩小动画。
     */
    die() {
        this.state = ActorState.Dead; // 设置单位为死亡状态
        // 播放一个简单的缩小动画，模拟死亡淡出效果
        tween(this.node)
            .to(0.5, { scale: new Vec3(0, 0, 1) }) // 0.5秒内缩放至不可见
            .call(() => {
                this.node.active = false; // 动画结束后禁用节点
            })
            .start();
    }

    /**
     * @method animateAttack
     * @description 播放单位的攻击动画。
     *              单位会向目标位置移动，执行回调，然后返回原位。
     * @param targetPos 攻击目标的世界坐标。
     * @param callback 攻击动画到达目标位置时执行的回调函数（通常用于触发伤害计算）。
     */
    animateAttack(targetPos: Vec3, callback: Function) {
        const parentUITransform = this.node.parent?.getComponent(UITransform);
        if (!parentUITransform) {
            console.error("Attacker's parent node must have a UITransform component.");
            callback();
            return;
        }

        const localTargetPos = parentUITransform.convertToNodeSpaceAR(targetPos);
        const originalPos = this.node.position.clone();
        const originalIndex = this.node.getSiblingIndex();

        // Bring to front for the animation
        this.node.setSiblingIndex(999);

        tween(this.node)
            .to(0.2, { position: localTargetPos }, { easing: 'backIn' })
            .call(() => {
                if(callback) callback();
            })
            .to(0.2, { position: originalPos }, { easing: 'quadOut' })
            .call(() => {
                // Restore original render order
                this.node.setSiblingIndex(originalIndex);
            })
            .start();
    }
}
