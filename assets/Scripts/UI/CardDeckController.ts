import { _decorator, Component, Node, Vec3, Layout, UITransform, Color, isValid, EventTouch, Event, Prefab, Button, instantiate, Sprite, Widget, resources, Graphics, SpriteFrame, tween, Label, find } from 'cc';

import { CardDatabase, IStaticCardData, IDeckData } from '../Engine/Data/CardData';
import { DeckCardUI } from './DeckCardUI'; // UI component for individual cards in the deck adjustment UI
import { Card } from '../Match/Card/Card';
import { SafeAreaAdapter } from '../Framework/UI/SafeAreaAdapter';

const { ccclass, property } = _decorator;

// This interface is to describe the runtime card data that CardDeckController manages
interface CardDataInstance {
    staticId: number; // Use staticId for data lookup from CardDatabase
    instanceId: number; // Unique ID for this card instance in game state
    currentLane: 'left' | 'mid' | 'right';
    node: Node | null; // Reference to the instantiated card Node
}

@ccclass('CardDeckController')
export class CardDeckController extends Component {

    @property(Node)
    leftLaneNode: Node = null;

    @property(Node)
    midLaneNode: Node = null;

    @property(Node)
    rightLaneNode: Node = null;

    @property({ type: Sprite })
    leftLaneSprite: Sprite = null;

    @property({ type: Sprite })
    midLaneSprite: Sprite = null;

    @property({ type: Sprite })
    rightLaneSprite: Sprite = null;

    @property({ type: Prefab }) // Card prefab to instantiate, linked in editor
    cardPrefab: Prefab = null; 

    // Define colors for highlighting
    private _normalLaneColors: Map<Node, Color> = new Map();
    private _highlightColor: Color = new Color(255, 215, 90, 220); // Warm golden glow for ink aesthetics

    @property(Button)
    confirmButton: Button = null;

    // Store card instances for easy lookup and state management
    private _cardInstances: Map<number, CardDataInstance> = new Map();
    
    // Internal representation of the current player's decks
    private _currentDeckData: IDeckData = {
        left: [],
        mid: [],
        right: []
    };

    private _gameStateCards: Map<number, any> = null;

    onLoad() {
        // 自动初始化与绑定安全区适配层（避留小程序胶囊及异形屏刘海）
        let safeArea = this.getComponent(SafeAreaAdapter);
        if (!safeArea) {
            safeArea = this.addComponent(SafeAreaAdapter);
        }
        safeArea.applySafeArea();

        if (!this.cardPrefab) {
            resources.load('Prefabs/CardPrefab', Prefab, (err, prefab) => {
                if (!err && prefab) {
                    this.cardPrefab = prefab;
                    console.log('CardDeckController: Dynamically loaded CardPrefab fallback.');
                } else {
                    console.error('CardDeckController: cardPrefab is not assigned and fallback load failed!', err);
                }
            });
        }

        this.initLanes();
        this.setupLaneTouchListeners();
        this.setupEventListeners();
        this.node.active = false;
    }

    onDestroy() {
        const canvas = find('Canvas') || this.node?.scene?.getChildByName('Canvas');
        if (canvas && isValid(canvas)) {
            canvas.off('card-dropped', this.onCardDropped, this);
            canvas.off('card-drag-move', this.onCardDragMove, this);
            canvas.off('card-drag-end', this.onCardDragEnd, this);
        }
        if (this.node && isValid(this.node)) {
            this.node.off('card-dropped', this.onCardDropped, this);
            this.node.off('card-drag-move', this.onCardDragMove, this);
            this.node.off('card-drag-end', this.onCardDragEnd, this);
        }
        if (this.confirmButton && isValid(this.confirmButton) && this.confirmButton.node && isValid(this.confirmButton.node)) {
            this.confirmButton.node.off(Button.EventType.CLICK, this._onConfirmButtonClick, this);
        }
        [this.leftLaneNode, this.midLaneNode, this.rightLaneNode].forEach(laneNode => {
            if (laneNode && isValid(laneNode)) {
                laneNode.off(Node.EventType.TOUCH_START, this.onLaneTouchStart, this);
                laneNode.off(Node.EventType.TOUCH_END, this.onLaneTouchEnd, this);
                laneNode.off(Node.EventType.TOUCH_CANCEL, this.onLaneTouchCancel, this);
            }
        });
    }

