import { _decorator, Component, Node, Prefab, instantiate, resources, SpriteFrame } from 'cc';
import { Actor } from '../Actor';
import { Side, ActorState } from '../../Constants';
import { Slot } from '../Slot/Slot';
import { Card } from '../Card/Card';
import { IDeckData, CardDatabase } from '../../Data/CardData';

const { ccclass, property } = _decorator;

/**
 * @class Player
 * @extends Actor
 * @description Manages a player (either Own or Opponent), including their hero stats, card slots, and decks.
 */
@ccclass('Player')
export class Player extends Actor {

    /**
     * @property side
     * @description The player's side (Own or Opponent).
     */
    @property({ type: Side })
    side: Side = Side.Own;

    /**
     * @property heroCard
     * @description The visual Card component that represents this player/hero.
     *              The Player class now proxies its Actor properties to this card.
     */
    @property(Card)
    heroCard: Card = null;

    /**
     * @property slots
     * @description The card slots available to this player.
     */
    @property([Slot])
    slots: Slot[] = [];

    /**
     * @property cardPrefab
     * @description The prefab used to instantiate new cards.
     */
    @property(Prefab)
    cardPrefab: Prefab | null = null;

    // The actual card instances for each deck
    public leftDeck: Card[] = [];
    public midDeck: Card[] = [];
    public rightDeck: Card[] = [];

    // --- Proxy Properties to HeroCard ---

    get hp(): number {
        return this.heroCard ? this.heroCard.hp : 0;
    }
    set hp(val: number) {
        if (this.heroCard) this.heroCard.hp = val;
    }

    get attack(): number {
        return this.heroCard ? this.heroCard.attack : 0;
    }
    set attack(val: number) {
        if (this.heroCard) this.heroCard.attack = val;
    }

    get state(): ActorState {
        return this.heroCard ? this.heroCard.state : ActorState.Dead;
    }
    set state(val: ActorState) {
        if (this.heroCard) this.heroCard.state = val;
    }

    /**
     * @method initPlayer
     * @description Initializes the player's hero stats and their card decks.
     */
    public initPlayer(heroName: string, heroHp: number, heroAttack: number, heroCardId: number, deckData: IDeckData) {
        if (!this.heroCard) {
            console.error(`[Player] ${this.side} has no HeroCard assigned!`);
            return;
        }

        // Look up hero visual data from database
        const heroData = CardDatabase[heroCardId];
        const spritePath = heroData ? heroData.spriteFramePath : "";
        const description = heroData ? heroData.description : "Hero";

        // Initialize the hero card
        this.heroCard.initCard({
            id: heroCardId, 
            cardName: heroName,
            hp: heroHp,
            attack: heroAttack,
            description: description,
            spriteFramePath: spritePath
        });

        // Initialize the card decks
        this.initializeDecks(deckData);
    }

    /**
     * @method animateAttack
     * @description Proxies the attack animation to the hero card.
     */
    animateAttack(targetPos: any, callback: Function) {
        if (this.heroCard) {
            this.heroCard.animateAttack(targetPos, callback);
        } else {
            if(callback) callback();
        }
    }

    /**
     * @method initializeDecks
     * @description Creates all card instances based on deck data and populates the deck arrays.
     * @param deckData - The data defining which cards are in which deck.
     */
    private initializeDecks(deckData: IDeckData) {
        if (!this.cardPrefab) {
            console.error("Card Prefab is not set on the Player.");
            return;
        }

        // Helper function to create cards for a single deck
        const createDeck = (cardIds: number[]): Card[] => {
            const deck: Card[] = [];
            for (const id of cardIds) {
                const cardData = CardDatabase[id];
                if (cardData) {
                    const cardNode = instantiate(this.cardPrefab!);
                    cardNode.active = false; // Keep persistent instances inactive until placed
                    const cardComponent = cardNode.getComponent(Card);
                    if (cardComponent) {
                        // We will add an initCard method to Card.ts later
                        cardComponent.initCard(cardData);
                        deck.push(cardComponent);
                    }
                }
            }
            return deck;
        };

        this.leftDeck = createDeck(deckData.left);
        this.midDeck = createDeck(deckData.mid);
        this.rightDeck = createDeck(deckData.right);

        console.log(`Player ${this.side} decks initialized. Left: ${this.leftDeck.length}, Mid: ${this.midDeck.length}, Right: ${this.rightDeck.length}`);
    }

    /**
     * @method getCardFromDeck
     * @description Retrieves a card instance from the specified deck.
     * @param slotIndex - The index of the slot (0 for left, 1 for mid, 2 for right).
     * @returns {Card | null} A card instance or null if the deck is empty.
     */
    public getCardFromDeck(slotIndex: number): Card | null {
        let deck: Card[];
        if (slotIndex === 0) deck = this.leftDeck;
        else if (slotIndex === 1) deck = this.midDeck;
        else deck = this.rightDeck;

        // Find the first card that is still in the deck
        const card = deck.find(c => c.deckState === 'InDeck');
        if (card) {
            card.deckState = 'Used'; // Mark as used for this selection
            return card;
        }

        return null; // No available cards in this deck
    }

    /**
     * @method resetDeckStates
     * @description Resets the 'deckState' of all cards in all decks to 'InDeck'.
     */
    public resetDeckStates() {
        const allDecks = [...this.leftDeck, ...this.midDeck, ...this.rightDeck];
        for (const card of allDecks) {
            if (card.state !== ActorState.Dead) { // Don't reset dead cards
                card.deckState = 'InDeck';
            }
        }
    }

    /**
     * @method getLivingCards
     * @description Returns a list of all cards in the slots that are not dead.
     * @returns {Card[]} An array of active Card components.
     */
    getLivingCards(): Card[] {
        return this.slots
            .map(slot => slot.card)
            .filter(card => card !== null && card.state !== ActorState.Dead) as Card[];
    }
}
