/**
 * @file Slot.ts
 * @description A simple view component representing a card slot on the field.
 *              It acts as a container for a Card view.
 */

import { _decorator, Component, Node } from 'cc';
import { Card } from '../Card/Card';

const { ccclass, property } = _decorator;

@ccclass('Slot')
export class Slot extends Component {

    /**
     * A direct reference to the Card component in this slot, if any.
     */
    public card: Card | null = null;

    /**
     * Sets or clears the card view in this slot.
     * @param cardNode The node containing the Card component, or null to clear the slot.
     */
    public setCard(cardNode: Node | null): void {
        // Clear any existing card
        if (this.card && this.card.node) {
            this.card.node.removeFromParent();
        }
        this.card = null;
        
        if (cardNode) {
            this.node.addChild(cardNode);
            cardNode.setPosition(0, 0);
            this.card = cardNode.getComponent(Card);
        }
    }
}