/**
 * @file GameStateFactory.ts
 * @description A factory to create a fresh initial game state.
 */

import { IGameState, IPlayerState, ICardState, PlayerSide, GamePhase, ISlotState } from '../interfaces';
import { CardDatabase, PlayerDecks, OpponentDecks, IDeckData, IStaticCardData } from '../Data/CardData';

let nextCardInstanceId = 0;

export class GameStateFactory {

    /**
     * Creates a fresh IGameState for the start of a match.
     */
    public static createInitialState(): IGameState {

        const allCards: { [instanceId: number]: ICardState } = {};

        const playerState = this.createPlayerState(PlayerSide.Player, PlayerDecks, allCards);
        const opponentState = this.createPlayerState(PlayerSide.Opponent, OpponentDecks, allCards);

        const gameState: IGameState = {
            cards: allCards,
            players: {
                [PlayerSide.Player]: playerState,
                [PlayerSide.Opponent]: opponentState,
            },
            turn: 1,
            activePlayer: PlayerSide.Player, // Player always starts for now
            phase: GamePhase.Idle,
            isGameOver: false,
            winner: null,
            oldWangMeetHappenedThisTurn: false,
        };

        return gameState;
    }

    /**
     * Creates the state for a single player, including their hero and decks.
     */
    private static createPlayerState(side: PlayerSide, deckData: IDeckData, allCards: { [id: number]: ICardState }): IPlayerState {
        
        // In the future, hero selection would be dynamic.
        // For now, hardcode Player -> Yue Fei (2), Opponent -> Bai Qi (3)
        const heroStaticId = side === PlayerSide.Player ? 2 : 3;
        const heroCardData = CardDatabase[heroStaticId];

        const heroState = this.createCardState(heroCardData, allCards);
        
        const createDeck = (staticIds: number[]): number[] => {
            return staticIds.map(id => {
                const cardData = CardDatabase[id];
                const cardState = this.createCardState(cardData, allCards);
                return cardState.instanceId;
            });
        };

        const playerState: IPlayerState = {
            side: side,
            hero: heroState,
            slots: [
                { card: null },
                { card: null },
                { card: null },
            ],
            leftDeck: createDeck(deckData.left),
            midDeck: createDeck(deckData.mid),
            rightDeck: createDeck(deckData.right),
            resources: 10, // Starting resources as per rules doc
        };

        return playerState;
    }

    /**
     * Creates a single card instance and adds it to the global card map.
     */
    private static createCardState(staticData: IStaticCardData, allCards: { [id: number]: ICardState }): ICardState {
        const cardState: ICardState = {
            instanceId: nextCardInstanceId++,
            staticId: staticData.id,
            hp: staticData.hp,
            attack: staticData.attack,
        };
        allCards[cardState.instanceId] = cardState;
        return cardState;
    }
}