    @property({ tooltip: "Set true to use Option 1 (Vector Graphics), false to use Option 2 (Generated UI Textures)" })
    useVectorGraphics: boolean = false; // Set to false by default to test Option 2

    private _laneVectorStyles: Map<Node, { fillColor: Color; borderColor: Color; highlightColor: Color }> = new Map();

    /**
     * Draws Graphics border overlay on a dedicated node mounted on this.node for lane highlight.
     * Prevents lane's Layout component from offsetting the border or cards.
     */
    private drawLaneGraphics(laneNode: Node, isHighlighted: boolean = false) {
        if (!laneNode || !isValid(laneNode)) return;

        // Clean up any legacy HighlightBorder child inside laneNode that was affected by Layout
        const legacyBorder = laneNode.getChildByName('HighlightBorder');
        if (legacyBorder) {
            legacyBorder.destroy();
        }

        const borderName = `HighlightBorder_${laneNode.name}`;
        let borderNode = this.node.getChildByName(borderName);
        if (!borderNode) {
            borderNode = new Node(borderName);
            this.node.addChild(borderNode);
        }

        let g = borderNode.getComponent(Graphics);
        if (!g) {
            g = borderNode.addComponent(Graphics);
        }
        g.clear();

        if (!isHighlighted) {
            borderNode.active = false;
            return;
        }

        borderNode.active = true;

        // Position borderNode aligned with laneNode's world position
        const rootUITrans = this.node.getComponent(UITransform);
        const laneWorldPos = laneNode.worldPosition;
        if (rootUITrans) {
            const localPos = rootUITrans.convertToNodeSpaceAR(laneWorldPos);
            borderNode.setPosition(localPos);
        } else {
            borderNode.setPosition(laneNode.position);
        }

        const uiTrans = laneNode.getComponent(UITransform);
        const w = uiTrans ? uiTrans.width : 360;
        const h = uiTrans ? uiTrans.height : 640;
        const borderRadius = 16;
        const x = -w / 2;
        const y = -h / 2;

        g.strokeColor = new Color(255, 215, 90, 255); // Vibrant golden glow
        g.lineWidth = 6;
        g.roundRect(x, y, w, h, borderRadius);
        g.stroke();
    }

    /**
     * Initializes lane nodes with Layout components and Option 2 custom UI textures / Option 1 vector graphics.
     */
    private initLanes() {
        const laneConfigs = [
            { 
                node: this.leftLaneNode, 
                imgPath: 'lanePng/lane_blue/spriteFrame',
                basePath: 'lanePng/lane_blue',
                style: { 
                    fillColor: new Color(20, 32, 48, 210), 
                    borderColor: new Color(70, 130, 190, 180),
                    highlightColor: new Color(255, 215, 90, 255)
                } 
            }, 
            { 
                node: this.midLaneNode, 
                imgPath: 'lanePng/lane_gold/spriteFrame',
                basePath: 'lanePng/lane_gold',
                style: { 
                    fillColor: new Color(38, 30, 18, 210), 
                    borderColor: new Color(212, 175, 55, 180),
                    highlightColor: new Color(255, 215, 90, 255)
                } 
            }, 
            { 
                node: this.rightLaneNode, 
                imgPath: 'lanePng/lane_red/spriteFrame',
                basePath: 'lanePng/lane_red',
                style: { 
                    fillColor: new Color(42, 20, 28, 210), 
                    borderColor: new Color(200, 70, 90, 180),
                    highlightColor: new Color(255, 215, 90, 255)
                } 
            } 
        ];

        laneConfigs.forEach(lane => {
            if (lane.node) {
                this._laneVectorStyles.set(lane.node, lane.style);

                let layout = lane.node.getComponent(Layout);
                if (layout) {
                    layout.enabled = false;
                }
                const uiTrans = lane.node.getComponent(UITransform);
                if (uiTrans) {
                    uiTrans.setContentSize(360, 640);
                }

                if (this.useVectorGraphics) {
                    let sp = lane.node.getComponent(Sprite);
                    if (sp) sp.enabled = false;
                    this.drawLaneGraphics(lane.node, false);
                } else {
                    let sp = lane.node.getComponent(Sprite);
                    if (!sp) {
                        sp = lane.node.addComponent(Sprite);
                    }
                    sp.enabled = true;
                    sp.type = Sprite.Type.SIMPLE;
                    sp.sizeMode = Sprite.SizeMode.CUSTOM;

                    resources.load(lane.imgPath, SpriteFrame, (err, sf) => {
                        if (!err && sf) {
                            if (sp && isValid(sp)) {
                                sp.type = Sprite.Type.SIMPLE;
                                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                                sp.spriteFrame = sf;
                                if (uiTrans && isValid(uiTrans)) uiTrans.setContentSize(360, 640);
                            }
                        } else {
                            resources.load(lane.basePath, SpriteFrame, (err2, sf2) => {
                                if (!err2 && sf2 && sp && isValid(sp)) {
                                    sp.type = Sprite.Type.SIMPLE;
                                    sp.sizeMode = Sprite.SizeMode.CUSTOM;
                                    sp.spriteFrame = sf2;
                                    if (uiTrans && isValid(uiTrans)) uiTrans.setContentSize(360, 640);
                                }
                            });
                        }
                    });
                }
            }
        });
    }

