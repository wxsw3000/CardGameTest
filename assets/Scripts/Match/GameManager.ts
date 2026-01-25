/**
 * @file GameManager.ts
 * @description The main controller component in the Cocos scene. It acts as the bridge
 *              between the game engine (data/logic) and the view (Cocos components).
 *              This class is responsible for handling phase changes, playing animations,
 *              and forwarding user input to the FSM.
 */

import { _decorator, Component, Node, Button, Label, Prefab, instantiate, UITransform, Vec3, Color, Layout, Size, view, Vec2, Sprite } from 'cc';
import { Player } from './Player/Player';
import { Card } from './Card/Card';
import { Slot } from './Slot/Slot';
import { GameFSM } from '../Engine/GameFSM';
import { GameStateFactory } from '../Engine/Systems/GameStateFactory';
import { AIController } from '../Engine/AI/AIController';
import { IGameState, IAction, PlayerSide, GamePhase, ICombatLog } from '../Engine/interfaces';
import { EventBus, GameEvents } from '../Engine/EventBus';
import { CardDatabase, IStaticCardData } from '../Engine/Data/CardData';
import { DeckCardUI } from '../UI/DeckCardUI';

const { ccclass, property } = _decorator;

const MAX_CARD_POOL_SIZE = 60; // Unified pool size for all card nodes

@ccclass('GameManager')
export class GameManager extends Component {

    @property(Player) playerView: Player = null;
    @property(Player) opponentView: Player = null;
    @property(Button) actionButton: Button = null;
    @property(Label) infoLabel: Label = null;
    @property(Label) timerLabel: Label = null;
    @property(Prefab) cardPrefab: Prefab = null; // Used for both game cards and UI cards

    // Programmatically created UI nodes
    private _deckAdjustmentPanel: Node = null;
    private _leftDeckContainer: Node = null;
    private _midDeckContainer: Node = null;
    private _rightDeckContainer: Node = null;

    private gameState: IGameState = null;
    private gameFSM: GameFSM = null;
    private eventBus = EventBus.getInstance();
    private cardViewPool: Node[] = [];

    private turnTimer: number = 0;
    private isTimerRunning: boolean = false;
    private readonly TURN_TIME_LIMIT = 30;

    start() {
        this.setupPools();
        this.setupEngine();
        this.setupUI();
        this.startGame();
    }

    update = (dt: number) => {
        if (this.isTimerRunning) {
            this.turnTimer -= dt;
            if (this.turnTimer <= 0) {
                this.turnTimer = 0;
                this.isTimerRunning = false;
                this.onTimerEnd();
            }
            if (this.timerLabel) {
                this.timerLabel.string = Math.ceil(this.turnTimer).toString();
            }
        }
    }

    private setupPools = () => {
        if (this.cardPrefab) {
            // Unified pool for all card nodes (game cards and UI cards)
            for (let i = 0; i < MAX_CARD_POOL_SIZE; i++) {
                const node = instantiate(this.cardPrefab);
                node.active = false;
                this.node.addChild(node); // Parent to GameManager node initially
                this.cardViewPool.push(node);
            }
        } else {
            console.error("[GameManager] 'cardPrefab' is not assigned in the editor!");
        }
    }

    private setupEngine = () => {
        this.gameState = GameStateFactory.createInitialState();
        this.gameFSM = new GameFSM(this.gameState);
        this.eventBus.on(GameEvents.PHASE_CHANGED, this.onPhaseChanged);
    }

    private setupUI = () => {
        if(this.actionButton) {
            this.actionButton.node.on(Button.EventType.CLICK, this.onActionButtonClick);
        }
        this.createDeckAdjustmentUI(); // Create the UI programmatically
    }

    private startGame = () => {
        this.playerView.updateView(this.gameState.players[PlayerSide.Player], this.gameState);
        this.opponentView.updateView(this.gameState.players[PlayerSide.Opponent], this.gameState);
        this.gameFSM.transitionTo(GamePhase.PreBattle);
    }

