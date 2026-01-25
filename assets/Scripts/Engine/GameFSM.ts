/**
 * @file GameFSM.ts
 * @description A Finite State Machine to manage the game's turn phases.
 */

import { GamePhase, IGameState, IAction, PlayerSide, IPlayerState, ICombatLog } from './interfaces';
import { EventBus, GameEvents } from './EventBus';
import { DeckSystem } from './Systems/DeckSystem';
import { CombatSystem } from './Systems/CombatSystem';

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
        this.eventBus.dispatch(GameEvents.PHASE_CHANGED, { newPhase: this.getPhase(), data: data });
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

        DeckSystem.drawInitialCards(this.gameState);

        const playerAttack = this.calculateTotalAttack(this.gameState.players[PlayerSide.Player]);
        const opponentAttack = this.calculateTotalAttack(this.gameState.players[PlayerSide.Opponent]);

        if (playerAttack > opponentAttack) this.gameState.activePlayer = PlayerSide.Player;
        else if (opponentAttack > playerAttack) this.gameState.activePlayer = PlayerSide.Opponent;
        else this.gameState.activePlayer = Math.random() < 0.5 ? PlayerSide.Player : PlayerSide.Opponent;
        
        console.log(`[FSM] ${PlayerSide[this.gameState.activePlayer]} will go first.`);
        this.gameState.turn = 1;

        // The first turn jumps to combat, but no combat actually happens.
        // Simulate an empty combat phase.
        const { log, finalState } = CombatSystem.simulateCombat(this.gameState);
        
        // This is a bit awkward, but we need to update the FSM's state reference
        Object.assign(this.fsm.getGameState(), finalState);
        
        this.fsm.transitionTo(GamePhase.Combat, log);
    }

    private calculateTotalAttack(playerState: IPlayerState): number {
        return playerState.slots.reduce((sum, slot) => sum + (slot.card ? slot.card.attack : 0), 0);
    }
}

class TurnStartState extends AState {
    getPhase(): GamePhase { return GamePhase.TurnStart; }
    onEnter(): void {
        super.onEnter();
        this.gameState.turn++;
        this.gameState.oldWangMeetHappenedThisTurn = false;
        
        const activePlayerState = this.gameState.players[this.gameState.activePlayer];
        activePlayerState.resources += 5;
        console.log(`[FSM] Granted 5 resources to ${PlayerSide[this.gameState.activePlayer]}.`);

        console.log(`--- Turn ${this.gameState.turn} (${PlayerSide[this.gameState.activePlayer]}) ---`);
        this.fsm.transitionTo(GamePhase.DeckAdjustment);
    }
}

class DeckAdjustmentState extends AState {
    getPhase(): GamePhase { return GamePhase.DeckAdjustment; }
    onEnter(): void { super.onEnter(); }
    onAction(action: IAction): void {
        if (action.type === 'ADJUST_DECK') {
            const { cardInstanceId, fromLane, toLane } = action.payload;
            DeckSystem.adjustDeck(this.gameState, cardInstanceId, fromLane, toLane);
        } else if (action.type === 'CONFIRM_ADJUSTMENT') {
            this.fsm.transitionTo(GamePhase.Rotation);
        }
    }
}

class RotationState extends AState {
    getPhase(): GamePhase { return GamePhase.Rotation; }
    onEnter(): void { super.onEnter(); }
    onAction(action: IAction): void {
        if (action.type === 'CONFIRM_ROTATION') {
            const playerState = this.gameState.players[this.gameState.activePlayer];
            const { keepInLane } = action.payload;
            const rotationCostPerLane = 1;

            let lanesToRotate = 0;
            if (!keepInLane.left) lanesToRotate++;
            if (!keepInLane.mid) lanesToRotate++;
            if (!keepInLane.right) lanesToRotate++;

            const totalCost = lanesToRotate * rotationCostPerLane;
            if (playerState.resources < totalCost) {
                console.log(`[FSM] Not enough resources to rotate.`);
                return;
            }

            playerState.resources -= totalCost;
            
            // 1. Draw new cards into the current state
            DeckSystem.drawCards(this.gameState, keepInLane);
            
            // 2. Simulate combat based on the new state
            const { log, finalState } = CombatSystem.simulateCombat(this.gameState);
            
            // 3. Apply the results of the simulation back to the authoritative game state
            Object.assign(this.fsm.getGameState(), finalState);

            // 4. Transition to Combat phase, passing the log for animation
            this.fsm.transitionTo(GamePhase.Combat, log);
        }
    }
}

class CombatState extends AState {
    getPhase(): GamePhase { return GamePhase.Combat; }
    onEnter(log: ICombatLog): void {
        // We pass the log up to the GameManager via the event bus
        this.eventBus.dispatch(GameEvents.PHASE_CHANGED, { newPhase: this.getPhase(), data: log });
        console.log(`[FSM] Entering ${GamePhase[this.getPhase()]} phase.`);
    }
    onAction(action: IAction): void {
        if (action.type === 'COMBAT_COMPLETE') {
            this.fsm.transitionTo(GamePhase.TurnEnd);
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

    // A getter to allow states to get and modify the authoritative state object.
    public getGameState(): IGameState {
        return this.gameState;
    }

    private registerStates(): void {
        this.states.set(GamePhase.Idle, new IdleState(this, this.gameState));
        this.states.set(GamePhase.PreBattle, new PreBattleState(this, this.gameState));
        this.states.set(GamePhase.TurnStart, new TurnStartState(this, this.gameState));
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