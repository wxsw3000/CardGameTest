/**
 * @file GameFSM.ts
 * @description A Finite State Machine to manage the game's turn phases.
 */

import { GamePhase, IGameState, IAction, PlayerSide } from './interfaces';
import { EventBus, GameEvents } from './EventBus';
import { DeckSystem } from './Systems/DeckSystem';

/**
 * @abstract
 * @class AState
 * @description Base class for all states in the FSM.
 */
abstract class AState {
    protected fsm: GameFSM;
    protected gameState: IGameState;
    protected eventBus = EventBus.getInstance();

    constructor(fsm: GameFSM, gameState: IGameState) {
        this.fsm = fsm;
        this.gameState = gameState;
    }

    abstract getPhase(): GamePhase;
    onEnter(data?: any): void {
        this.gameState.phase = this.getPhase();
        this.eventBus.dispatch(GameEvents.PHASE_CHANGED, { newPhase: this.getPhase() });
        console.log(`[FSM] Entering ${GamePhase[this.getPhase()]} phase.`);
    }
    update(dt: number): void {}
    onExit(): void {}
    onAction(action: IAction): void {}
}

//----------------------------------------------------------------//
//                          CONCRETE STATES
//----------------------------------------------------------------//

class IdleState extends AState {
    getPhase(): GamePhase { return GamePhase.Idle; }
}

class PreBattleState extends AState {
    getPhase(): GamePhase { return GamePhase.PreBattle; }
    onEnter(): void {
        super.onEnter();

        // 1. Draw initial cards for both players
        DeckSystem.drawInitialCards(this.gameState);

        // 2. Determine who goes first
        const playerAttack = this.calculateTotalAttack(this.gameState.players[PlayerSide.Player]);
        const opponentAttack = this.calculateTotalAttack(this.gameState.players[PlayerSide.Opponent]);

        if (playerAttack > opponentAttack) {
            this.gameState.activePlayer = PlayerSide.Player;
        } else if (opponentAttack > playerAttack) {
            this.gameState.activePlayer = PlayerSide.Opponent;
        } else {
            // If attack is tied, choose randomly
            this.gameState.activePlayer = Math.random() < 0.5 ? PlayerSide.Player : PlayerSide.Opponent;
        }
        
        console.log(`[FSM] Player Attack: ${playerAttack}, Opponent Attack: ${opponentAttack}.`);
        console.log(`[FSM] ${PlayerSide[this.gameState.activePlayer]} will go first.`);

        // 3. Set turn to 1 and jump to Combat phase
        this.gameState.turn = 1;
        this.fsm.transitionTo(GamePhase.Combat);
    }

    private calculateTotalAttack(playerState: IPlayerState): number {
        return playerState.slots.reduce((sum, slot) => {
            return sum + (slot.card ? slot.card.attack : 0);
        }, 0);
    }
}

class TurnStartState extends AState {
    getPhase(): GamePhase { return GamePhase.TurnStart; }
    onEnter(): void {
        super.onEnter();
        this.gameState.turn++;
        this.gameState.oldWangMeetHappenedThisTurn = false; // Reset the flag for the new turn
        
        // Grant resources to the active player
        const activePlayerState = this.gameState.players[this.gameState.activePlayer];
        activePlayerState.resources += 5; // Grant 5 resources per turn
        console.log(`[FSM] Granted 5 resources to ${PlayerSide[this.gameState.activePlayer]}. Total: ${activePlayerState.resources}`);

        console.log(`--- Turn ${this.gameState.turn} (${PlayerSide[this.gameState.activePlayer]}) ---`);
        this.fsm.transitionTo(GamePhase.DeckAdjustment);
    }
}

class DeckAdjustmentState extends AState {
    getPhase(): GamePhase { return GamePhase.DeckAdjustment; }
    onEnter(): void {
        super.onEnter();
        // The FSM now waits here for the player/AI to make deck adjustments.
    }
    onAction(action: IAction): void {
        switch (action.type) {
            case 'ADJUST_DECK':
                const { cardInstanceId, fromLane, toLane } = action.payload;
                DeckSystem.adjustDeck(this.gameState, cardInstanceId, fromLane, toLane);
                // Note: We might want to dispatch an event here so the UI can update
                // For now, the state is just updated internally.
                break;
            case 'CONFIRM_ADJUSTMENT':
                console.log('[FSM] Deck adjustment confirmed.');
                this.fsm.transitionTo(GamePhase.Rotation);
                break;
        }
    }
}

