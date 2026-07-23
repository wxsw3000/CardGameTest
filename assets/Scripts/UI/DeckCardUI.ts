/**
 * @file DeckCardUI.ts
 * @description Component for a single card in the Deck Adjustment UI.
 *              It handles drag-and-drop interactions.
 */

import { _decorator, Component, Node, EventTouch, Vec3, UITransform, Label, resources, SpriteFrame, Sprite, Event, isValid, tween, Layout } from 'cc';
import { IStaticCardData } from '../Engine/Data/CardData'; // Adjusted path for the current project

const { ccclass, property } = _decorator;

@ccclass('DeckCardUI')
export class DeckCardUI extends Component {

    @property(Label)
    nameLabel: Label = null;

    @property({ tooltip: "Controls whether this card can be dragged. False by default for battlefield cards and heroes." })
    enableDrag: boolean = false;

    private _instanceId: number = -1;
    private _fromLane: 'left' | 'mid' | 'right' = 'left';
    private _originalParent: Node = null;
    private _originalPos: Vec3 = new Vec3();
    private _originalSiblingIndex: number = 0;
    private _isDragging = false;

    public get instanceId(): number { return this._instanceId; }

    public get fromLane(): 'left' | 'mid' | 'right' { return this._fromLane; }
    public set fromLane(value: 'left' | 'mid' | 'right') { this._fromLane = value; }

    public init(cardData: IStaticCardData, instanceId: number, fromLane: 'left' | 'mid' | 'right') {
        this._instanceId = instanceId;
        this._fromLane = fromLane;

        if (this.nameLabel) this.nameLabel.string = cardData.cardName;
    }

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this); // TOUCH_CANCEL also ends drag
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
    }

    onDestroy() {
        if (this.node && isValid(this.node)) {
            this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
            this.node.off(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
            this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
            this.node.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        }
    }

    private _onTouchStart(event: EventTouch) {
        if (!this.enableDrag || this._isDragging) return;
        this._isDragging = true;
        
        this._originalParent = this.node.parent;
        this._originalPos.set(this.node.position);
        this._originalSiblingIndex = this.node.getSiblingIndex();

        // Step 1: Insert a placeholder node into original parent to hold the slot so remaining cards do NOT move at all
        if (this._originalParent && isValid(this._originalParent)) {
            let placeholder = this._originalParent.getChildByName('CardDragPlaceholder');
            if (placeholder) placeholder.destroy();

            placeholder = new Node('CardDragPlaceholder');
            const uiTrans = placeholder.addComponent(UITransform);
            const myUITrans = this.node.getComponent(UITransform);
            if (uiTrans && myUITrans) {
                uiTrans.setContentSize(myUITrans.width, myUITrans.height);
            }
            placeholder.setScale(this.node.scale);
            placeholder.setPosition(this._originalPos);

            this._originalParent.addChild(placeholder);
            placeholder.setSiblingIndex(this._originalSiblingIndex);
        }

        let rootNode = this.node.scene.getChildByName('Canvas');
        if (rootNode) {
             rootNode.addChild(this.node);
        } else {
             if (this.node.parent && this.node.parent.parent && this.node.parent.parent.parent) {
                this.node.parent.parent.parent.addChild(this.node);
            }
        }
       
        this.updateCardPositionToTouch(event);

        // Visual feedback: slightly enlarge during drag
        this.node.setScale(0.75, 0.75, 1.0);

        const dragStartEvent = new Event('card-drag-start', true);
        (dragStartEvent as any).detail = {
            instanceId: this._instanceId,
            fromLane: this._fromLane
        };
        this.node.dispatchEvent(dragStartEvent);
    }

    private _onTouchMove(event: EventTouch) {
        if (!this._isDragging) return;
        this.updateCardPositionToTouch(event);

        const dragMoveEvent = new Event('card-drag-move', true);
        (dragMoveEvent as any).detail = {
            instanceId: this._instanceId,
            fromLane: this._fromLane,
            worldPosition: this.node.worldPosition
        };
        this.node.dispatchEvent(dragMoveEvent);
    }

    /**
     * Converts screen touch location to local position in parent (Canvas) using convertToNodeSpaceAR.
     */
    private updateCardPositionToTouch(event: EventTouch) {
        const parent = this.node.parent;
        if (!parent) return;

        const parentUITrans = parent.getComponent(UITransform);
        if (parentUITrans) {
            const touchLoc = event.getUILocation();
            const localPos = parentUITrans.convertToNodeSpaceAR(new Vec3(touchLoc.x, touchLoc.y, 0));
            this.node.setPosition(localPos);
        }
    }

    private _onTouchEnd(event: EventTouch) {
        if (!this._isDragging) return;
        this._isDragging = false;

        const dragEndEvent = new Event('card-drag-end', true);
        this.node.dispatchEvent(dragEndEvent);

        const customEvent = new Event('card-dropped', true);
        (customEvent as any).detail = {
            instanceId: this._instanceId,
            fromLane: this._fromLane,
            dropPosition: this.node.worldPosition,
            originalParent: this._originalParent,
            originalPos: this._originalPos.clone(),
            originalSiblingIndex: this._originalSiblingIndex
        };
        this.node.dispatchEvent(customEvent);
    }
}
