/**
 * @file DeckCardUI.ts
 * @description Component for a single card in the Deck Adjustment UI.
 *              It handles drag-and-drop interactions.
 */

import { _decorator, Component, Node, EventTouch, Vec3, UITransform, Label, resources, SpriteFrame, Sprite, Event } from 'cc';
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
    private _isDragging = false;

    public get instanceId(): number { return this._instanceId; }

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

    private _onTouchStart(event: EventTouch) {
        if (!this.enableDrag || this._isDragging) return;
        this._isDragging = true;
        
        this._originalParent = this.node.parent;
        this._originalPos.set(this.node.position);

        // Move to top layer to render above other UI
        // Assuming GameManager is the scene root's parent or a top-level node.
        // A more robust solution might be to explicitly have a 'DragLayer' node
        // but for now, moving it to its grandparent's parent is an approximation.
        // If the prefab hierarchy is CardDeck -> Lane -> Card, then node.parent.parent would be CardDeck,
        // and node.parent.parent.parent would be the Scene root or another common parent.
        // This needs to be carefully handled to avoid errors if the hierarchy changes.
        // For now, let's simplify to move to the root of the current scene.
        let rootNode = this.node.scene.getChildByName('Canvas'); // Common root node in Cocos Creator scenes
        if (rootNode) {
             rootNode.addChild(this.node);
        } else {
             console.warn("Could not find 'Canvas' node to move card to for dragging. Check scene hierarchy.");
             // Fallback to original logic if Canvas is not found
             if (this.node.parent && this.node.parent.parent && this.node.parent.parent.parent) {
                this.node.parent.parent.parent.addChild(this.node);
            }
        }
       
        this.node.setWorldPosition(event.getUILocation().x, event.getUILocation().y, 0);

        // Optional: visual feedback
        this.node.setScale(1.1, 1.1, 1);
    }

    private _onTouchMove(event: EventTouch) {
        if (!this._isDragging) return;
        this.node.setWorldPosition(event.getUILocation().x, event.getUILocation().y, 0);
    }

    private _onTouchEnd(event: EventTouch) {
        if (!this._isDragging) return;
        this._isDragging = false;

        // Reset visual feedback to standard full 1.0 scale
        this.node.setScale(1.0, 1.0, 1.0);

        const customEvent = new Event('card-dropped', true);

        (customEvent as any).detail = {
            instanceId: this._instanceId,
            fromLane: this._fromLane,
            dropPosition: this.node.worldPosition,
            returnToOrigin: () => {
                this._originalParent.addChild(this.node);
                this.node.setPosition(this._originalPos);
                this.node.setScale(1.0, 1.0, 1.0);
            }
        };
        (customEvent as any).propagationStopped = false;
        (customEvent as any).propagationImmediateStopped = false;

        this.node.dispatchEvent(customEvent);
    }
}