class RotationState extends AState {
    getPhase(): GamePhase { return GamePhase.Rotation; }
    onEnter(): void {
        super.onEnter();
        // The FSM now waits here until an action is dispatched.
    }
    onAction(action: IAction): void {
        if (action.type === 'CONFIRM_ROTATION') {
            const playerState = this.gameState.players[this.gameState.activePlayer];
            const { keepInLane } = action.payload;
            const rotationCostPerLane = 1; // Z from the rules doc

            let lanesToRotate = 0;
            if (!keepInLane.left) lanesToRotate++;
            if (!keepInLane.mid) lanesToRotate++;
            if (!keepInLane.right) lanesToRotate++;

            const totalCost = lanesToRotate * rotationCostPerLane;

            if (playerState.resources < totalCost) {
                console.log(`[FSM] Not enough resources to rotate. Needs ${totalCost}, has ${playerState.resources}.`);
                // NOTE: Inform UI that the action failed.
                return; // Stay in Rotation phase
            }

            // Deduct resources and proceed
            playerState.resources -= totalCost;
            console.log(`[FSM] Rotated ${lanesToRotate} lanes for ${totalCost} resources.`);

            DeckSystem.drawCards(this.gameState, action.payload.keepInLane);
            this.fsm.transitionTo(GamePhase.Combat);
        }
    }
}

class CombatState extends AState {
    getPhase(): GamePhase { return GamePhase.Combat; }
    onEnter(actions: any): void { // Receives combat actions
        super.onEnter();
        // The GameManager will now drive the combat animations.
        // Once animations are complete, GameManager will dispatch an action to move to the next phase.
    }
    onAction(action: IAction): void {
        if (action.type === 'COMBAT_COMPLETE') {
            this.checkForOldWangMeet();
            this.fsm.transitionTo(GamePhase.TurnEnd);
        }
    }

    private checkForOldWangMeet() {
        // After combat, check if any cards in slots are dead and remove them
        for (const side of [PlayerSide.Player, PlayerSide.Opponent]) {
            const playerState = this.gameState.players[side];
            for (const slot of playerState.slots) {
                if (slot.card && slot.card.hp <= 0) {
                    slot.card = null; // Remove dead card from slot
                }
            }
        }
        
        if (this.gameState.oldWangMeetHappenedThisTurn) return;

        const playerMidSlot = this.gameState.players[PlayerSide.Player].slots[1];
        const opponentMidSlot = this.gameState.players[PlayerSide.Opponent].slots[1];

        if (playerMidSlot.card === null && opponentMidSlot.card === null) {
            console.log('[FSM] Old Wang Meet triggered!');
            this.gameState.oldWangMeetHappenedThisTurn = true;

            const playerHero = this.gameState.players[PlayerSide.Player].hero;
            const opponentHero = this.gameState.players[PlayerSide.Opponent].hero;

            // Heroes attack each other
            playerHero.hp -= opponentHero.attack;
            opponentHero.hp -= playerHero.attack;
            
            console.log(`[FSM] Player Hero takes ${opponentHero.attack} damage. HP: ${playerHero.hp}`);
            console.log(`[FSM] Opponent Hero takes ${playerHero.attack} damage. HP: ${opponentHero.hp}`);
            
            // TODO: Dispatch an event so the UI can show this.
            // TODO: Check for game over condition here.
        }
    }
}

class TurnEndState extends AState {
    getPhase(): GamePhase { return GamePhase.TurnEnd; }
    onEnter(): void {
        super.onEnter();
        if (this.gameState.isGameOver) {
            this.fsm.transitionTo(GamePhase.Idle);
            return;
        }
        // Switch active player
        this.gameState.activePlayer = this.gameState.activePlayer === PlayerSide.Player 
            ? PlayerSide.Opponent 
            : PlayerSide.Player;
            
        this.fsm.transitionTo(GamePhase.TurnStart);
    }
}

//----------------------------------------------------------------//
//                          FSM CONTROLLER
//----------------------------------------------------------------//

export class GameFSM {
    private states: Map<GamePhase, AState> = new Map();
    private currentState: AState | null = null;
    private gameState: IGameState;

    constructor(gameState: IGameState) {
        this.gameState = gameState;
        this.registerStates();
        this.currentState = this.states.get(GamePhase.Idle)!;
        this.currentState.onEnter();
    }

    private registerStates(): void {
        this.states.set(GamePhase.Idle, new IdleState(this, this.gameState));
        this.states.set(GamePhase.PreBattle, new PreBattleState(this, this.gameState));
        this.states.set(GamePhase.TurnStart, new TurnStartState(this, this.gameState));
        // Skipping DeckAdjustment for now to simplify
        this.states.set(GamePhase.DeckAdjustment, new DeckAdjustmentState(this, this.gameState));
        this.states.set(GamePhase.Rotation, new RotationState(this, this.gameState));
        this.states.set(GamePhase.Combat, new CombatState(this, this.gameState));
        this.states.set(GamePhase.TurnEnd, new TurnEndState(this, this.gameState));
    }

    public transitionTo(phase: GamePhase, data?: any): void {
        const newState = this.states.get(phase);
        if (!newState) {
            console.error(`[FSM] Attempted to transition to unregistered state: ${GamePhase[phase]}`);
            return;
        }
        if (this.currentState) {
            this.currentState.onExit();
        }
        this.currentState = newState;
        this.currentState.onEnter(data);
    }
    
    public dispatchAction(action: IAction): void {
        if (this.currentState) {
            this.currentState.onAction(action);
        }
    }

    public update(dt: number): void {
        if (this.currentState) {
            this.currentState.update(dt);
        }
    }
}