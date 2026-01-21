/**
 * @file Player.ts
 * @description A view component that represents a player on the battlefield.
 *              It holds references to the player's hero and card slots,
 *              and its primary role is to update them based on data from the game engine.
 */

import { _decorator, Component, Prefab, Node, Enum, Label } from 'cc';
import { Slot } from '../Slot/Slot';
import { Card } from '../Card/Card';
import { IPlayerState, IGameState, PlayerSide } from '../../Engine/interfaces';
import { CardDatabase } from '../../Engine/Data/CardData';

const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {

    @property({ type: Enum(PlayerSide) })
    side: PlayerSide = PlayerSide.Player;

    @property({
        type: Card,
        tooltip: "The Card component that visually represents the hero."
    })
    heroCard: Card = null;

    @property({
        type: [Slot],
        tooltip: "The three card slots for this player."
    })
    slots: Slot[] = [];

    @property(Label)
    resourceLabel: Label = null;

    /**
     * Updates the player's entire view (hero and slots) based on the game state.
     * @param playerState The state of this player from the game engine.
     * @param fullGameState The entire game state, used to look up card details.
     */
    public updateView(playerState: IPlayerState, fullGameState: IGameState): void {
        if (!playerState) return;

        // Update the resource display
        if (this.resourceLabel) {
            this.resourceLabel.string = `资源: ${playerState.resources}`;
        }

        // Update the hero's view
        if (this.heroCard) {
            const heroStaticData = CardDatabase[playerState.hero.staticId];
            this.heroCard.updateView(playerState.hero, heroStaticData);
        }

        // Update the view for each of the three card slots
        for (let i = 0; i < this.slots.length; i++) {
            const slotView = this.slots[i];
            const slotState = playerState.slots[i];
            
            if (slotView) {
                if (slotState.card) {
                    const cardState = fullGameState.cards[slotState.card.instanceId];
                    const cardStaticData = CardDatabase[cardState.staticId];
                    // We assume the GameManager has already placed a Card component in the slot.
                    // Now we just update its view.
                    slotView.card.updateView(cardState, cardStaticData);
                } else {
                    // If there's no card in the state, deactivate the one in the view.
                    if (slotView.card) {
                        slotView.card.node.active = false;
                    }
                }
            }
        }
    }

    /**
     * Finds a Card view component on the field (hero or in-slot) by its instance ID.
     * @param instanceId The unique ID of the card instance.
     * @returns The Card component or null if not found.
     */
    public findCardView(instanceId: number): Card | null {
        if (this.heroCard && this.heroCard.instanceId === instanceId) {
            return this.heroCard;
        }
        for (const slot of this.slots) {
            if (slot.card && slot.card.instanceId === instanceId) {
                return slot.card;
            }
        }
        return null;
    }
}