    /**
     * Sets up event listeners for lane touches.
     */
    private setupLaneTouchListeners() {
        // Lanes stay fixed
    }

    /**
     * Sets up event listeners for card drag moves, drops, and button clicks.
     * Listens on Canvas root layer to capture events from dragged cards reparented to Canvas.
     */
    private setupEventListeners() {
        if (!this.confirmButton || !isValid(this.confirmButton)) {
            const btnNode = this.node.getChildByName('ConfirmButton');
            if (btnNode) {
                this.confirmButton = btnNode.getComponent(Button);
            }
            if (!this.confirmButton) {
                this.confirmButton = this.getComponentInChildren(Button);
            }
        }

        const canvas = find('Canvas') || this.node?.scene?.getChildByName('Canvas') || this.node;

        if (canvas && isValid(canvas)) {
            canvas.on('card-dropped', this.onCardDropped, this);
            canvas.on('card-drag-move', this.onCardDragMove, this);
            canvas.on('card-drag-end', this.onCardDragEnd, this);
        }
        if (this.node && isValid(this.node) && this.node !== canvas) {
            this.node.on('card-dropped', this.onCardDropped, this);
            this.node.on('card-drag-move', this.onCardDragMove, this);
            this.node.on('card-drag-end', this.onCardDragEnd, this);
        }
        if (this.confirmButton && isValid(this.confirmButton) && this.confirmButton.node && isValid(this.confirmButton.node)) {
            this.confirmButton.node.on(Button.EventType.CLICK, this._onConfirmButtonClick, this);
        }
    }

    /**
     * Handles real-time card drag movement to highlight the hovered lane.
     */
    private onCardDragMove(event: Event) {
        const detail = (event as any).detail;
        if (!detail || !detail.worldPosition) return;

        const worldPos: Vec3 = detail.worldPosition;
        const laneNodes = [this.leftLaneNode, this.midLaneNode, this.rightLaneNode];

        laneNodes.forEach(laneNode => {
            if (laneNode && isValid(laneNode)) {
                const uiTrans = laneNode.getComponent(UITransform);
                const isHovered = uiTrans ? uiTrans.getBoundingBoxToWorld().contains(worldPos) : false;
                this.drawLaneGraphics(laneNode, isHovered);
            }
        });
    }

    /**
     * Resets lane colors when card dragging finishes.
     */
    private onCardDragEnd() {
        this.resetLaneColors();
    }

    /**
     * Resets all lane colors/vector graphics to their normal state.
     */
    private resetLaneColors() {
        [this.leftLaneNode, this.midLaneNode, this.rightLaneNode].forEach(laneNode => {
            if (laneNode) {
                this.drawLaneGraphics(laneNode, false);
            }
        });
    }

