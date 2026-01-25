/**
 * @file DeckCardUI.ts
 * @description Component for a single card in the Deck Adjustment UI.
 *              It handles drag-and-drop interactions.
 */

import { _decorator, Component, Node, EventTouch, Vec3, UITransform, Label, resources, SpriteFrame, Sprite, Event } from 'cc';
import { IStaticCardData } from '../Engine/Data/CardData';

const { ccclass, property } = _decorator;

@ccclass('DeckCardUI')
export class DeckCardUI extends Component {

    @property(Label)
    nameLabel: Label = null;



    private _instanceId: number = -1;
    private _fromLane: 'left' | 'mid' | 'right' = 'left';
    private _originalParent: Node = null;
    private _originalPos: Vec3 = new Vec3();
    private _isDragging = false;

    public get instanceId(): number { return this._instanceId; }

    public init(cardData: IStaticCardData, instanceId: number, fromLane: 'left' | 'mid' | 'right') {
        this._instanceId = instanceId;
        this._fromLane = fromLane;

        if (this.nameLabel) this.nameLabel.string = cardData.cardName;
        // Cost is no longer displayed as per user request
      


    }

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    private _onTouchStart(event: EventTouch) {
        if (this._isDragging) return;
        this._isDragging = true;
        
        this._originalParent = this.node.parent;
        this._originalPos.set(this.node.position);

        // Move to top layer to render above other UI
        this.node.parent.parent.parent.addChild(this.node);
        this.node.setWorldPosition(event.getUILocation().x, event.getUILocation().y, 0);

        // Optional: visual feedback
        this.node.setScale(1.1, 1.1);
    }

    private _onTouchMove(event: EventTouch) {
        if (!this._isDragging) return;
        this.node.setWorldPosition(event.getUILocation().x, event.getUILocation().y, 0);
    }

    private _onTouchEnd(event: EventTouch) {
        if (!this._isDragging) return;
        this._isDragging = false;

        // Reset visual feedback
        this.node.setScale(1, 1);

        // 创建一个标准的 cc.Event 对象
        const customEvent = new Event('card-dropped', true); // 'card-dropped' 是事件名称, true 表示冒泡

             // 手动将 custom data 赋值给事件对象的 detail 属性
             // 注意：这里使用了类型断言 as any 来规避 TypeScript 对 Event 类型的严格检查
             (customEvent as any).detail = {
                 instanceId: this._instanceId,
                fromLane: this._fromLane,
                 dropPosition: this.node.worldPosition,
                returnToOrigin: () => {
                    this._originalParent.addChild(this.node);
                    this.node.setPosition(this._originalPos);
                }
            };
            // GameManager 的 onCardDropped 中使用了 propagationStopped，也需要手动设置
            (customEvent as any).propagationStopped = false;
            (customEvent as any).propagationImmediateStopped = false;
   
            this.node.dispatchEvent(customEvent);


        // const customEvent = new EventCustom('card-dropped', true); // true for bubbles
        // customEvent.setUserData({
        //     instanceId: this._instanceId,
        //     fromLane: this._fromLane,
        //     dropPosition: this.node.worldPosition,
        //     returnToOrigin: () => {
        //         this._originalParent.addChild(this.node);
        //         this.node.setPosition(this._originalPos);
        //     }
        // });
        // this.node.dispatchEvent(customEvent);
    }
}
