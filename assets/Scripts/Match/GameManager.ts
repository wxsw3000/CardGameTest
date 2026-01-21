/**
 * @file GameManager.ts
 * @description The main controller component in the Cocos scene.
 *              It acts as the bridge between the game engine (data/logic) and the view (Cocos components).
 */

import { _decorator, Component, Node, Button, Label, Prefab, instantiate } from 'cc';
import { Player } from './Player/Player';
import { Card } from './Card/Card';
import { Slot } from './Slot/Slot';
import { GameFSM } from '../Engine/GameFSM';
import { GameStateFactory } from '../Engine/Systems/GameStateFactory';
import { CombatSystem } from '../Engine/Systems/CombatSystem';
import { AIController } from '../Engine/AI/AIController';
import { IGameState, IAction, PlayerSide, GamePhase } from '../Engine/interfaces';
import { EventBus, GameEvents } from '../Engine/EventBus';
import { CardDatabase } from '../Engine/Data/CardData';

const { ccclass, property } = _decorator;

const MAX_CARD_POOL_SIZE = 10;

@ccclass('GameManager')
export class GameManager extends Component {

    @property(Player) playerView: Player = null;
    @property(Player) opponentView: Player = null;
    @property(Button) actionButton: Button = null;
    @property(Label) infoLabel: Label = null;
    @property(Label) timerLabel: Label = null;
    @property(Prefab) cardPrefab: Prefab = null;

    @property({ type: Node, group: 'Deck Adjustment UI' })
    deckAdjustmentPanel: Node = null;
    @property({ type: Node, group: 'Deck Adjustment UI' })
    leftDeckContainer: Node = null;
    @property({ type: Node, group: 'Deck Adjustment UI' })
    midDeckContainer: Node = null;
    @property({ type: Node, group: 'Deck Adjustment UI' })
    rightDeckContainer: Node = null;
    @property({ type: Prefab, group: 'Deck Adjustment UI' })
    deckCardUIPrefab: Prefab = null;

    private gameState: IGameState = null;
    private gameFSM: GameFSM = null;
    private eventBus = EventBus.getInstance();
    private cardViewPool: Node[] = [];

    private turnTimer: number = 0;
    private isTimerRunning: boolean = false;
    private readonly TURN_TIME_LIMIT = 30;

    private selectedCardForAdjustment: { instanceId: number, fromLane: 'left' | 'mid' | 'right' } | null = null;

    // --- Lifecycle Methods ---

    start() {
        this.setupCardPool();
        this.setupEngine();
        this.setupUI();
        this.startGame();
    }

    update(dt: number) {
        if (this.gameState && !this.gameState.isGameOver) {
            this.gameFSM.update(dt);
        }

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
            this.node.addChild(cardNode); // Add to a general pool node
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
        this.updateFullView();
        this.gameFSM.transitionTo(GamePhase.PreBattle);
    }

    // --- View Update & Management ---

    updateFullView() {
        this.syncSlotsWithState(this.playerView, this.gameState.players[PlayerSide.Player]);
        this.syncSlotsWithState(this.opponentView, this.gameState.players[PlayerSide.Opponent]);

        this.playerView.updateView(this.gameState.players[PlayerSide.Player], this.gameState);
        this.opponentView.updateView(this.gameState.players[PlayerSide.Opponent], this.gameState);
    }

    syncSlotsWithState(playerView: Player, playerState: any) {
        for (let i = 0; i < playerView.slots.length; i++) {
            const slotView = playerView.slots[i];
            const slotState = playerState.slots[i];
            if (slotState.card && !slotView.card) { // Card exists in state, but not in view
                const cardNode = this.getCardViewFromPool();
                slotView.setCard(cardNode);
            } else if (!slotState.card && slotView.card) { // Card exists in view, but not in state
                this.returnCardViewToPool(slotView.card.node);
                slotView.setCard(null);
            }
        }
    }