    /**
     * Updates top capacity text counters for all lanes (e.g. 左卡道 2/4).
     * Mounts counter nodes on this.node to prevent disrupting horizontal layout centering of lanes.
     */
    private updateLaneCounters() {
        const laneInfo = [
            { name: '左卡道', node: this.leftLaneNode, count: this._currentDeckData.left.length },
            { name: '中卡道', node: this.midLaneNode, count: this._currentDeckData.mid.length },
            { name: '右卡道', node: this.rightLaneNode, count: this._currentDeckData.right.length },
        ];

        const maxCapacity = 4;
        const rootUITrans = this.node.getComponent(UITransform);

        laneInfo.forEach(info => {
            if (!info.node || !isValid(info.node)) return;

            // Clean up any legacy counter node that was added to lane's parent layout container
            if (info.node.parent && info.node.parent !== this.node) {
                const legacy = info.node.parent.getChildByName(`LaneCounter_${info.node.name}`);
                if (legacy) {
                    legacy.destroy();
                }
            }

            const counterName = `LaneCounter_${info.node.name}`;
            let counterNode = this.node.getChildByName(counterName);
            let label: Label = null;

            if (!counterNode) {
                counterNode = new Node(counterName);
                label = counterNode.addComponent(Label);
                label.fontSize = 20;
                label.lineHeight = 24;
                label.color = new Color(255, 225, 120, 255); // Warm ink gold font
                this.node.addChild(counterNode);
            } else {
                label = counterNode.getComponent(Label);
            }

            if (label) {
                label.string = `${info.name} (${info.count}/${maxCapacity})`;
            }

            // Compute top center position of the lane in world space and convert to local space of this.node
            const laneWorldPos = info.node.worldPosition;
            const laneTrans = info.node.getComponent(UITransform);
            const laneHeight = laneTrans ? laneTrans.height : 640;
            const targetWorldPos = new Vec3(laneWorldPos.x, laneWorldPos.y + laneHeight / 2 - 28, laneWorldPos.z + 1);

            if (rootUITrans) {
                const localPos = rootUITrans.convertToNodeSpaceAR(targetWorldPos);
                counterNode.setPosition(localPos);
            } else {
                counterNode.setPosition(targetWorldPos);
            }
        });
    }

    /**
     * Calculates explicit local (X, Y) position for a card at slot index `slotIndex`.
     * Guarantees X = 0 (perfect horizontal centering) and fixed slot Y coordinates.
     */
    public getSlotLocalPosition(slotIndex: number): Vec3 {
        const x = 0; // Explicitly 0 on X axis for 100% horizontal centering in lane
        const startY = 195.25; // Top slot (slot 0) Y coordinate
        const slotDistance = 163.5; // Fixed slot distance (149.5 card height + 14 spacing)
        const y = startY - slotIndex * slotDistance;

        return new Vec3(x, y, 0);
    }

    /**
     * Explicitly positions all cards in all lanes with fixed scale 0.65 and fixed (X=0, Y) slot coordinates.
     * Completely bypasses Layout component auto-positioning for 100% deterministic layout control.
     */
    private adjustLaneLayouts() {
        const lanes: Array<{ key: 'left' | 'mid' | 'right'; node: Node }> = [
            { key: 'left', node: this.leftLaneNode },
            { key: 'mid', node: this.midLaneNode },
            { key: 'right', node: this.rightLaneNode }
        ];

        lanes.forEach(laneInfo => {
            if (!laneInfo.node || !isValid(laneInfo.node)) return;

            // Turn off automatic Cocos Layout component to prevent X/Y layout shifts
            const layout = laneInfo.node.getComponent(Layout);
            if (layout) {
                layout.enabled = false;
            }

            const deckCardIds = this._currentDeckData[laneInfo.key] || [];

            deckCardIds.forEach((cardInstanceId, slotIndex) => {
                const cardInst = this._cardInstances.get(cardInstanceId);
                if (cardInst && cardInst.node && isValid(cardInst.node)) {
                    if (cardInst.node.parent !== laneInfo.node) {
                        cardInst.node.setParent(laneInfo.node);
                    }
                    cardInst.node.setSiblingIndex(slotIndex);

                    // Fixed X=0, fixed Y slot coordinate, fixed 0.65 scale
                    const explicitPos = this.getSlotLocalPosition(slotIndex);
                    cardInst.node.setPosition(explicitPos);
                    cardInst.node.setScale(0.65, 0.65, 1.0);
                }
            });

            // Also check for any CardDragPlaceholder node in lane and position it explicitly
            const placeholder = laneInfo.node.getChildByName('CardDragPlaceholder');
            if (placeholder && isValid(placeholder)) {
                const placeholderIndex = placeholder.getSiblingIndex();
                const placeholderPos = this.getSlotLocalPosition(placeholderIndex);
                placeholder.setPosition(placeholderPos);
                placeholder.setScale(0.65, 0.65, 1.0);
            }
        });
    }

