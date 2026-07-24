/**
 * @file GameManager.ts
 * @description The main controller component in the Cocos scene. It acts as the bridge 
 *              between the game engine (data/logic) and the view (Cocos components).
 *              This class is responsible for handling phase changes, playing animations,
 *              and forwarding user input to the FSM.
 */

import { _decorator, Component, Node, Button, Label, Prefab, instantiate, isValid, find, Widget, view, Vec3 } from 'cc';
import { Player } from './Player/Player';
import { Card } from './Card/Card';
import { Slot } from './Slot/Slot';
import { GameFSM } from '../Engine/GameFSM';
import { GameStateFactory } from '../Engine/Systems/GameStateFactory';
import { AIController } from '../Engine/AI/AIController';
import { IGameState, PlayerSide, GamePhase, ICombatLog } from '../Engine/interfaces';
import { EventBus, GameEvents } from '../Engine/EventBus';
import { CardDatabase } from '../Engine/Data/CardData';
import { CardDeckController } from '../UI/CardDeckController'; // Import CardDeckController
import { PlatformManager } from '../Framework/Platform/PlatformManager';
import { StorageManager } from '../Framework/Storage/StorageManager';
import { NetworkManager } from '../Framework/Network/NetworkManager';

const { ccclass, property } = _decorator;

const MAX_CARD_POOL_SIZE = 20;

@ccclass('GameManager')
export class GameManager extends Component {

    @property(Player) playerView: Player = null;
    @property(Player) opponentView: Player = null;
    @property(Button) actionButton: Button = null;
    @property(Label) infoLabel: Label = null;
    @property(Label) timerLabel: Label = null;
    @property(Prefab) cardPrefab: Prefab = null;
    @property({ type: Prefab }) cardDeckPrefab: Prefab = null; // Property to link the CardDeck prefab

    private gameState: IGameState = null;
    private gameFSM: GameFSM = null;
    private eventBus = EventBus.getInstance();
    private cardViewPool: Node[] = [];

    private turnTimer: number = 0;
    private isTimerRunning: boolean = false;
    private readonly TURN_TIME_LIMIT = 30;

    private cardDeckInstance: Node = null; // Instance of the CardDeck prefab
    private cardDeckController: CardDeckController = null; // Controller component of the CardDeck instance

    // --- Lifecycle Methods ---

    onLoad() {
        this.applyGlobalCanvasScale();
        view.on('canvas-resize', this.applyGlobalCanvasScale, this);
    }

    onDestroy() {
        view.off('canvas-resize', this.applyGlobalCanvasScale, this);
    }

    /**
     * 根据设备物理屏幕宽高比，直接给根节点 Canvas 施加全局等比例自适应缩放。
     */
    private applyGlobalCanvasScale() {
        const canvas = find('Canvas');
        if (!canvas) return;

        const frameSize = view.getFrameSize();
        if (!frameSize || frameSize.height <= 0 || frameSize.width <= 0) return;

        const deviceAspect = frameSize.width / frameSize.height;
        const designAspect = 750 / 1334;

        if (deviceAspect < designAspect) {
            const scale = deviceAspect / designAspect;
            canvas.setScale(new Vec3(scale, scale, 1.0));
            console.log(`[GameManager] 全局 Canvas 根节点应用等比例自适应缩放: scale=${scale.toFixed(3)}`);
        } else {
            canvas.setScale(new Vec3(1.0, 1.0, 1.0));
        }
    }

    start() {
        const platform = PlatformManager.instance;
        console.log(`[GameManager] Multi-platform init -> Type: ${platform.getPlatformType()}, IsMiniGame: ${platform.isMiniGame()}, IsNative: ${platform.isNative()}`);
        platform.setKeepScreenOn(true);

        const storage = StorageManager.instance;
        storage.setItem('last_login_time', Date.now());

        const network = NetworkManager.instance;
        console.log(`[GameManager] Network Base URL: ${network.currentConfig.httpBaseUrl}`);

        this.setupCardPool();
        this.setupEngine();
        this.setupUI();
        this.startGame();
    }

