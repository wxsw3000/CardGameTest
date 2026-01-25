/**
 * @file CombatSystem.ts
 * @description A system for handling combat logic, refactored to be a pure simulation engine.
 */

import { IGameState, PlayerSide, ICardState, ICombatLog, CombatEvent } from '../interfaces';
import { CardDatabase } from '../Data/CardData';
import { deepCopy } from '../Utils';

export class CombatSystem {

    /**
     * Simulates the entire combat phase based on a given game state.
     * This is a pure function; it does not mutate the input gameState.
     * @param gameState The state of the game just before combat begins.
     * @returns An object containing the final state after combat and a detailed log of events.
     */
    public static simulateCombat(gameState: IGameState): { log: ICombatLog, finalState: IGameState } {
        const simState = deepCopy(gameState);
        const events: CombatEvent[] = [];

        const actingPlayer = simState.players[simState.activePlayer];
        const defendingPlayer = simState.players[simState.activePlayer === PlayerSide.Player ? PlayerSide.Opponent : PlayerSide.Player];

        const actingCards = actingPlayer.slots.map(s => s.card);
        
        const foughtCardIds = new Set<number>();
        const targetLaneMap = [0, 1, 2]; // Straight across

        // Helper to find any combatant in the simulation state
        const findCombatant = (instanceId: number): ICardState | null => {
            if (simState.cards[instanceId]) return simState.cards[instanceId];
            if (simState.players[PlayerSide.Player].hero.instanceId === instanceId) return simState.players[PlayerSide.Player].hero;
            if (simState.players[PlayerSide.Opponent].hero.instanceId === instanceId) return simState.players[PlayerSide.Opponent].hero;
            return null;
        }

        const createAttack = (attackerCard: ICardState) => {
            if (simState.isGameOver) return; // Stop if game already ended in this simulation
            if (attackerCard.hp <= 0) return; // Attacker is already dead

            const i = actingCards.findIndex(c => c && c.instanceId === attackerCard.instanceId);
            
            let defenderTarget: ICardState | null = null;
            const attackerStaticData = CardDatabase[attackerCard.staticId];
            const defendingCards = defendingPlayer.slots.map(s => s.card);

            // 1. Determine Target
            if (attackerStaticData?.skill === 'AttackLowestHP') {
                let lowestHp = Infinity;
                for (const card of defendingCards) {
                    if (card && card.hp > 0 && card.hp < lowestHp) {
                        lowestHp = card.hp;
                        defenderTarget = card;
                    }
                }
            } else if (i !== -1) { // It's a card in a slot
                const targetLaneIndex = targetLaneMap[i];
                defenderTarget = defendingCards[targetLaneIndex];
            }

            // If no valid card defender, target the hero
            if (!defenderTarget || defenderTarget.hp <= 0) {
                defenderTarget = defendingPlayer.hero;
            }

            if (!defenderTarget || defenderTarget.hp <= 0) return; // No valid targets left

            // 2. Log Attack Event
            events.push({ type: 'attack', attackerId: attackerCard.instanceId, defenderId: defenderTarget.instanceId });
            
            // 3. Apply Damage & Log Damage/Death Events
            const applyAndLogDamage = (attacker: ICardState, defender: ICardState) => {
                if (attacker.hp <= 0 || defender.hp <= 0) return;

                const damageToDefender = attacker.attack;
                defender.hp -= damageToDefender;
                events.push({ type: 'damage', targetId: defender.instanceId, damage: damageToDefender, newHp: defender.hp });

                if (defender.hp <= 0) {
                    events.push({ type: 'death', targetId: defender.instanceId });

                    // Find the slot of the defender and null it out from the simulation state
                    for (const p of [actingPlayer, defendingPlayer]) {
                        const slot = p.slots.find(s => s.card?.instanceId === defender.instanceId);
                        if (slot) {
                            slot.card = null;
                            break;
                        }
                    }

                    // Check for game over
                    if (defender.instanceId === defendingPlayer.hero.instanceId) {
                        simState.isGameOver = true;
                        simState.winner = simState.activePlayer;
                        events.push({ type: 'gameOver', winner: simState.winner });
                    }
                }
            };
            
            // Reciprocal damage
            applyAndLogDamage(attackerCard, defenderTarget);
            if(simState.isGameOver) return;
            applyAndLogDamage(defenderTarget, attackerCard); // Defender strikes back
            
            foughtCardIds.add(attackerCard.instanceId);
        };
        
        // --- Simulation Passes ---

        // 1st Pass: Priority Attacks
        for (const attackerCard of actingCards) {
            if (attackerCard && CardDatabase[attackerCard.staticId]?.hasPriority) {
                createAttack(attackerCard);
            }
        }

        // 2nd Pass: Normal Attacks
        for (const attackerCard of actingCards) {
            if (attackerCard && !foughtCardIds.has(attackerCard.instanceId)) {
                createAttack(attackerCard);
            }
        }
        
        // 3rd Pass: Hero Attacks (if lane is empty)
        for (let i = 0; i < 3; i++) {
            const attackerInSlot = actingCards[i];
            if (!attackerInSlot || attackerInSlot.hp <= 0) {
                createAttack(actingPlayer.hero);
            }
        }

        return { log: { events }, finalState: simState };
    }
}