    /**
     * Validates the current deck configuration against game rules.
     */
    public validateDeckState(): { isValid: boolean; reason: string } {
        const leftCount = this._currentDeckData.left.length;
        const midCount = this._currentDeckData.mid.length;
        const rightCount = this._currentDeckData.right.length;
        const totalCount = leftCount + midCount + rightCount;
        const maxLaneCapacity = 4;

        if (totalCount === 0) {
            return { isValid: false, reason: '阵容不能为空，请布置卡牌' };
        }

        if (leftCount > maxLaneCapacity) {
            return { isValid: false, reason: `左卡道卡牌超出上限 (${leftCount}/${maxLaneCapacity})` };
        }
        if (midCount > maxLaneCapacity) {
            return { isValid: false, reason: `中卡道卡牌超出上限 (${midCount}/${maxLaneCapacity})` };
        }
        if (rightCount > maxLaneCapacity) {
            return { isValid: false, reason: `右卡道卡牌超出上限 (${rightCount}/${maxLaneCapacity})` };
        }

        return { isValid: true, reason: '布阵准备就绪' };
    }

    /**
     * Updates confirm button interactability and visual prompt.
     */
    private updateConfirmButtonState() {
        if (!this.confirmButton || !isValid(this.confirmButton)) return;

        const validation = this.validateDeckState();
        this.confirmButton.interactable = validation.isValid;

        const btnNode = this.confirmButton.node;
        if (!btnNode || !isValid(btnNode)) return;

        // Button background opacity/color feedback
        const btnSprite = btnNode.getComponent(Sprite);
        if (btnSprite) {
            btnSprite.color = validation.isValid ? new Color(255, 255, 255, 255) : new Color(130, 130, 140, 180);
        }

        // Button label opacity feedback
        const btnLabel = btnNode.getComponentInChildren(Label);
        if (btnLabel) {
            btnLabel.color = validation.isValid ? new Color(255, 245, 220, 255) : new Color(160, 160, 170, 180);
        }

        // Tip label below ConfirmButton
        const tipName = 'ConfirmTipLabel';
        let tipNode = this.node.getChildByName(tipName);
        let tipLabel: Label = null;

        if (!tipNode) {
            tipNode = new Node(tipName);
            tipLabel = tipNode.addComponent(Label);
            tipLabel.fontSize = 16;
            tipLabel.lineHeight = 20;
            this.node.addChild(tipNode);
        } else {
            tipLabel = tipNode.getComponent(Label);
        }

        if (tipLabel) {
            if (!validation.isValid) {
                tipLabel.string = validation.reason;
                tipLabel.color = new Color(255, 110, 110, 240); // Alert red
            } else {
                tipLabel.string = '✓ ' + validation.reason;
                tipLabel.color = new Color(130, 220, 140, 220); // Soft green
            }

            const btnPos = btnNode.position;
            tipNode.setPosition(btnPos.x, btnPos.y - 36, btnPos.z + 1);
        }
    }

    private onLaneTouchStart(event: EventTouch) {
        const targetNode = event.target as Node;
        if (targetNode) {
            this.drawLaneGraphics(targetNode, true);
        }
    }

    private onLaneTouchEnd(event: EventTouch) {
        const targetNode = event.target as Node;
        if (targetNode) {
            this.drawLaneGraphics(targetNode, false);
        }
    }

    private onLaneTouchCancel(event: EventTouch) {
        const targetNode = event.target as Node;
        if (targetNode) {
            this.drawLaneGraphics(targetNode, false);
        }
    }

    /**
     * Shows the Deck Adjustment UI and populates it with the provided deck data.
     */
    public showDeckAdjustmentUI(deckData: IDeckData, gameStateCards: Map<number, any>) {
        this.node.active = true;
        const rootWidget = this.getComponent(Widget);
        if (rootWidget) {
            rootWidget.updateAlignment();
        }
        this.node.getComponentsInChildren(Widget).forEach(w => w.updateAlignment());

        this.clearLanes();
        this._gameStateCards = gameStateCards;

        this._currentDeckData = {
            left: [...deckData.left],
            mid: [...deckData.mid],
            right: [...deckData.right]
        };

        this._populateLanes();
        this.adjustLaneLayouts();
        this.updateLaneCounters();
        this.updateConfirmButtonState();
    }