    private createDeckAdjustmentUI = () => {
        const canvas = this.node.parent; // Assuming GameManager is on a node directly under the canvas
        if (!canvas) {
            console.error("GameManager's parent node is not under a Canvas!");
            return;
        }
        const screenSize = view.getVisibleSize();

        this._deckAdjustmentPanel = new Node("DeckAdjustmentPanel");
        const panelTransform = this._deckAdjustmentPanel.addComponent(UITransform);
        panelTransform.setContentSize(screenSize.width, screenSize.height);

        const panelSprite = this._deckAdjustmentPanel.addComponent(Sprite);
        panelSprite.color = new Color(0, 0, 0, 200); // Semi-transparent black

        const panelLayout = this._deckAdjustmentPanel.addComponent(Layout);
        panelLayout.type = Layout.Type.HORIZONTAL;
        panelLayout.spacingX = 20;
        panelLayout.paddingLeft = 20;
        panelLayout.paddingRight = 20;
        panelLayout.alignHorizontal = true; // Use boolean as per editor type

        this._deckAdjustmentPanel.addComponent(Button); // To block touches

        canvas.addChild(this._deckAdjustmentPanel);
        this._deckAdjustmentPanel.setSiblingIndex(Infinity); // Render on top
        this._deckAdjustmentPanel.active = false;

        const createContainer = (name: string): Node => {
            const container = new Node(name);
            const contTransform = container.addComponent(UITransform);
            contTransform.setContentSize(300, screenSize.height / 1.5); // Adjusted height

            const contSprite = container.addComponent(Sprite);
            contSprite.color = new Color(50, 50, 50, 150); // Slightly darker background

            const layout = container.addComponent(Layout);
            layout.type = Layout.Type.VERTICAL;
            layout.resizeMode = Layout.ResizeMode.CONTAINER;
            layout.spacingY = 10;
            layout.paddingTop = 20;
            (layout as any).verticalDirection = 0; // 0 = TOP_TO_BOTTOM

            this._deckAdjustmentPanel.addChild(container);
            return container;
        };

        this._leftDeckContainer = createContainer("LeftDeckContainer");
        this._midDeckContainer = createContainer("MidDeckContainer");
        this._rightDeckContainer = createContainer("RightDeckContainer");

        this._deckAdjustmentPanel.on('card-dropped', this.onCardDropped);
    }

    private populateDeckAdjustmentUI = () => {
        if (!this._deckAdjustmentPanel || !this.cardPrefab) return; // cardPrefab check needed if createDeckAdjustmentUI wasn't called

        const playerState = this.gameState.players[PlayerSide.Player];
        const containers = [this._leftDeckContainer, this._midDeckContainer, this._rightDeckContainer];
        const decks = [playerState.leftDeck, playerState.midDeck, playerState.rightDeck];
        const laneNames: ('left' | 'mid' | 'right')[] = ['left', 'mid', 'right'];

        containers.forEach(c => c.children.forEach(child => this.returnCardViewToPool(child)));
        containers.forEach(c => c.removeAllChildren());

        for (let i = 0; i < decks.length; i++) {
            const deck = decks[i];
            const container = containers[i];
            const laneName = laneNames[i];

            deck.forEach(instanceId => {
                const cardState = this.gameState.cards[instanceId];
                if (cardState) {
                    const cardUINode = this.getCardViewFromPool();
                    const staticData = CardDatabase[cardState.staticId];

                    // The main card prefab needs both Card and DeckCardUI scripts
                    cardUINode.getComponent(Card).updateView(cardState, staticData);
                    cardUINode.getComponent(DeckCardUI)?.init(staticData, instanceId, laneName);

                    cardUINode.active = true;
                    container.addChild(cardUINode);
                }
            });
        }
    }

    private onCardDropped = (event: any) => {
        event.propagationStopped = true;
        const detail = event.detail;
        const { instanceId, fromLane, dropPosition, returnToOrigin } = detail;

        const containers = [this._leftDeckContainer, this._midDeckContainer, this._rightDeckContainer];
        const laneNames: ('left' | 'mid' | 'right')[] = ['left', 'mid', 'right'];
        let droppedOnLane: 'left' | 'mid' | 'right' | null = null;

        for (let i = 0; i < containers.length; i++) {
            const container = containers[i];
            const bb = container.getComponent(UITransform).getBoundingBoxToWorld();
            if (bb.contains(new Vec2(dropPosition.x, dropPosition.y))) {
                droppedOnLane = laneNames[i];
                break;
            }
        }

        if (droppedOnLane && droppedOnLane !== fromLane) {
            this.gameFSM.dispatchAction({
                type: 'ADJUST_DECK',
                payload: { cardInstanceId: instanceId, fromLane: fromLane, toLane: droppedOnLane }
            });
            this.populateDeckAdjustmentUI();
        } else {
            returnToOrigin();
        }
    }

