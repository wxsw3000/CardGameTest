import { Player } from "../Player/Player";
import { Card } from "../Card/Card";
import { Actor } from "../Actor";
import { ActorState } from "../../Constants";

// Represents a single combat action to be animated and resolved.
export interface IBattleAction {
    attacker: Actor;
    defender: Actor;
    type: 'CardVsCard' | 'CardVsHero' | 'HeroVsCard';
}

/**
 * @class Battle
 * @description A static class to calculate and resolve combat based on detailed turn-based rules.
 */
export class Battle {

    /**
     * @method calculateTurn
     * @description Calculates the sequence of attacks for the current turn based on game rules.
     *              Does NOT apply damage, only determines the actions.
     * @param actingPlayer The player whose turn it is.
     * @param defendingPlayer The player who is being attacked.
     * @returns An array of IBattleAction objects representing the sequence of combat.
     */
    public static calculateTurn(actingPlayer: Player, defendingPlayer: Player): IBattleAction[] {
        const actions: IBattleAction[] = [];
        const actingCards = actingPlayer.slots.map(s => s.card);
        const defendingCards = defendingPlayer.slots.map(s => s.card);

        // Lane targeting rule: 0->2, 1->1, 2->0
        const targetLaneMap = [2, 1, 0];

        // --- Action Order: Left Card -> Mid Card -> Right Card ---
        for (let i = 0; i < 3; i++) {
            const attackerCard = actingCards[i];
            if (attackerCard && attackerCard.state === ActorState.Normal) {
                const targetLaneIndex = targetLaneMap[i];
                const defenderCard = defendingCards[targetLaneIndex];

                if (defenderCard && defenderCard.state === ActorState.Normal) {
                    // Card vs Card
                    actions.push({ attacker: attackerCard, defender: defenderCard, type: 'CardVsCard' });
                } else {
                    // Card vs Hero (direct hit)
                    actions.push({ attacker: attackerCard, defender: defendingPlayer, type: 'CardVsHero' });
                }
            }
        }

        // --- Action Order: Hero Attacks ---
        for (let i = 0; i < 3; i++) {
            const attackerCard = actingCards[i];
            // If the acting player has no card in a lane, their hero attacks.
            if (!attackerCard || attackerCard.state === ActorState.Dead) {
                const targetLaneIndex = targetLaneMap[i];
                const defenderCard = defendingCards[targetLaneIndex];

                if (defenderCard && defenderCard.state === ActorState.Normal) {
                     // Hero vs Card
                    actions.push({ attacker: actingPlayer, defender: defenderCard, type: 'HeroVsCard' });
                }
                // Note: The rule "hero attacks enemy hero" is implicitly covered
                // if all three opposing slots are empty, as the cards would attack the hero directly.
                // A hero-vs-hero direct attack is not explicitly defined, so we omit it.
            }
        }
        
        return actions;
    }

    /**
     * @method applyAction
     * @description Applies the damage for a single battle action.
     * @param action The battle action to resolve.
     */
    public static applyAction(action: IBattleAction) {
        if (action.attacker.state === ActorState.Dead || action.defender.state === ActorState.Dead) {
            // If either combatant is already dead (e.g. from a previous action in the same turn), do nothing.
            return;
        }

        const attackerAttack = action.attacker.attack;
        const defenderAttack = action.defender.attack;

        // Simultaneous damage
        action.defender.hp -= attackerAttack;
        action.attacker.hp -= defenderAttack;
    }

    /**
     * @method handleDefeatedCards
     * @description Checks for defeated cards after a turn and removes them from their decks permanently.
     * @param player1 A player in the match.
     * @param player2 The other player in the match.
     */
    public static handleDefeatedCards(player1: Player, player2: Player) {
        const allCards = [
            ...player1.leftDeck, ...player1.midDeck, ...player1.rightDeck,
            ...player2.leftDeck, ...player2.midDeck, ...player2.rightDeck
        ];

        for (const card of allCards) {
            if (card.state === ActorState.Dead) {
                // Find and remove the card from any deck it might be in.
                const decks = [
                    player1.leftDeck, player1.midDeck, player1.rightDeck,
                    player2.leftDeck, player2.midDeck, player2.rightDeck
                ];
                for(const deck of decks) {
                    const index = deck.indexOf(card);
                    if (index > -1) {
                        deck.splice(index, 1);
                    }
                }
            }
        }
    }
}
