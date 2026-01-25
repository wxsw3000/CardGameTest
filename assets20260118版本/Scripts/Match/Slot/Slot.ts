import { _decorator, Component, Node, ScrollView, Prefab, instantiate, Vec3, tween, UITransform, Vec2, Label, Color } from 'cc';
import { Card } from '../Card/Card';

const { ccclass, property } = _decorator;

export enum SlotState {
    Standby,
    Spinning,
    Stopping,
}

@ccclass('Slot')
export class Slot extends Component {

    @property(ScrollView)
    scrollView: ScrollView = null;

    @property(Prefab)
    cardFullPrefab: Prefab = null; // Used for temporary visuals in scroll view

    @property(Node)
    finalCardSlot: Node = null;

    private deck: Card[] = []; // The deck of ACTUAL card instances for this slot
    private state: SlotState = SlotState.Standby;
    private itemHeight = 230;
    private itemPadding = 0;
    
    public card: Card | null = null; // The final card instance placed in this slot

    /**
     * @method setDeck
     * @description Sets the deck of card instances for this slot to use.
     * @param deck An array of Card component instances.
     */
    public setDeck(deck: Card[]) {
        this.deck = deck;
    }

    private populateScrollView(displayPool: Card[]) {
        const content = this.scrollView.content;
        if (!content) {
            console.error("ScrollView content is not assigned!");
            return;
        }
        content.removeAllChildren();
        
        const totalItemHeight = this.itemHeight + this.itemPadding;
        content.getComponent(UITransform).height = displayPool.length * totalItemHeight;

        for (let i = 0; i < displayPool.length; i++) {
            const cardInstance = displayPool[i];
            const item = instantiate(this.cardFullPrefab);
            
            const cardComp = item.getComponent(Card);
            if (cardComp) {
                // Initialize with static data for visual representation only
                cardComp.initCard(cardInstance.cardData);
            }
            
            content.addChild(item);
            item.setPosition(0, -i * totalItemHeight - totalItemHeight / 2);
        }
    }
    
    /**
     * @method startScroll
     * @description Starts the scroll animation to select a target card instance.
     * @param targetCard The actual card instance to be selected.
     * @returns A Promise that resolves when the animation is complete.
     */
    public startScroll(targetCard: Card): Promise<void> {
         return new Promise(resolve => {
            this.state = SlotState.Spinning;
            this.finalCardSlot.active = false; // Hide final card
            this.scrollView.node.active = true; // Show scroll view

            // For the animation, create a temporary display pool. Can be shuffled version of the deck.
            const displayPool = [...this.deck, ...this.deck, ...this.deck]; // Triple for seamless looping
            this.populateScrollView(displayPool);

            const totalItemHeight = this.itemHeight + this.itemPadding;
   
            const targetIndexInDeck = this.deck.findIndex(c => c === targetCard);
            if (targetIndexInDeck === -1) {
                console.error("Target card instance not found in the slot's deck!", targetCard);
                this.placeFinalCard(this.deck[0]); // Fallback to first card
                resolve();
                return;
            }

            const middleCopyStartIndex = this.deck.length;
            const effectiveTargetIndex = middleCopyStartIndex + targetIndexInDeck;
   
            const viewHeight = this.scrollView.node.getComponent(UITransform).height;
            const finalOffset = (effectiveTargetIndex + 0.5) * totalItemHeight - viewHeight / 2;
   
            const minScrollCycles = 2;
            const initialScrollDistance = minScrollCycles * this.deck.length * totalItemHeight;
            const initialOffset = finalOffset + initialScrollDistance;
   
            const dummy = { y: initialOffset };
            this.scrollView.scrollToOffset(new Vec2(0, initialOffset), 0);
   
            const scrollTime = 3.0;
   
            tween(dummy)
                .to(scrollTime, { y: finalOffset }, {
                    easing: 'cubicOut',
                    onUpdate: () => {
                        this.scrollView.scrollToOffset(new Vec2(0, dummy.y));
                    },
                    onComplete: () => {
                        this.state = SlotState.Standby;
                        this.placeFinalCard(targetCard); // Place the ACTUAL instance
                        resolve();
                    }
                })
                .start();
        });
    }

    /**
     * @method placeFinalCard
     * @description Places the chosen card instance in the final slot.
     * @param cardInstance The actual Card instance from the deck.
     */
    private placeFinalCard(cardInstance: Card) {
        if (!cardInstance) {
            console.error("Invalid card instance provided to placeFinalCard.");
            return;
        }
        
        this.clear(); // Clear any previous card

        this.card = cardInstance;
        this.card.deckState = 'InPlay';
        this.finalCardSlot.addChild(this.card.node);
        this.card.node.active = true;
        
        // Hide scroll view, show final card
        this.scrollView.node.active = false;
        this.finalCardSlot.active = true;
    }
    
    /**
     * @method clear
     * @description Clears the card from the final slot.
     */
    public clear() {
        if (this.card) {
            // This does not destroy the card, just removes it from the slot.
            // The Player class manages the lifecycle of the card instance.
            this.finalCardSlot.removeAllChildren();
            this.card = null;
        }
        this.scrollView.content.removeAllChildren();
    }
}
