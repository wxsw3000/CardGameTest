/**
 * @file CombatSystem.ts
 * @description A system for handling combat logic.
 */

import { IGameState, PlayerSide } from '../interfaces';
import { CardDatabase } from '../Data/CardData';

// Represents a single calculated combat action.
export interface ICombatAction {
    attackerId: number;
    defenderId: number;
}

export class CombatSystem {

    /**
     * Applies the damage for a single combat action.
     * NOTE: This function mutates the gameState.
     * @param gameState The current state of the game.
     * @param action The action to apply.
     */
    public static applyAction(gameState: IGameState, action: ICombatAction): void {
        const attacker = gameState.cards[action.attackerId];
        const defender = gameState.cards[action.defenderId];

        if (!attacker || attacker.hp <= 0 || !defender || defender.hp <= 0) {
            return;
        }

        const attackerDamage = defender.attack;
        const defenderDamage = attacker.attack;

        attacker.hp -= attackerDamage;
        defender.hp -= defenderDamage;
    }

    /**
     * Calculates the sequence of attacks for the current turn.
     * @returns An array of ICombatAction objects representing the sequence of combat.
     */
    public static calculateActions(gameState: IGameState): ICombatAction[] {
        const actions: ICombatAction[] = [];
        const foughtCardIds = new Set<number>();
        
        const actingPlayer = gameState.players[gameState.activePlayer];
        const defendingPlayer = gameState.players[gameState.activePlayer === PlayerSide.Player ? PlayerSide.Opponent : PlayerSide.Player];

        const actingCards = actingPlayer.slots.map(s => s.card);
        const defendingCards = defendingPlayer.slots.map(s => s.card);

        // Lane targeting rule: 0->2, 1->1, 2->0 (Player's left vs Opponent's right, etc.)
        const targetLaneMap = [2, 1, 0];

        const createAttack = (attackerCard: any) => {
            const i = actingCards.findIndex(c => c && c.instanceId === attackerCard.instanceId);
            if (i === -1) return; // Card not found in a slot

            let defenderCard: any = null;
            const attackerStaticData = CardDatabase[attackerCard.staticId];

            // Skill-based targeting
            if (attackerStaticData && attackerStaticData.skill === 'AttackLowestHP') {
                console.log(`[Combat] Card ${attackerCard.staticId} is using AttackLowestHP skill.`);
                let lowestHp = Infinity;
                let lowestHpCard = null;
                for (const card of defendingCards) {
                    if (card && card.hp > 0 && card.hp < lowestHp) {
                        lowestHp = card.hp;
                        lowestHpCard = card;
                    }
                }
                defenderCard = lowestHpCard; // Can be null if no cards on board
            } 
            // Default lane-based targeting
            else {
                const targetLaneIndex = targetLaneMap[i];
                defenderCard = defendingCards[targetLaneIndex];
            }

            if (defenderCard && defenderCard.hp > 0) {
                actions.push({ attackerId: attackerCard.instanceId, defenderId: defenderCard.instanceId });
            } else {
                // If no valid card defender, target the hero
                actions.push({ attackerId: attackerCard.instanceId, defenderId: defendingPlayer.hero.instanceId });
            }
            foughtCardIds.add(attackerCard.instanceId);
        };

        // --- 1st Pass: Priority Attacks ---
        console.log('[Combat] Calculating Priority Actions...');
        for (const attackerCard of actingCards) {
            if (attackerCard && attackerCard.hp > 0) {
                const staticData = CardDatabase[attackerCard.staticId];
                if (staticData && staticData.hasPriority) {
                    createAttack(attackerCard);
                }
            }
        }

        // --- 2nd Pass: Normal Attacks ---
        console.log('[Combat] Calculating Normal Actions...');
        for (const attackerCard of actingCards) {
            if (attackerCard && attackerCard.hp > 0 && !foughtCardIds.has(attackerCard.instanceId)) {
                createAttack(attackerCard);
            }
        }
        
        // --- 3rd Pass: Hero Attacks (if lane is empty) ---
        console.log('[Combat] Calculating Hero Actions...');
        for (let i = 0; i < 3; i++) {
            const attackerCard = actingCards[i];
            if (!attackerCard || attackerCard.hp <= 0) {
                const targetLaneIndex = targetLaneMap[i];
                const defenderCard = defendingCards[targetLaneIndex];

                if (defenderCard && defenderCard.hp > 0) {
                    actions.push({ attackerId: actingPlayer.hero.instanceId, defenderId: defenderCard.instanceId });
                }
            }
        }

        return actions;
    }
}