    private onPhaseChanged = async ({ newPhase, data }: { newPhase: GamePhase, data?: any }) => {
        this.stopTimer();
        if (this._deckAdjustmentPanel) this._deckAdjustmentPanel.active = false;

        const phaseName = GamePhase[newPhase];
        this.infoLabel.string = `Turn ${this.gameState.turn} (${PlayerSide[this.gameState.activePlayer]}) - ${phaseName}`;
        if(this.actionButton) this.actionButton.node.active = false;

        switch (newPhase) {
            case GamePhase.DeckAdjustment:
                this.playerView.updateView(this.gameState.players[PlayerSide.Player], this.gameState);
                this.opponentView.updateView(this.gameState.players[PlayerSide.Opponent], this.gameState);

                if (this.gameState.activePlayer === PlayerSide.Player) {
                    if (this._deckAdjustmentPanel) {
                        this.populateDeckAdjustmentUI();
                        this._deckAdjustmentPanel.active = true;
                    }
                    if(this.actionButton) this.actionButton.node.active = true;
                    this.startTimer();
                } else {
                    Promise.resolve().then(() => {
                        this.gameFSM.dispatchAction(AIController.decideAction(this.gameState) || { type: 'CONFIRM_ADJUSTMENT' });
                    });
                }
                break;

            case GamePhase.Rotation:
                 this.playerView.updateView(this.gameState.players[PlayerSide.Player], this.gameState);
                this.opponentView.updateView(this.gameState.players[PlayerSide.Opponent], this.gameState);
                if (this.gameState.activePlayer === PlayerSide.Player) {
                    if(this.actionButton) this.actionButton.node.active = true;
                    this.startTimer();
                } else {
                    Promise.resolve().then(() => {
                        this.gameFSM.dispatchAction(AIController.decideAction(this.gameState) || { type: 'CONFIRM_ROTATION', payload: { keepInLane: { left: false, mid: false, right: false } } });
                    });
                }
                break;

            case GamePhase.Combat:
                await this.playRotationAnimations();
                await this.runCombatAnimations(data as ICombatLog);
                this.playerView.updateView(this.gameState.players[PlayerSide.Player], this.gameState);
                this.opponentView.updateView(this.gameState.players[PlayerSide.Opponent], this.gameState);
                this.gameFSM.dispatchAction({ type: 'COMBAT_COMPLETE' });
                break;
        }
    }

    private onActionButtonClick = () => {
        if (this.gameState.activePlayer !== PlayerSide.Player) return;
        this.stopTimer();
        const phase = this.gameState.phase;
        if (phase === GamePhase.DeckAdjustment) {
            this.gameFSM.dispatchAction({ type: 'CONFIRM_ADJUSTMENT' });
        } else if (phase === GamePhase.Rotation) {
            this.gameFSM.dispatchAction({ type: 'CONFIRM_ROTATION', payload: { keepInLane: { left: false, mid: false, right: false } } });
        }
    }

    private onTimerEnd = () => {
        console.log('[GameManager] Timer ended. Auto-skipping phase.');
        this.stopTimer();
        const phase = this.gameState.phase;
        if (phase === GamePhase.DeckAdjustment) {
            this.gameFSM.dispatchAction({ type: 'CONFIRM_ADJUSTMENT' });
        } else if (phase === GamePhase.Rotation) {
            this.gameFSM.dispatchAction({ type: 'CONFIRM_ROTATION', payload: { keepInLane: { left: false, mid: false, right: false } } });
        }
    }

    private playRotationAnimations = async () => {
        const playerAnims = this.syncPlayerSlots(this.playerView, this.gameState.players[PlayerSide.Player]);
        const opponentAnims = this.syncPlayerSlots(this.opponentView, this.gameState.players[PlayerSide.Opponent]);
        await Promise.all([playerAnims, opponentAnims]);
    }

