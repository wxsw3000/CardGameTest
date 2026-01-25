/**
 * @file AIController.ts
 * @description A simple AI controller for the opponent.
 */

import { IGameState, IAction, GamePhase, PlayerSide } from '../interfaces';

export class AIController {

    /**
     * Makes a decision based on the current game state and phase.
     * @param gameState The current state of the game.
     * @returns An action for the AI to perform, or null if no action is to be taken.
     */
    public static decideAction(gameState: IGameState): IAction | null {
        // The AI only acts if it's its turn.
        if (gameState.activePlayer !== PlayerSide.Opponent) {
            return null;
        }

        switch (gameState.phase) {
            case GamePhase.DeckAdjustment:
                // For now, the AI will not perform any deck adjustments.
                // It immediately confirms that it's done with this phase.
                return { type: 'CONFIRM_ADJUSTMENT' };

            case GamePhase.Rotation:
                // For now, the AI will never keep cards on the field.
                // It always opts for a full new hand.
                return {
                    type: 'CONFIRM_ROTATION',
                    payload: {
                        keepInLane: {
                            left: false,
                            mid: false,
                            right: false,
                        }
                    }
                };
            
            default:
                // In other phases, the AI doesn't have active decisions to make.
                return null;
        }
    }
}
