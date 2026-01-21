/**
 * @file DeckSystem.ts
 * @description A system for handling deck and card drawing logic.
 */

import { IGameState, PlayerSide, IPlayerState } from "../interfaces";
import { CardDatabase } from "../Data/CardData";

export class DeckSystem {

    /**
     * Draws new cards for the active player based on which slots they chose not to keep.
     * @param gameState The current game state.
     * @param keepInLane An object indicating which lanes to keep the current card in.
     * @returns The updated game state.
     */
    public static drawCards(gameState: IGameState, keepInLane: { left: boolean, mid: boolean, right: boolean }): IGameState {
        const playerState = gameState.players[gameState.activePlayer];

        // 1. Return cards from non-kept lanes to their decks.
        // (In our current model, cards are never truly "in" a deck, so we just clear the slot)
        
        // 2. Clear non-kept slots
        if (!keepInLane.left) playerState.slots[0].card = null;
        if (!keepInLane.mid) playerState.slots[1].card = null;
        if (!keepInLane.right) playerState.slots[2].card = null;
        
        // 3. Draw new cards for empty slots
        for (let i = 0; i < 3; i++) {
            if (playerState.slots[i].card === null) {
                const deck = this.getDeckForSlot(playerState, i);
                if (deck.length > 0) {
                    // Simple logic: draw the first card from the deck array.
                    // A real implementation would handle shuffling.
                    const drawnCardInstanceId = deck.shift();
                    if (drawnCardInstanceId !== undefined) {
                        playerState.slots[i].card = gameState.cards[drawnCardInstanceId];
                        // Put the card at the back of the deck to simulate cycling
                        deck.push(drawnCardInstanceId);
                    }
                }
            }
        }

        return gameState;
    }

    private static getDeckForSlot(playerState: IPlayerState, slotIndex: number): number[] {
        if (slotIndex === 0) return playerState.leftDeck;
        if (slotIndex === 1) return playerState.midDeck;
        return playerState.rightDeck;
    }

    private static getDeckForLaneName(playerState: IPlayerState, laneName: 'left' | 'mid' | 'right'): number[] {
        if (laneName === 'left') return playerState.leftDeck;
        if (laneName === 'mid') return playerState.midDeck;
        return playerState.rightDeck;
    }

    /**
     * Moves a card from one deck to another for the active player.
     * @param gameState The current game state.
     * @param cardInstanceId The instance ID of the card to move.
     * @param fromLane The name of the source lane.
     * @param toLane The name of the destination lane.
     */
    public static adjustDeck(gameState: IGameState, cardInstanceId: number, fromLane: 'left' | 'mid' | 'right', toLane: 'left' | 'mid' | 'right'): void {
        if (fromLane === toLane) return;

        const playerState = gameState.players[gameState.activePlayer];
        const cardState = gameState.cards[cardInstanceId];
        if (!cardState) {
            console.warn(`[DeckSystem] adjustDeck failed: Card instance ${cardInstanceId} not found.`);
            return;
        }

        const staticCardData = CardDatabase[cardState.staticId];
        if (!staticCardData) {
            console.warn(`[DeckSystem] adjustDeck failed: Card static data ${cardState.staticId} not found.`);
            return;
        }

        const cost = staticCardData.adjustCost;
        if (playerState.resources < cost) {
            console.log(`[DeckSystem] Not enough resources to move card ${cardInstanceId}. Needs ${cost}, has ${playerState.resources}.`);
            // NOTE: We might want to dispatch an event here to inform the UI
            return;
        }

        const fromDeck = this.getDeckForLaneName(playerState, fromLane);
        const toDeck = this.getDeckForLaneName(playerState, toLane);

        const cardIndex = fromDeck.indexOf(cardInstanceId);

        if (cardIndex > -1) {
            // It's a valid move, so deduct resources and move the card
            playerState.resources -= cost;
            fromDeck.splice(cardIndex, 1);
            toDeck.push(cardInstanceId);
            console.log(`[DeckSystem] Moved card ${cardInstanceId} from ${fromLane} to ${toLane} for ${cost} resources.`);
        } else {
            console.warn(`[DeckSystem] Card ${cardInstanceId} not found in ${fromLane} deck.`);
        }
    }

    /**
     * Draws one card for each lane for both players at the start of the game.
     * @param gameState The current game state.
     */
    public static drawInitialCards(gameState: IGameState): void {
        console.log('[DeckSystem] Drawing initial cards for both players.');
        for (const side of [PlayerSide.Player, PlayerSide.Opponent]) {
            const playerState = gameState.players[side];
            for (let i = 0; i < 3; i++) {
                if (playerState.slots[i].card === null) {
                    const deck = this.getDeckForSlot(playerState, i);
                    if (deck.length > 0) {
                        const drawnCardInstanceId = deck.shift(); // Draw from the top
                        if (drawnCardInstanceId !== undefined) {
                            playerState.slots[i].card = gameState.cards[drawnCardInstanceId];
                            deck.push(drawnCardInstanceId); // Cycle to the back
                        }
                    }
                }
            }
        }
    }
}
