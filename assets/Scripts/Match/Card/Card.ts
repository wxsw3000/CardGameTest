/**
 * @file Card.ts
 * @description A component representing the view of a single card on the battlefield.
 *              It extends the Actor view and adds card-specific properties.
 */

import { _decorator, Label, resources, SpriteFrame } from 'cc';
import { Actor } from '../Actor';
import { ICardState } from '../../Engine/interfaces';
import { IStaticCardData } from '../../Engine/Data/CardData';

const { ccclass, property } = _decorator;

@ccclass('Card')
export class Card extends Actor {

    @property({ type: Label, tooltip: "Card description label" })
    public descriptionLabel: Label | null = null;

    /**
     * A unique identifier for this card instance, linking it to the game state.
     */
    public instanceId: number | null = null;
    
    /**
     * The static ID of the card, used to fetch static data.
     */
    public staticId: number | null = null;

    /**
     * Overrides the Actor's updateView to handle card-specific fields
     * and load the correct sprite frame.
     * @param state The live state of the card from the engine, or null for a static view.
     * @param staticData The static data for this card type.
     */
    public updateView(state: ICardState | null, staticData: IStaticCardData): void {
        // Only require staticData to render a card's appearance
        if (!staticData) {
            this.node.active = false;
            return;
        }
        
        // Call the parent method to update common actor fields (hp, attack, name)
        super.updateView(state, staticData);

        // Only set instanceId if we have a live state
        this.instanceId = state ? state.instanceId : null;
        this.staticId = staticData.id;

        // Auto-discover descriptionLabel if unassigned
        if (!this.descriptionLabel) {
            const descNode = this.node.getChildByName('DescriptionLabel') || this.node.getChildByName('DescLabel');
            if (descNode) this.descriptionLabel = descNode.getComponent(Label);
        }

        // Update card-specific fields
        if (this.descriptionLabel) {
            this.descriptionLabel.string = staticData.description;
        }

        // Asynchronously load the card's artwork with fallback
        if (staticData.spriteFramePath) {
            resources.load(staticData.spriteFramePath, SpriteFrame, (err, spriteFrame) => {
                if (!err && spriteFrame) {
                    if (this.visual) {
                        this.visual.spriteFrame = spriteFrame;
                    }
                } else {
                    // Fallback to base path without /spriteFrame suffix
                    const basePath = staticData.spriteFramePath.replace(/\/spriteFrame$/, '');
                    resources.load(basePath, SpriteFrame, (err2, spriteFrame2) => {
                        if (!err2 && spriteFrame2 && this.visual) {
                            this.visual.spriteFrame = spriteFrame2;
                        } else {
                            console.error(`Failed to load spriteFrame for card ${staticData.cardName} at path: ${staticData.spriteFramePath}`, err || err2);
                        }
                    });
                }
            });
        }
    }
}