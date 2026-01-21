
// PlayerProfile.ts
// 玩家信息档案UI组件

import { _decorator, Component, Node, Label, Sprite, SpriteFrame, Color, ProgressBar } from 'cc';
const { ccclass, property } = _decorator;

/**
 * @interface IPlayerData
 * @description 规范传入 `PlayerProfile` 组件的玩家数据结构。
 *              这有助于代码的可读性和类型安全。
 */
interface IPlayerData {
    name: string; // 玩家或对手的名称
    avatarSpriteFrame: SpriteFrame | null; // 头像的 SpriteFrame 资源
    currentHp: number; // 当前血量
    maxHp: number; // 最大血量
    currentAtk: number; // 当前攻击力
    isEnemy: boolean; // 是否为对手，用于区分样式或布局
}

/**
 * @class PlayerProfile
 * @extends Component
 * @description 负责显示玩家或对手的UI档案信息，例如名称、头像、血量和攻击力。
 *              通过数据驱动，根据传入的数据动态更新UI显示。
 */
@ccclass('PlayerProfile')
export class PlayerProfile extends Component {
    /**
     * @property avatarSprite
     * @type {Sprite}
     * @description 玩家头像的 Sprite 组件。通过编辑器拖拽关联。
     */
    @property({ type: Sprite })
    public avatarSprite: Sprite | null = null;

    /**
     * @property nameLabel
     * @type {Label}
     * @description 玩家名称的 Label 组件。通过编辑器拖拽关联。
     */
    @property({ type: Label })
    public nameLabel: Label | null = null;

    /**
     * @property hpLabel
     * @type {Label}
     * @description 血量文本的 Label 组件 (例如 "HP:20")。通过编辑器拖拽关联。
     */
    @property({ type: Label })
    public hpLabel: Label | null = null;

    /**
     * @property atkLabel
     * @type {Label}
     * @description 攻击力文本的 Label 组件 (例如 "4")。通过编辑器拖拽关联。
     */
    @property({ type: Label })
    public atkLabel: Label | null = null;

    // 可选: 如果您想使用 ProgressBar 来显示血条，可以在编辑器中关联此属性
    // @property({ type: ProgressBar })
    // public hpProgressBar: ProgressBar | null = null;

    private _maxHp: number = 0; // 内部存储最大血量，用于血量百分比计算

    /**
     * @method init
     * @description 初始化玩家或对手的UI档案显示。
     * @param playerData 包含玩家所有数据的对象，遵循 `IPlayerData` 接口。
     */
    public init(playerData: IPlayerData) {
        this.updateName(playerData.name);
        this.updateAvatar(playerData.avatarSpriteFrame);
        this._maxHp = playerData.maxHp; // 存储最大血量
        this.updateHp(playerData.currentHp);
        this.updateAtk(playerData.currentAtk);

        // 根据是否为对手，进行一些额外的样式调整
        if (playerData.isEnemy) {
            if (this.nameLabel) this.nameLabel.color = Color.RED; // 例如，对手名称显示为红色
            // 如果有更复杂的样式，可以在这里调用其他方法或直接修改组件
        } else {
            if (this.nameLabel) this.nameLabel.color = Color.WHITE; // 例如，玩家名称显示为白色
        }
    }

    /**
     * @method updateName
     * @description 更新玩家或对手的名称显示。
     * @param name 要显示的名称字符串。
     */
    public updateName(name: string) {
        if (this.nameLabel) {
            this.nameLabel.string = name;
        }
    }

    /**
     * @method updateAvatar
     * @description 更新玩家或对手的头像图片。
     * @param spriteFrame 头像的 SpriteFrame 资源。
     */
    public updateAvatar(spriteFrame: SpriteFrame | null) {
        if (this.avatarSprite && spriteFrame) {
            this.avatarSprite.spriteFrame = spriteFrame;
        }
    }

    /**
     * @method updateHp
     * @description 更新玩家或对手的血量显示。
     * @param currentHp 当前血量值。
     */
    public updateHp(currentHp: number) {
        if (this.hpLabel) {
            this.hpLabel.string = `HP:${currentHp}`;
            // 可以根据血量百分比改变文本颜色，例如血量较低时变红
            if (this._maxHp > 0 && currentHp / this._maxHp < 0.3) {
                 this.hpLabel.color = Color.RED;
            } else if (this._maxHp > 0) {
                 // 重置颜色，例如白色或默认色
                 // this.hpLabel.color = Color.WHITE;
            }
        }
        // 如果使用了 ProgressBar，在这里更新进度条显示
        // if (this.hpProgressBar && this._maxHp > 0) {
        //     this.hpProgressBar.progress = currentHp / this._maxHp;
        // }
    }

    /**
     * @method updateAtk
     * @description 更新玩家或对手的攻击力显示。
     * @param currentAtk 当前攻击力值。
     */
    public updateAtk(currentAtk: number) {
        if (this.atkLabel) {
            this.atkLabel.string = `${currentAtk}`; // 假设只显示数字
        }
    }

    // --- Cocos Creator 生命周期方法 (根据需要使用) ---
    // onLoad() {
    //     // 组件加载时执行，可用于获取挂载节点上的其他组件
    // }

    // start() {
    //     // 在第一次更新前执行，可用于测试脚本功能或初始设置
    //     // 示例调试代码：
    //     // if (true) { // 启用调试模式
    //     //     this.init({
    //     //         name: '测试玩家',
    //     //         avatarSpriteFrame: null, // 需要手动在编辑器中拖拽SpriteFrame到avatarSprite属性
    //     //         currentHp: 15,
    //     //         maxHp: 20,
    //     //         currentAtk: 5,
    //     //         isEnemy: false
    //     //     });
    //     // }
    // }
}