    /**
     * Hides the Deck Adjustment UI and clears all cards.
     */
    public hideDeckAdjustmentUI() {
        this.node.active = false;
        this.clearLanes();
        this._gameStateCards = null;
        this.resetLaneColors();
    }

    /**
     * Clears all cards from the lanes.
     */
    private clearLanes() {
        this._cardInstances.forEach(card => {
            if (card.node && isValid(card.node)) {
                card.node.destroy();
            }
        });
        this._cardInstances.clear();
        
        [this.leftLaneNode, this.midLaneNode, this.rightLaneNode].forEach(laneNode => {
            if (laneNode) {
                laneNode.removeAllChildren();
            }
        });
    }

    /**
     * Determines the visual insertion index for a dropped card within a lane.
     */
    private getInsertionIndex(laneNode: Node, dropPosition: Vec3): number {
        const laneChildren = laneNode.children;
        for (let i = 0; i < laneChildren.length; i++) {
            const child = laneChildren[i];
            const uiTransform = child.getComponent(UITransform);
            if (uiTransform) {
                const childWorldPos = child.worldPosition;
                if (dropPosition.y > childWorldPos.y) {
                    return i;
                }
            }
        }
        return laneChildren.length;
    }

    /**
     * Populates the lanes with cards based on the internal _currentDeckData.
     */
    private _populateLanes() {
        if (!this._gameStateCards) {
            console.error('CardDeckController: _gameStateCards not set during populateLanes. Call showDeckAdjustmentUI first.');
            return;
        }

        const addCard = (cardInstanceId: number, laneName: 'left' | 'mid' | 'right') => {
            const runtimeCardData = this._gameStateCards.get(cardInstanceId);
            if (!runtimeCardData || !runtimeCardData.staticId) {
                console.warn(`CardDeckController: Runtime card data for instance ID ${cardInstanceId} is missing or has no staticId.`);
                return;
            }
            const staticData = CardDatabase[runtimeCardData.staticId];
            if (!staticData) {
                console.warn(`CardDeckController: Static card data for static ID ${runtimeCardData.staticId} not found.`);
                return;
            }

            const cardNode = instantiate(this.cardPrefab) as Node;
            cardNode.active = true;

            const deckCardUI = cardNode.getComponent(DeckCardUI);
            if (!deckCardUI) {
                console.error('CardDeckController: CardPrefab is missing DeckCardUI component!');
                cardNode.destroy();
                return;
            }

            deckCardUI.init(staticData, cardInstanceId, laneName);
            deckCardUI.enableDrag = true;

            const cardComp = cardNode.getComponent(Card);
            if (cardComp) {
                cardComp.updateView(runtimeCardData, staticData);
            }

            let laneNode: Node;
            if (laneName === 'left') {
                laneNode = this.leftLaneNode;
            } else if (laneName === 'mid') {
                laneNode = this.midLaneNode;
            } else {
                laneNode = this.rightLaneNode;
            }

            if (laneNode && isValid(laneNode)) {
                laneNode.addChild(cardNode);
                cardNode.setScale(0.65, 0.65, 1.0);
                this._cardInstances.set(cardInstanceId, { staticId: staticData.id, instanceId: cardInstanceId, currentLane: laneName, node: cardNode });
            } else {
                console.error(`CardDeckController: Target lane node ${laneName} is invalid or null.`);
                cardNode.destroy();
            }
        };

        this._currentDeckData.left.forEach(cardId => addCard(cardId, 'left'));
        this._currentDeckData.mid.forEach(cardId => addCard(cardId, 'mid'));
        this._currentDeckData.right.forEach(cardId => addCard(cardId, 'right'));

        this.adjustLaneLayouts();
        this.adjustLaneLayouts();
        this.updateLaneCounters();
        this.updateConfirmButtonState();
        console.log('CardDeckController: Lanes populated with dynamic data.');
    }

