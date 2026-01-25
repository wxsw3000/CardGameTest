/**
 * @file Slot.ts
 * @description A view component representing a card slot on the field.
 *              It acts as a container for a Card view and handles the card rotation animation.
 */

import { _decorator, Component, Node, ScrollView, Prefab, tween, Vec2, UITransform, error } from 'cc';
import { Card } from '../Card/Card';
import { PlayerSide } from '../../Engine/interfaces';

const { ccclass, property } = _decorator;

@ccclass('Slot')
export class Slot extends Component {

    @property(ScrollView)
    scrollView: ScrollView = null;

    @property(Node)
    finalCardSlot: Node = null;

    @property(Prefab)
    cardPrefab: Prefab = null;

    public card: Card | null = null;
    
    private itemHeight = 230;
    private itemPadding = 0;

    onLoad() {
        if (!this.scrollView || !this.finalCardSlot) {
            error("[Slot] component is not fully configured in the editor. Please assign ScrollView and FinalCardSlot.");
            return;
        }
        if (!this.scrollView.content) {
            error("[Slot] The ScrollView's 'content' property is not assigned in the editor!");
            return;
        }
        this.finalCardSlot.active = true;
        this.scrollView.node.active = false;
    }

    /**
     * Directly sets or clears the card view in this slot without animation.
     * @param cardNode The node containing the Card component, or null to clear the slot.
     */
    public setCard(cardNode: Node | null): void {
        this.clearOldCard();
        
        if (cardNode) {
            cardNode.active = true;
            this.finalCardSlot.addChild(cardNode);
            cardNode.setPosition(0, 0);
            this.card = cardNode.getComponent(Card);
        }

        this.finalCardSlot.active = true;
        this.scrollView.node.active = false;
    }

    /**
     * Plays a "natural selection" scroll animation with direction control.
     * @param targetCardNode The actual card node that should be the result.
     * @param animationNodes The full list of card nodes (including target) to display in the scroll.
     * @param side The side of the player this slot belongs to, to determine scroll direction.
     * @returns A Promise that resolves when the animation is complete.
     */
    public playScrollAnimation(targetCardNode: Node, animationNodes: Node[], side: PlayerSide): Promise<void> {
        return new Promise(resolve => {
            if (!this.scrollView?.content || !this.finalCardSlot || !animationNodes || animationNodes.length === 0) {
                this.setCard(targetCardNode);
                resolve();
                return;
            }

            this.clearOldCard();
            this.finalCardSlot.active = false;
            this.scrollView.node.active = true;
            this.scrollView.content.removeAllChildren();

            this.populateScrollView(animationNodes);

            const targetIndex = animationNodes.indexOf(targetCardNode);
            if (targetIndex === -1) {
                this.setCard(targetCardNode);
                resolve();
                return;
            }

            const totalItemHeight = this.itemHeight + this.itemPadding;
            const viewHeight = this.scrollView.node.getComponent(UITransform).height;
            const finalOffset = (targetIndex + 0.5) * totalItemHeight - viewHeight / 2;

            let initialOffset = 0;
            
            // Player's cards should scroll "up" (content moves up, cards appear from bottom)
            // Opponent's cards should scroll "down" (content moves down, cards appear from top)
            if (side === PlayerSide.Player) {
                // To appear from bottom, content must move up, so tween from 0 to finalOffset
                initialOffset = 0;
            } else {
                // To appear from top, content must move down, so tween from a high offset back to final
                initialOffset = finalOffset + (totalItemHeight * 10);
            }
   
            this.scrollView.scrollToOffset(new Vec2(0, initialOffset), 0);
   
            const dummy = { y: initialOffset };
            tween(dummy)
                .to(2.0, { y: finalOffset }, {
                    easing: 'cubicOut',
                    onUpdate: () => {
                        this.scrollView.scrollToOffset(new Vec2(0, dummy.y));
                    },
                    onComplete: () => {
                        this.finalCardSlot.addChild(targetCardNode);
                        targetCardNode.setPosition(0, 0);
                        this.card = targetCardNode.getComponent(Card);
                        
                        this.scrollView.node.active = false;
                        this.finalCardSlot.active = true;
                        
                        resolve();
                    }
                })
                .start();
        });
    }

    private populateScrollView(displayPool: Node[]) {
        const content = this.scrollView.content!;
        const totalItemHeight = this.itemHeight + this.itemPadding;
        content.getComponent(UITransform).height = displayPool.length * totalItemHeight;

        for (let i = 0; i < displayPool.length; i++) {
            const item = displayPool[i];
            item.active = true; // Ensure all animation nodes are visible
            content.addChild(item);
            item.setPosition(0, -i * totalItemHeight - totalItemHeight / 2);
        }
    }
    
    private clearOldCard() {
        if (this.card && this.card.node) {
            this.card.node.removeFromParent();
        }
        this.card = null;
    }
}