import { _decorator, Component, Node, Vec3, Layout, UITransform, Color, isValid, EventTouch, Event, Prefab, Button, instantiate, Sprite, Widget, resources, Graphics, SpriteFrame } from 'cc';

import { CardDatabase, IStaticCardData, IDeckData } from '../Engine/Data/CardData';
import { DeckCardUI } from './DeckCardUI'; // UI component for individual cards in the deck adjustment UI
import { Card } from '../Match/Card/Card';

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
        if (this.node && isValid(this.node)) {
            this.node.off('card-dropped', this.onCardDropped, this);
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
     * Draws vector Graphics background and borders for a lane node.
     */
    private drawLaneGraphics(node: Node, isHighlighted: boolean = false) {
        if (!node || !isValid(node)) return;
        let g = node.getComponent(Graphics);
        if (!g) {
            g = node.addComponent(Graphics);
        }
        g.clear();

        const style = this._laneVectorStyles.get(node);
        if (!style) return;

        const uiTrans = node.getComponent(UITransform);
        const w = uiTrans ? uiTrans.width : 380;
        const h = uiTrans ? uiTrans.height : 500;
        const borderRadius = 16;
        const x = -w / 2;
        const y = -h / 2;

        // Draw soft dark background fill
        g.fillColor = style.fillColor;
        g.roundRect(x, y, w, h, borderRadius);
        g.fill();

        // Draw crisp vector border
        g.strokeColor = isHighlighted ? style.highlightColor : style.borderColor;
        g.lineWidth = isHighlighted ? 4 : 2;
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
                let layout = lane.node.getComponent(Layout);
                if (!layout) {
                    layout = lane.node.addComponent(Layout);
                }
                layout.type = Layout.Type.VERTICAL;
                layout.resizeMode = Layout.ResizeMode.NONE;
                layout.spacingY = 12;
                layout.paddingTop = 50;
                layout.paddingBottom = 15;
                layout.affectedByScale = false;

                if (this.useVectorGraphics) {
                    // Option 1: Vector Graphics
                    let sp = lane.node.getComponent(Sprite);
                    if (sp) sp.enabled = false;

                    this._laneVectorStyles.set(lane.node, lane.style);
                    this.drawLaneGraphics(lane.node, false);
                } else {
                    // Option 2: Custom Generated UI Texture
                    let g = lane.node.getComponent(Graphics);
                    if (g) g.clear();

                    let sp = lane.node.getComponent(Sprite);
                    if (!sp) {
                        sp = lane.node.addComponent(Sprite);
                    }
                    sp.enabled = true;

                    resources.load(lane.imgPath, SpriteFrame, (err, sf) => {
                        if (!err && sf) {
                            if (sp && isValid(sp)) sp.spriteFrame = sf;
                        } else {
                            resources.load(lane.basePath, SpriteFrame, (err2, sf2) => {
                                if (!err2 && sf2 && sp && isValid(sp)) sp.spriteFrame = sf2;
                            });
                        }
                    });
                }
            }
        });
    }

    /**
     * Sets up event listeners for lane touches. (Disabled so lane columns stay fixed)
     */
    private setupLaneTouchListeners() {
        // Lanes must stay completely fixed and immovable
    }

    /**
     * Sets up event listeners for card drops and button clicks.
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

        if (this.node && isValid(this.node)) {
            this.node.on('card-dropped', this.onCardDropped, this);
        }
        if (this.confirmButton && isValid(this.confirmButton) && this.confirmButton.node && isValid(this.confirmButton.node)) {
            this.confirmButton.node.on(Button.EventType.CLICK, this._onConfirmButtonClick, this);
        }
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
     * Handles TOUCH_START event on a lane node.
     * Highlights the lane vector border.
     */
    private onLaneTouchStart(event: EventTouch) {
        const targetNode = event.target as Node;
        if (targetNode) {
            this.drawLaneGraphics(targetNode, true);
        }
    }

    /**
     * Handles TOUCH_END event on a lane node.
     * Resets the lane vector graphics to normal.
     */
    private onLaneTouchEnd(event: EventTouch) {
        const targetNode = event.target as Node;
        if (targetNode) {
            this.drawLaneGraphics(targetNode, false);
        }
    }

    /**
     * Handles TOUCH_CANCEL event on a lane node.
     * Resets the lane vector graphics to normal.
     */
    private onLaneTouchCancel(event: EventTouch) {
        const targetNode = event.target as Node;
        if (targetNode) {
            this.drawLaneGraphics(targetNode, false);
        }
    }

    /**
     * Shows the Deck Adjustment UI and populates it with the provided deck data.
     * @param deckData The current deck configuration from the game state (instanceIds).
     * @param gameStateCards A map of instanceId to IRuntimeCardData for all cards in the game.
     */
    public showDeckAdjustmentUI(deckData: IDeckData, gameStateCards: Map<number, any>) { // gameStateCards should be Map<instanceId, IRuntimeCardData> from GameManager
        this.node.active = true;
        const rootWidget = this.getComponent(Widget);
        if (rootWidget) {
            rootWidget.updateAlignment();
        }
        this.node.getComponentsInChildren(Widget).forEach(w => w.updateAlignment());

        this.clearLanes();
        this._gameStateCards = gameStateCards; // Store reference to GameManager's card data

        this._currentDeckData = { // Clone the deck data to work on
            left: [...deckData.left],
            mid: [...deckData.mid],
            right: [...deckData.right]
        };

        this._populateLanes();
    }

    /**
     * Hides the Deck Adjustment UI and clears all cards.
     */
    public hideDeckAdjustmentUI() {
        this.node.active = false;
        this.clearLanes();
        this._gameStateCards = null; // Clear reference
        this.resetLaneColors(); // Ensure colors are reset when hiding the UI
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
     * @param laneNode The lane node where the card is being dropped.
     * @param dropPosition The world position where the card was dropped.
     * @returns The insertion index (0-based).
     */
    private getInsertionIndex(laneNode: Node, dropPosition: Vec3): number {
        const laneChildren = laneNode.children;
        // Assuming vertical layout, top to bottom.
        // If dropPosition.y is higher, it should be an earlier index.
        for (let i = 0; i < laneChildren.length; i++) {
            const child = laneChildren[i];
            const uiTransform = child.getComponent(UITransform);
            if (uiTransform) {
                // Get the center Y position of the child in world coordinates
                const childWorldPos = child.worldPosition;
                // For a vertical layout, we compare the dropPosition Y with the card's center Y
                // Or with the top/bottom edges, depending on desired precision.
                // Let's use the center for simplicity.
                if (dropPosition.y > childWorldPos.y) { // Dropped above this card
                    return i;
                }
            }
        }
        return laneChildren.length; // Dropped below all existing cards
    }

    /**
     * Populates the lanes with cards based on the internal _currentDeckData.
     * Uses _gameStateCards to retrieve static card data.
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
            const staticData = CardDatabase[runtimeCardData.staticId]; // Use staticId from runtime data to get static info
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
            deckCardUI.enableDrag = true; // Enable drag only for adjustment UI cards

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
                cardNode.setScale(1.0, 1.0, 1); // Full 1.0 scale to display card properly!
                this._cardInstances.set(cardInstanceId, { staticId: staticData.id, instanceId: cardInstanceId, currentLane: laneName, node: cardNode });
            } else {
                console.error(`CardDeckController: Target lane node ${laneName} is invalid or null.`);
                cardNode.destroy();
            }
        };

        // Populate Left Lane
        this._currentDeckData.left.forEach(cardId => addCard(cardId, 'left'));
        // Populate Mid Lane
        this._currentDeckData.mid.forEach(cardId => addCard(cardId, 'mid'));
        // Populate Right Lane
        this._currentDeckData.right.forEach(cardId => addCard(cardId, 'right'));

        console.log('CardDeckController: Lanes populated with dynamic data.');
    }

    /**
     * Handles the 'card-dropped' event from a DeckCardUI component.
     * @param event The custom event detail contains instanceId, fromLane, dropPosition, and returnToOrigin callback.
     */
    private onCardDropped(event: EventTouch) {
        // Stop propagation to prevent GameManager's default actionButton handling if any
        event.propagationStopped = true;

        const detail = (event as any).detail; 
        if (!detail) {
            console.error('CardDeckController: card-dropped event missing detail.');
            return;
        }

        const { instanceId, fromLane, dropPosition, returnToOrigin } = detail;
        const cardInstance = this._cardInstances.get(instanceId);

        if (!cardInstance) {
            console.warn(`CardDeckController: Dropped card with instance ID ${instanceId} not found in _cardInstances.`);
            returnToOrigin();
            return;
        }

        let targetLane: 'left' | 'mid' | 'right' | null = null;
        let targetLaneNode: Node | null = null;

        // Determine which lane the card was dropped into
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

        // --- Logic for sequential arrangement ---
        if (targetLane && targetLaneNode) { // Dropped into a valid lane
            // Determine insertion index based on drop position
            const insertionIndex = this.getInsertionIndex(targetLaneNode, dropPosition);

            // Update internal data model
            if (fromLane === targetLane) {
                // Moving within the same lane
                const currentCards = this._currentDeckData[fromLane];
                const oldIndex = currentCards.indexOf(instanceId);
                if (oldIndex !== -1) {
                    currentCards.splice(oldIndex, 1); // Remove from old position
                    currentCards.splice(insertionIndex, 0, instanceId); // Insert into new position
                }
            } else {
                // Moving to a different lane
                // Remove from old lane's internal representation
                this._currentDeckData[fromLane] = this._currentDeckData[fromLane].filter(id => id !== instanceId);
                // Add to new lane's internal representation at specific index
                this._currentDeckData[targetLane].splice(insertionIndex, 0, instanceId);
            }
            
            // Update card instance's currentLane
            cardInstance.currentLane = targetLane;

            // Re-parent the card node and set its sibling index
            if (cardInstance.node) {
                cardInstance.node.setParent(targetLaneNode);
                cardInstance.node.setSiblingIndex(insertionIndex);
                cardInstance.node.setScale(1.0, 1.0, 1.0);

                // Smooth magnet drop spring effect: snap automatically to fixed slot position
                const currentScale = cardInstance.node.scale.clone();
                cardInstance.node.setScale(1.08, 1.08, 1.0);
                
                // Trigger Layout update so target position is recalculated cleanly
                let layout = targetLaneNode.getComponent(Layout);
                if (layout) {
                    layout.updateLayout();
                }

                console.log(`CardDeckController: Card ${cardInstance.staticId} (ID: ${instanceId}) moved from ${fromLane} to ${targetLane} at index ${insertionIndex}.`);
            } else {
                console.warn(`CardDeckController: Failed to re-parent card ${instanceId} to ${targetLane}. Node is null.`);
                returnToOrigin(); // Something went wrong, return it
            }
        } else {
            // Dropped outside any valid lane, return to origin
            console.log(`CardDeckController: Card ${cardInstance.staticId} (ID: ${instanceId}) dropped outside valid area. Returning to origin.`);
            returnToOrigin();
        }
        this.resetLaneColors(); // Ensure colors are reset after drop attempt
    }

    /**
     * Handles the click event for the Confirm button.
     * Emits a custom event with the updated deck configuration.
     */
    private _onConfirmButtonClick() {
        // Emit a custom event that GameManager can listen to
        const confirmEvent = new Event('DECK_ADJUSTMENT_CONFIRMED', true); // Bubbles up
        (confirmEvent as any).detail = {
            updatedDeckData: this._currentDeckData
            // Optionally, include resource costs if calculated here
        };
        this.node.dispatchEvent(confirmEvent);
        console.log('CardDeckController: Deck adjustment confirmed.', this._currentDeckData);
    }
}