    /**
     * Handles the 'card-dropped' event from a DeckCardUI component.
     * Step 3:
     * 1. If released outside other lanes -> return to original parent & restore original position.
     * 2. If released over a different lane -> place at top (index 0) of target lane, target cards shift down, origin lane cards below shift up 1 spot.
     */
    private onCardDropped(event: EventTouch) {
        event.propagationStopped = true;

        const detail = (event as any).detail; 
        if (!detail) {
            this.resetLaneColors();
            return;
        }

        const { instanceId, fromLane, dropPosition, originalParent, originalPos, originalSiblingIndex } = detail;
        const cardInstance = this._cardInstances.get(instanceId);

        if (!cardInstance || !cardInstance.node || !isValid(cardInstance.node)) {
            this.resetLaneColors();
            return;
        }

        const fromLaneNode = (fromLane === 'left' ? this.leftLaneNode : fromLane === 'mid' ? this.midLaneNode : this.rightLaneNode);

        let targetLane: 'left' | 'mid' | 'right' | null = null;
        let targetLaneNode: Node | null = null;

        if (this.leftLaneNode && this.leftLaneNode.getComponent(UITransform)?.getBoundingBoxToWorld().contains(dropPosition)) {
            targetLane = 'left';
            targetLaneNode = this.leftLaneNode;
        } else if (this.midLaneNode && this.midLaneNode.getComponent(UITransform)?.getBoundingBoxToWorld().contains(dropPosition)) {
            targetLane = 'mid';
            targetLaneNode = this.midLaneNode;
        } else if (this.rightLaneNode && this.rightLaneNode.getComponent(UITransform)?.getBoundingBoxToWorld().contains(dropPosition)) {
            targetLane = 'right';
            targetLaneNode = this.rightLaneNode;
        }

        // Clean up any drag placeholders across all lanes to trigger automatic vertical collapse in origin lane
        [this.leftLaneNode, this.midLaneNode, this.rightLaneNode].forEach(laneNode => {
            if (laneNode && isValid(laneNode)) {
                const placeholder = laneNode.getChildByName('CardDragPlaceholder');
                if (placeholder) {
                    placeholder.removeFromParent();
                    placeholder.destroy();
                }
            }
        });

        if (targetLane && targetLaneNode && targetLane !== fromLane) {
            // Rule 2: Released over a DIFFERENT lane -> Place at index 0 (1st card position) of target lane.
            // Target cards shift down automatically. Origin cards below shift UP by 1 spot automatically.
            this._currentDeckData[fromLane] = this._currentDeckData[fromLane].filter(id => id !== instanceId);
            this._currentDeckData[targetLane] = [instanceId, ...this._currentDeckData[targetLane].filter(id => id !== instanceId)];
            cardInstance.currentLane = targetLane;

            const deckCardUI = cardInstance.node?.getComponent(DeckCardUI);
            if (deckCardUI) {
                deckCardUI.fromLane = targetLane;
            }

            cardInstance.node.setParent(targetLaneNode);
            cardInstance.node.setSiblingIndex(0); // Insert at 1st card position
            cardInstance.node.setScale(0.65, 0.65, 1.0);

            console.log(`CardDeckController Step 3: Card ${cardInstance.staticId} moved from ${fromLane} to ${targetLane} at 1st card position.`);
        } else {
            // Rule 1: Released outside other lanes -> Return to original parent & restore original position and sibling index
            const returnParent = (originalParent && isValid(originalParent)) ? originalParent : fromLaneNode;
            if (returnParent && isValid(returnParent)) {
                cardInstance.node.setParent(returnParent);
                if (originalSiblingIndex !== undefined) {
                    cardInstance.node.setSiblingIndex(originalSiblingIndex);
                }
                if (originalPos) {
                    cardInstance.node.setPosition(originalPos);
                }
                cardInstance.node.setScale(0.65, 0.65, 1.0);
            }
            console.log(`CardDeckController Step 3: Card ${cardInstance.staticId} returned to origin lane ${fromLane} at original position.`);
        }

        this.adjustLaneLayouts();
        this.updateLaneCounters();
        this.updateConfirmButtonState();
        this.resetLaneColors();
    }

    /**
     * Handles the click event for the Confirm button.
     */
    private _onConfirmButtonClick() {
        const validation = this.validateDeckState();
        if (!validation.isValid) {
            console.warn('CardDeckController: Cannot confirm deck adjustment - ', validation.reason);
            this.updateConfirmButtonState();
            return;
        }

        const confirmEvent = new Event('DECK_ADJUSTMENT_CONFIRMED', true);
        (confirmEvent as any).detail = {
            updatedDeckData: this._currentDeckData
        };
        this.node.dispatchEvent(confirmEvent);
        console.log('CardDeckController: Deck adjustment confirmed.', this._currentDeckData);
    }
}