    private syncPlayerSlots = async (playerView: Player, playerState: any) => {
        const animationPromises: Promise<void>[] = [];
        for (let i = 0; i < playerView.slots.length; i++) {
            const slotView = playerView.slots[i];
            const slotState = playerState.slots[i];
            if (slotState.card && (!slotView.card || slotView.card.instanceId !== slotState.card.instanceId)) {
                if (slotView.card) {
                    this.returnCardViewToPool(slotView.card.node);
                }
                let deckIds: number[] = [];
                if (i === 0) deckIds = playerState.leftDeck;
                else if (i === 1) deckIds = playerState.midDeck;
                else deckIds = playerState.rightDeck;
                if (deckIds.length === 0) {
                    slotView.setCard(null);
                    continue;
                }
                const visualDeckIds = [...deckIds, ...deckIds, ...deckIds];
                const animationNodes: Node[] = visualDeckIds.map(id => {
                    const node = this.getCardViewFromPool();
                    const cardState = this.gameState.cards[id];
                    node.getComponent(Card).updateView(cardState, CardDatabase[cardState.staticId]);
                    return node;
                });
                const targetInstanceId = slotState.card.instanceId;
                const midPoint = deckIds.length;
                let targetNodeIndex = -1;
                for(let j = midPoint; j < midPoint + deckIds.length; j++) {
                    if (animationNodes[j].getComponent(Card)?.instanceId === targetInstanceId) {
                        targetNodeIndex = j;
                        break;
                    }
                }
                if (targetNodeIndex === -1) {
                    slotView.setCard(null);
                    animationNodes.forEach(n => this.returnCardViewToPool(n));
                    continue;
                }
                const targetCardNode = animationNodes[targetNodeIndex];
                const animationPromise = slotView.playScrollAnimation(targetCardNode, animationNodes, playerState.side)
                    .then(() => {
                        animationNodes.forEach(node => {
                            if (node !== targetCardNode) this.returnCardViewToPool(node);
                        });
                    });
                animationPromises.push(animationPromise);
            } else if (!slotState.card && slotView.card) {
                this.returnCardViewToPool(slotView.card.node);
                slotView.setCard(null);
            }
        }
        await Promise.all(animationPromises);
    }

    private runCombatAnimations = async (log: ICombatLog) => {
        if (!log) return;
        await new Promise(resolve => setTimeout(resolve, 500));
        for (const event of log.events) {
            if (event.type !== 'damage') await new Promise(resolve => setTimeout(resolve, 300));
            switch (event.type) {
                case 'attack': {
                    const attackerView = this.findCardView(event.attackerId);
                    const defenderView = this.findCardView(event.defenderId);
                    if (attackerView && defenderView) {
                        await new Promise<void>(resolve => attackerView.playAttackAnimation(defenderView.node.worldPosition, resolve));
                    }
                    break;
                }
                case 'damage': {
                    const targetView = this.findCardView(event.targetId);
                    if (targetView) targetView.updateHp(event.newHp);
                    break;
                }
                case 'death': {
                    const victimView = this.findCardView(event.targetId);
                    if (victimView) await new Promise<void>(resolve => victimView.playDieAnimation(resolve));
                    break;
                }
                case 'gameOver': {
                    this.infoLabel.string = `${PlayerSide[event.winner]} Wins!`;
                    if(this.actionButton) this.actionButton.node.active = false;
                    break;
                }
            }
        }
    }

    private findCardView = (instanceId: number): Card | null => {
        let view = this.playerView.findCardView(instanceId);
        if (view) return view;
        return this.opponentView.findCardView(instanceId);
    }

    private getCardViewFromPool = (): Node => {
        if (this.cardViewPool.length > 0) {
            const cardNode = this.cardViewPool.pop();
            return cardNode;
        }
        const cardNode = instantiate(this.cardPrefab);
        this.node.addChild(cardNode);
        return cardNode;
    }

    private returnCardViewToPool = (cardNode: Node) => {
        if (!cardNode) return;
        cardNode.active = false;
        this.cardViewPool.push(cardNode);
    }

    private startTimer = () => {
        if (this.timerLabel) this.timerLabel.node.active = true;
        this.turnTimer = this.TURN_TIME_LIMIT;
        this.isTimerRunning = true;
    }

    private stopTimer = () => {
        if (this.timerLabel) this.timerLabel.node.active = false;
        this.isTimerRunning = false;
    }
}