    getCardViewFromPool(): Node {
        if (this.cardViewPool.length > 0) {
            const cardNode = this.cardViewPool.pop();
            cardNode.active = true;
            return cardNode;
        }
        // Pool is empty, create a new one (less ideal)
        const cardNode = instantiate(this.cardPrefab);
        this.node.addChild(cardNode);
        return cardNode;
    }

    returnCardViewToPool(cardNode: Node) {
        cardNode.active = false;
        this.cardViewPool.push(cardNode);
    }

    // --- Timer Control ---

    private startTimer() {
        if (this.timerLabel) this.timerLabel.node.active = true;
        this.turnTimer = this.TURN_TIME_LIMIT;
        this.isTimerRunning = true;
    }

    private stopTimer() {
        if (this.timerLabel) this.timerLabel.node.active = false;
        this.isTimerRunning = false;
    }

    private onTimerEnd() {
        console.log('[GameManager] Timer ended. Auto-skipping phase.');
        this.stopTimer();
        
        const phase = this.gameState.phase;
        if (phase === GamePhase.DeckAdjustment) {
            this.gameFSM.dispatchAction({ type: 'CONFIRM_ADJUSTMENT' });
        } else if (phase === GamePhase.Rotation) {
            this.gameFSM.dispatchAction({
                type: 'CONFIRM_ROTATION',
                payload: { keepInLane: { left: false, mid: false, right: false } }
            });
        }
    }

    // --- Event & Action Handlers ---

    private onActionButtonClick() {
        if (this.gameState.activePlayer !== PlayerSide.Player) return;

        this.stopTimer(); // Stop the timer as soon as the player takes an action
        const phase = this.gameState.phase;

        if (phase === GamePhase.DeckAdjustment) {
            const action: IAction = { type: 'CONFIRM_ADJUSTMENT' };
            this.gameFSM.dispatchAction(action);
        } else if (phase === GamePhase.Rotation) {
            // For now, default to not keeping any cards.
            // A real UI would gather this from checkboxes.
            const action: IAction = {
                type: 'CONFIRM_ROTATION',
                payload: { keepInLane: { left: false, mid: false, right: false } }
            };
            this.gameFSM.dispatchAction(action);
        }
    }

    private async onPhaseChanged({ newPhase }: { newPhase: GamePhase }) {
        this.stopTimer(); // Ensure timer is stopped on any phase change
        const phaseName = GamePhase[newPhase];
        this.infoLabel.string = `Turn ${this.gameState.turn} (${PlayerSide[this.gameState.activePlayer]}) - ${phaseName}`;
        this.actionButton.node.active = false;

        switch (newPhase) {
            case GamePhase.DeckAdjustment:
            case GamePhase.Rotation:
                this.updateFullView(); // Show any cleared slots
                if (this.gameState.activePlayer === PlayerSide.Player) {
                    this.actionButton.node.active = true;
                    this.startTimer(); // Start the timer for the player
                } else {
                    // In a real game, AI would decide on adjustments/rotations here
                    const aiAction = AIController.decideAction(this.gameState);
                    if (aiAction) {
                        this.gameFSM.dispatchAction(aiAction);
                    } else {
                        // Default action if AI has no specific logic
                        if (newPhase === GamePhase.DeckAdjustment) {
                            this.gameFSM.dispatchAction({ type: 'CONFIRM_ADJUSTMENT' });
                        } else {
                            this.gameFSM.dispatchAction({ type: 'CONFIRM_ROTATION', payload: { keepInLane: { left: false, mid: false, right: false } } });
                        }
                    }
                }
                break;
            
            case GamePhase.Combat:
                this.updateFullView(); // Show newly drawn cards
                await this.runCombatAnimations();
                this.gameFSM.dispatchAction({ type: 'COMBAT_COMPLETE' });
                break;
        }
    }