    update(dt: number) {
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

    // --- Setup Methods ---

    setupCardPool() {
        for (let i = 0; i < MAX_CARD_POOL_SIZE; i++) {
            const cardNode = instantiate(this.cardPrefab);
            cardNode.active = false;
            this.node.addChild(cardNode);
            this.cardViewPool.push(cardNode);
        }
    }

    setupEngine() {
        this.gameState = GameStateFactory.createInitialState();
        this.gameFSM = new GameFSM(this.gameState);
        this.eventBus.on(GameEvents.PHASE_CHANGED, this.onPhaseChanged.bind(this));
    }
    
    setupUI() {
        this.actionButton.node.on(Button.EventType.CLICK, this.onActionButtonClick, this);
    }
    
    startGame() {
        console.log("--- Starting New Game ---");
        // Do a simple, non-animated sync on start
        this.playerView.updateView(this.gameState.players[PlayerSide.Player], this.gameState);
        this.opponentView.updateView(this.gameState.players[PlayerSide.Opponent], this.gameState);
        this.gameFSM.transitionTo(GamePhase.PreBattle);
    }

    // --- View Update & Management ---

    private async playRotationAnimations() {
        const playerAnims = this.syncPlayerSlots(this.playerView, this.gameState.players[PlayerSide.Player]);
        const opponentAnims = this.syncPlayerSlots(this.opponentView, this.gameState.players[PlayerSide.Opponent]);
        await Promise.all([playerAnims, opponentAnims]);
    }

    private async syncPlayerSlots(playerView: Player, playerState: any) {
        // This function now only handles rotation animations.
        const animationPromises: Promise<void>[] = [];

        for (let i = 0; i < playerView.slots.length; i++) {
            const slotView = playerView.slots[i];
            const slotState = playerState.slots[i];

            // Condition to animate: there's a card in the state, and it's different from the view's card.
            if (slotState.card && (!slotView.card || slotView.card.instanceId !== slotState.card.instanceId)) {
                
                // 1. Prepare animation nodes
                let deckIds: number[] = [];
                if (i === 0) deckIds = playerState.leftDeck;
                else if (i === 1) deckIds = playerState.midDeck;
                else deckIds = playerState.rightDeck;

                if (deckIds.length === 0) {
                    // This case should not happen if a card was drawn, but as a failsafe:
                    slotView.setCard(null); // Clear the old card
                    continue;
                }
                
                // Duplicate for a looping effect
                const visualDeckIds = [...deckIds, ...deckIds, ...deckIds];
                
                const animationNodes: Node[] = visualDeckIds.map(id => {
                    const node = this.getCardViewFromPool();
                    const cardState = this.gameState.cards[id];
                    node.getComponent(Card).updateView(cardState, CardDatabase[cardState.staticId]);
                    return node;
                });

                // Find the specific node instance that represents our target card
                // We need to find it in the middle duplication to ensure a good scroll
                const targetInstanceId = slotState.card.instanceId;
                const midPoint = deckIds.length;
                let targetNodeIndex = -1;
                for(let j = midPoint; j < midPoint + deckIds.length; j++) {
                    const nodeCardComp = animationNodes[j].getComponent(Card);
                    if (nodeCardComp && nodeCardComp.instanceId === targetInstanceId) {
                        targetNodeIndex = j;
                        break;
                    }
                }

                // Failsafe if the target somehow isn't in the deck
                if (targetNodeIndex === -1) {
                    slotView.setCard(null);
                    animationNodes.forEach(n => this.returnCardViewToPool(n)); // Cleanup
                    continue;
                }
                
                const targetCardNode = animationNodes[targetNodeIndex];

                // 2. Play animation
                const animationPromise = slotView.playScrollAnimation(targetCardNode, animationNodes, playerState.side)
                    .then(() => {
                        // 3. After animation, cleanup temporary nodes
                        animationNodes.forEach(node => {
                            if (node !== targetCardNode) {
                                this.returnCardViewToPool(node);
                            }
                        });
                    });
                
                animationPromises.push(animationPromise);

            } else if (!slotState.card && slotView.card) {
                // This handles clearing a card that was kept but then died in combat (for future logic)
                this.returnCardViewToPool(slotView.card.node);
                slotView.setCard(null);
            }
        }
        await Promise.all(animationPromises);
    }

    getCardViewFromPool(): Node {
        if (this.cardViewPool.length > 0) {
            const cardNode = this.cardViewPool.pop();
            // DO NOT activate it here. The consumer will activate it when it's ready to be shown.
            return cardNode;
        }
        // Pool is empty, create a new one.
        const cardNode = instantiate(this.cardPrefab);
        cardNode.active = false; // Ensure it starts inactive
        this.node.addChild(cardNode);
        return cardNode;
    }

    returnCardViewToPool(cardNode: Node) {
        if (!cardNode) return;
        cardNode.active = false;
        this.cardViewPool.push(cardNode);
    }

    // --- Event & Action Handlers ---

    private async onPhaseChanged({ newPhase, data }: { newPhase: GamePhase, data?: any }) {
        this.stopTimer();
        this.hideDeckAdjustmentUIForPlayer(); // Ensure any existing UI is hidden
        this.actionButton.node.active = false; // Always hide GameManager's action button initially

        const phaseName = GamePhase[newPhase];
        this.infoLabel.string = `Turn ${this.gameState.turn} (${PlayerSide[this.gameState.activePlayer]}) - ${phaseName}`;
        

        switch (newPhase) {
            case GamePhase.DeckAdjustment:
                this.playerView.updateView(this.gameState.players[PlayerSide.Player], this.gameState);
                this.opponentView.updateView(this.gameState.players[PlayerSide.Opponent], this.gameState);
                
                if (this.gameState.activePlayer === PlayerSide.Player) {
                    this.startTimer();
                    this.showDeckAdjustmentUIForPlayer(); // New method to show CardDeck
                } else {
                    // AI logic for DeckAdjustment
                    Promise.resolve().then(() => {
                        const aiAction = AIController.decideAction(this.gameState); // AI might choose to adjust
                        if (aiAction && aiAction.type === 'ADJUST_DECK') {
                            // If AI chose to adjust, apply it here if needed, then confirm
                            this.gameFSM.dispatchAction({ type: 'CONFIRM_ADJUSTMENT' });
                        } else {
                            // Default AI action if no adjustment, or AI confirms existing
                            this.gameFSM.dispatchAction({ type: 'CONFIRM_ADJUSTMENT' });
                        }
                    });
                }
                break;
            case GamePhase.Rotation:
                this.playerView.updateView(this.gameState.players[PlayerSide.Player], this.gameState);
                this.opponentView.updateView(this.gameState.players[PlayerSide.Opponent], this.gameState);
                if (this.gameState.activePlayer === PlayerSide.Player) {
                    this.actionButton.node.active = true; // For Rotation phase, use GameManager's button
                    this.startTimer();
                } else {
                    Promise.resolve().then(() => {
                        const aiAction = AIController.decideAction(this.gameState);
                        if (aiAction) this.gameFSM.dispatchAction(aiAction);
                        else {
                            const defaultAction = { type: 'CONFIRM_ROTATION', payload: { keepInLane: { left: false, mid: false, right: false } } };
                            this.gameFSM.dispatchAction(defaultAction);
                        }
                    });
                }
                break;
            
            case GamePhase.Combat:
                await this.playRotationAnimations();
                await this.runCombatAnimations(data as ICombatLog);

                // After all animations are done, do a final sync
                this.playerView.updateView(this.gameState.players[PlayerSide.Player], this.gameState);
                this.opponentView.updateView(this.gameState.players[PlayerSide.Opponent], this.gameState);

                this.gameFSM.dispatchAction({ type: 'COMBAT_COMPLETE' });
                break;
        }
    }

    /**
     * Shows the CardDeck UI for player's deck adjustment.
     */
    private showDeckAdjustmentUIForPlayer() {
        if (!this.cardDeckPrefab) {
            console.error('GameManager: cardDeckPrefab is not assigned, cannot show UI!');
            return;
        }

        // Instantiate if not already present
        if (!this.cardDeckInstance || !isValid(this.cardDeckInstance)) {
            this.cardDeckInstance = instantiate(this.cardDeckPrefab) as Node;
            let canvasNode = find('Canvas'); // Find the root Canvas node
            if (canvasNode) {
                canvasNode.addChild(this.cardDeckInstance); // Add to Canvas to render on top
            } else {
                console.warn("GameManager: 'Canvas' node not found, adding CardDeck to GameManager node. Z-order might be an issue.");
                this.node.addChild(this.cardDeckInstance); // Fallback
            }
            const widget = this.cardDeckInstance.getComponent(Widget);
            if (widget) {
                widget.updateAlignment();
            }
            this.cardDeckController = this.cardDeckInstance.getComponent(CardDeckController);

            if (!this.cardDeckController) {
                console.error('GameManager: CardDeckPrefab is missing CardDeckController component!');
                return;
            }
            // Listen for the confirmation event from the CardDeckController
            this.cardDeckInstance.on('DECK_ADJUSTMENT_CONFIRMED', this._onDeckAdjustmentConfirmed, this);
        }

        // Pass current player's deck data and all game cards for population
        const playerState = this.gameState.players[PlayerSide.Player];
        this.cardDeckController.showDeckAdjustmentUI(
            {
                left: playerState.leftDeck,
                mid: playerState.midDeck,
                right: playerState.rightDeck
            },
            new Map(Object.entries(this.gameState.cards).map(([id, cardState]) => [Number(id), cardState])) // Convert object to Map
        );
    }

    /**
     * Hides and destroys the CardDeck UI.
     */
    private hideDeckAdjustmentUIForPlayer() {
        if (this.cardDeckInstance && isValid(this.cardDeckInstance)) {
            if (this.cardDeckController) {
                this.cardDeckController.hideDeckAdjustmentUI(); // Clear cards etc.
                this.cardDeckInstance.off('DECK_ADJUSTMENT_CONFIRMED', this._onDeckAdjustmentConfirmed, this);
            }
            this.cardDeckInstance.destroy();
            this.cardDeckInstance = null;
            this.cardDeckController = null;
        }
    }

    /**
     * Handles the DECK_ADJUSTMENT_CONFIRMED event from the CardDeckController.
     * Updates the game state and dispatches the CONFIRM_ADJUSTMENT action.
     */
    private _onDeckAdjustmentConfirmed(event: Event) {
        // Stop further propagation as we've handled it
        (event as any).propagationStopped = true;

        const detail = (event as any).detail;
        if (!detail || !detail.updatedDeckData) {
            console.error('GameManager: DECK_ADJUSTMENT_CONFIRMED event missing updatedDeckData.');
            return;
        }

        const { updatedDeckData } = detail;
        
        // Update the actual game state with the new deck configuration
        const playerState = this.gameState.players[PlayerSide.Player];
        playerState.leftDeck = updatedDeckData.left;
        playerState.midDeck = updatedDeckData.mid;
        playerState.rightDeck = updatedDeckData.right;

        // Hide the UI
        this.hideDeckAdjustmentUIForPlayer();
        this.stopTimer();

        // Dispatch action to GameFSM to confirm adjustment
        this.gameFSM.dispatchAction({ type: 'CONFIRM_ADJUSTMENT' });
        console.log('GameManager: Deck adjustment confirmed and game state updated.', updatedDeckData);
    }

    private async runCombatAnimations(log: ICombatLog) {
        if (!log) return;
        await new Promise(resolve => setTimeout(resolve, 500));

        for (const event of log.events) {
            // Short pause between events for readability
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
                    if (victimView) {
                         await new Promise<void>(resolve => victimView.playDieAnimation(resolve));
                    }
                    break;
                }
                case 'gameOver': {
                    this.infoLabel.string = `${PlayerSide[event.winner]} Wins!`;
                    this.actionButton.node.active = false;
                    break;
                }
            }
        }
    }

    // --- Helpers ---
    
    private findCardView(instanceId: number): Card | null {
        let view = this.playerView.findCardView(instanceId);
        if (view) return view;
        return this.opponentView.findCardView(instanceId);
    }
    
    // --- Unchanged methods below ---

    private onTimerEnd() {
        console.log('[GameManager] Timer ended. Auto-skipping phase.');
        this.stopTimer();
        const phase = this.gameState.phase;
        if (phase === GamePhase.DeckAdjustment) {
            this.gameFSM.dispatchAction({ type: 'CONFIRM_ADJUSTMENT' });
        } else if (phase === GamePhase.Rotation) {
            this.gameFSM.dispatchAction({ type: 'CONFIRM_ROTATION', payload: { keepInLane: { left: false, mid: false, right: false } } });
        }
    }

    private onActionButtonClick() {
        if (this.gameState.activePlayer !== PlayerSide.Player) return;
        this.stopTimer();
        const phase = this.gameState.phase;
        if (phase === GamePhase.DeckAdjustment) {
            this.gameFSM.dispatchAction({ type: 'CONFIRM_ADJUSTMENT' });
        } else if (phase === GamePhase.Rotation) {
            this.gameFSM.dispatchAction({ type: 'CONFIRM_ROTATION', payload: { keepInLane: { left: false, mid: false, right: false } } });
        }
    }
    
    private startTimer() {
        if (this.timerLabel) this.timerLabel.node.active = true;
        this.turnTimer = this.TURN_TIME_LIMIT;
        this.isTimerRunning = true;
    }

    private stopTimer() {
        if (this.timerLabel) this.timerLabel.node.active = false;
        this.isTimerRunning = false;
    }
}