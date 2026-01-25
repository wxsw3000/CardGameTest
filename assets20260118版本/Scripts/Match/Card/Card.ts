import { _decorator, Component, Node, SpriteFrame, Label, Graphics, Color, resources, Sprite } from 'cc';
import { Actor } from '../Actor';
import { ICardData } from '../../Data/CardData';

const { ccclass, property } = _decorator;

/**
 * @class Card
 * @extends Actor
 * @description Manages a single card's properties, UI, and lifecycle state.
 */
@ccclass('Card')
export class Card extends Actor {

    @property({ type: Node, tooltip: "Card background node" })
    public cardBg: Node | null = null;

    @property({ type: Label, tooltip: "Card description label" })
    public descriptionLabel: Label | null = null;

    // Deck management state, separate from Actor's combat state
    public deckState: 'InDeck' | 'Used' | 'InPlay' = 'InDeck';
    
    // Store card's static data
    public cardData: ICardData | null = null;

    start() {
        // if (this.cardBg) {
        //     this.drawCardFrame(this.cardBg.getComponent(Graphics) || this.cardBg.addComponent(Graphics));
        // }
    }

    /**
     * @method initCard
     * @description Initializes the card's data and UI from a data object.
     * @param data The static data for this card.
     */
    public initCard(data: ICardData) {
        this.cardData = data;
        
        // Call parent Actor's init method
        super.init(data.cardName, data.hp, data.attack);

        // Set description
        if (this.descriptionLabel) {
            this.descriptionLabel.string = data.description;
        }

        // Asynchronously load the card's artwork
        if (data.spriteFramePath) {
            resources.load(data.spriteFramePath, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    console.error(`Failed to load spriteFrame for card ${data.cardName} at path: ${data.spriteFramePath}`, err);
                    return;
                }
                if (this.visual) {
                    this.visual.spriteFrame = spriteFrame;
                }
            });
        }
        
        // Reset state
        this.deckState = 'InDeck';
    }
    
    // Method to draw the card frame graphics
    drawCardFrame(g: Graphics) {
        g.clear(); 
        const width = 204;
        const height = 375;
        const cornerRadius = 0;

        g.lineWidth = 2;
        g.strokeColor = new Color(80, 80, 100, 255);

        this.drawRoundedRect(g, 0, 0, width, height, cornerRadius);

        g.strokeColor = new Color(60, 60, 80, 255);
        g.lineWidth = 2;
        g.moveTo(0, 375-204);
        g.lineTo(width, 375-204);
        g.stroke();

        const nameBarHeight = 30;
        const descY = height-width-nameBarHeight - 2;
        g.moveTo(0, descY);
        g.lineTo(width, descY);
        g.stroke();

        g.fillColor = new Color(40, 40, 50, 255);
        g.rect(0, descY, width, nameBarHeight);
        g.fill();

        g.fillColor = new Color(40, 40, 50, 255);
        g.rect(0, 0, width, height - 204 - nameBarHeight - 2 - 2);
        g.fill();

        g.strokeColor = new Color(120, 120, 150, 180);
        g.lineWidth = 3;
        this.drawRoundedRect(g, 0, 0, width, height, cornerRadius, false);
    }

    // Helper to draw a rounded rectangle
    drawRoundedRect(g: Graphics, x: number, y: number, width: number, height: number, radius: number, fill = true) {
        const hw = width / 2;
        const hh = height / 2;
        const cx = x + hw;
        const cy = y + hh;

        g.moveTo(cx - hw + radius, y);
        g.lineTo(cx + hw - radius, y);

        g.arc(cx + hw - radius, y + radius, radius, -Math.PI / 2, 0, true);
        g.lineTo(cx + hw, cy + hh - radius);
        g.arc(cx + hw - radius, cy + hh - radius, radius, 0, Math.PI / 2, true);
        g.lineTo(cx - hw + radius, cy + hh);
        g.arc(cx - hw + radius, cy + hh - radius, radius, Math.PI / 2, Math.PI, true);
        g.lineTo(cx - hw, y + radius);
        g.arc(cx - hw + radius, y + radius, radius, Math.PI, Math.PI * 3 / 2, true);
        g.close();

        if (fill) g.fill();
        g.stroke();
    }
}