    private async runCombatAnimations() {
        const combatActions = CombatSystem.calculateActions(this.gameState);
        
        for (const combatAction of combatActions) {
            const { attackerId, defenderId } = combatAction;
            
            const attackerState = this.gameState.cards[attackerId];
            const defenderState = this.gameState.cards[defenderId];
            
            if (!attackerState || attackerState.hp <= 0 || !defenderState || defenderState.hp <= 0) {
                continue;
            }

            const attackerView = this.findCardView(attackerId);
            const defenderView = this.findCardView(defenderId);

            if (attackerView && defenderView) {
                await new Promise<void>(resolve => {
                    attackerView.playAttackAnimation(defenderView.node.worldPosition, () => {
                        CombatSystem.applyAction(this.gameState, combatAction);
                        this.updateFullView(); // Update HP labels immediately
                        
                        if (this.gameState.cards[defenderId].hp <= 0) {
                            defenderView.playDieAnimation();
                        }
                        if (this.gameState.cards[attackerId].hp <= 0) {
                            attackerView.playDieAnimation();
                        }
                        
                        setTimeout(() => resolve(), 500); // Wait half a second for readability
                    });
                });
            }
        }

        if (this.gameState.isGameOver) {
            this.eventBus.dispatch(GameEvents.GAME_OVER, { winner: this.gameState.winner });
        }
    }
    
    // --- Helpers ---
    private findCardView(instanceId: number): Card | null {
        let view = this.playerView.findCardView(instanceId);
        if (view) return view;
        return this.opponentView.findCardView(instanceId);
    }

    // --- Deck Adjustment UI Handlers ---
    // These methods would be called by UI buttons/click events from Cocos components.

    public onCardClickedForAdjustment(cardInstanceId: number, currentLane: 'left' | 'mid' | 'right') {
        if (this.gameState.phase !== GamePhase.DeckAdjustment || this.gameState.activePlayer !== PlayerSide.Player) {
            console.log('[GameManager] Not in player\'s DeckAdjustment phase.');
            return;
        }

        // If a card is already selected, this click acts as a target lane selection for that card
        if (this.selectedCardForAdjustment) {
            // Check if clicking the same card again to deselect or moving within the same lane
            if (this.selectedCardForAdjustment.instanceId === cardInstanceId && this.selectedCardForAdjustment.fromLane === currentLane) {
                this.onCancelCardAdjustment();
            } else {
                // Treat this click as a target lane for the already selected card
                this.onLaneClickedForAdjustment(currentLane);
            }
        } else {
            // No card selected, so this click is to select a card
            this.selectedCardForAdjustment = { instanceId: cardInstanceId, fromLane: currentLane };
            console.log(`[GameManager] Selected card ${cardInstanceId} from ${currentLane} for adjustment.`);
            // TODO: Provide visual feedback for selected card
        }
    }

    public onLaneClickedForAdjustment(targetLane: 'left' | 'mid' | 'right') {
        if (this.gameState.phase !== GamePhase.DeckAdjustment || this.gameState.activePlayer !== PlayerSide.Player) {
            console.log('[GameManager] Not in player\'s DeckAdjustment phase.');
            return;
        }

        if (this.selectedCardForAdjustment) {
            const { instanceId, fromLane } = this.selectedCardForAdjustment;

            const action: IAction = {
                type: 'ADJUST_DECK',
                payload: {
                    cardInstanceId: instanceId,
                    fromLane: fromLane,
                    toLane: targetLane,
                }
            };
            this.gameFSM.dispatchAction(action);
            this.selectedCardForAdjustment = null; // Clear selection after dispatch
            this.updateFullView(); // Refresh view to show card moved and resources updated
            console.log(`[GameManager] Dispatched ADJUST_DECK for card ${instanceId} from ${fromLane} to ${targetLane}.`);
            // TODO: Provide visual feedback for success/failure (e.g., not enough resources)
        } else {
            console.warn('[GameManager] No card selected for adjustment.');
        }
    }

    public onCancelCardAdjustment() {
        this.selectedCardForAdjustment = null;
        console.log('[GameManager] Card adjustment selection cancelled.');
        // TODO: Clear visual feedback for selected card
    }
}