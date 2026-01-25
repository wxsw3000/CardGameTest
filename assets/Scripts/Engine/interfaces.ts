/**
 * @file interfaces.ts
 * @description Defines the core data interfaces for the game engine.
 *              These interfaces are pure data and have no dependency on Cocos Creator.
 */

//----------------------------------------------------------------//
//                          ENUMS
//----------------------------------------------------------------//

/**
 * Defines which player's side.
 */
export enum PlayerSide {
    Player,
    Opponent,
}

/**
 * Defines the main phases of a game turn.
 */
export enum GamePhase {
    // Game is waiting to start or has finished
    Idle,
    // Initial card draw and first player determination
    PreBattle,
    // The turn is starting, resources are given, "start of turn" effects trigger
    TurnStart,
    // The active player can adjust their decks
    DeckAdjustment,
    // The active player chooses which cards to keep, then new cards are drawn
    Rotation,
    // Combat animations and logic are resolved
    Combat,
    // "End of turn" effects trigger
    TurnEnd,
}

/**
 * The type of a card, determining its behavior.
 */
export enum CardType {
    Infantry, // 步兵
    Cavalry,  // 骑兵
    Archer,   // 弓兵
    Hero,     // 英雄
}

//----------------------------------------------------------------//
//                          GAME STATE
//----------------------------------------------------------------//

/**
 * Represents the state of a single card instance in the game.
 * This is a "live" card, not the static database definition.
 */
export interface ICardState {
    instanceId: number;  // A unique ID for this specific instance of the card
    staticId: number;    // The ID from the CardDatabase (e.g., 1 for "陈庆之")

    hp: number;
    attack: number;
    
    // More properties to be added later based on rules:
    // buffs: IBuff[];
    // specialConditions: string[];
}

/**
 * Represents one of the three card slots on the battlefield.
 */
export interface ISlotState {
    card: ICardState | null; // The card currently in this slot
}

/**
 * Represents the state of one of the players in the match.
 */
export interface IPlayerState {
    side: PlayerSide;
    hero: ICardState;
    
    slots: [ISlotState, ISlotState, ISlotState];

    // Decks now store the instance IDs of cards, not the full card objects.
    leftDeck: number[];
    midDeck: number[];
    rightDeck: number[];

    resources: number;
}

/**
 * The root interface for the entire state of a match.
 * This object represents a single source of truth for the game's current state.
 */
export interface IGameState {
    // A map of all active card instances in the game, keyed by their unique instanceId.
    cards: { [instanceId: number]: ICardState };

    players: {
        [PlayerSide.Player]: IPlayerState;
        [PlayerSide.Opponent]: IPlayerState;
    };

    turn: number;                 // Current turn number
    activePlayer: PlayerSide;     // The side of the player whose turn it is
    phase: GamePhase;             // The current phase of the turn
    
    isGameOver: boolean;
    winner: PlayerSide | null;

    // A flag to ensure the "Old Wang Meet" event only happens once per turn.
    oldWangMeetHappenedThisTurn: boolean;
}

//----------------------------------------------------------------//
//                          ACTIONS
//----------------------------------------------------------------//

/**
 * Represents an action taken by a player, AI, or network event.
 * The game engine receives actions and updates the game state accordingly.
 * This is the key to supporting AI and networking.
 */
export interface IAction {
    type: string;     // e.g., 'END_TURN', 'ADJUST_DECK'
    payload?: any;    // Data associated with the action
}

/**
 * Example Action Payloads
 * 
 * For 'ADJUST_DECK':
 * payload: {
 *   cardInstanceId: number;
 *   fromLane: 'left' | 'mid' | 'right';
 *   toLane: 'left' | 'mid' | 'right';
 * }
 * 
 * For 'CONFIRM_ROTATION':
 * payload: {
 *   keepInLane: {
 *     left: boolean;
 *     mid: boolean;
 *     right: boolean;
 *   }
 * }
 */
 
//----------------------------------------------------------------//
//                      COMBAT LOG & EVENTS
//----------------------------------------------------------------//

/**
 * The top-level structure holding the entire log for a combat phase.
 */
export interface ICombatLog {
    events: CombatEvent[];
}

/**
 * Represents a single, atomic event that occurs during combat.
 * The entire combat phase is an array of these events.
 */
export type CombatEvent = 
    | AttackEvent
    | DamageEvent
    | DeathEvent
    | GameOverEvent;

/**
 * Event: A unit initiates an attack on another unit.
 * This triggers the "move towards target" animation.
 */
export interface AttackEvent {
    type: 'attack';
    attackerId: number;
    defenderId: number;
}

/**
 * Event: A unit's HP changes.
 * This triggers a "damage number" popup and an HP bar update.
 */
export interface DamageEvent {
    type: 'damage';
    targetId: number;
    damage: number;
    newHp: number;
}

/**
 * Event: A unit's HP drops to 0 or below.
 * This triggers the "death" animation.
 */
export interface DeathEvent {
    type: 'death';
    targetId: number;
}

/**
 * Event: The game has ended.
 * This triggers the "Victory/Defeat" screen.
 */
export interface GameOverEvent {
    type: 'gameOver';
    winner: PlayerSide;
}

