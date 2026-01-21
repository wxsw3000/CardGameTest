/**
 * @file Actor.ts
 * @description Refactored base class for battlefield units (Actors).
 *              This component is now a pure "View" and holds no game state.
 *              Its responsibility is to display data provided by the game engine
 *              and to play animations.
 */

import { _decorator, Component, Node, Label, Sprite, Tween, tween, Vec3, UITransform } from 'cc';
import { ICardState } from '../Engine/interfaces';
import { IStaticCardData } from '../Engine/Data/CardData';

const { ccclass, property } = _decorator;

@ccclass('Actor')
export class Actor extends Component {

    @property(Label)
    nameLabel: Label | null = null;

    @property(Label)
    hpLabel: Label | null = null;

    @property(Label)
    attackLabel: Label | null = null;

    @property(Sprite)
    visual: Sprite | null = null;

    private currentHp: number = 0;

    /**
     * Updates the actor's visual representation based on the state from the game engine.
     * @param state The live state of the card (hp, buffs, etc.)
     * @param staticData The static data of the card (name, description, etc.)
     */
    public updateView(state: ICardState, staticData: IStaticCardData): void {
        if (!state || !staticData) {
            this.node.active = false;
            return;
        }

        this.node.active = true;
        this.currentHp = state.hp;

        if (this.nameLabel) this.nameLabel.string = staticData.cardName;
        if (this.attackLabel) this.attackLabel.string = Math.floor(state.attack).toString();
        
        // Ensure HP display doesn't go below zero.
        if (this.hpLabel) this.hpLabel.string = Math.max(0, Math.floor(state.hp)).toString();

        // TODO: Update sprite frame from staticData.spriteFramePath
    }

    /**
     * Plays the death animation. This is a purely visual effect.
     * The actual removal of the card from the game state is handled by the engine.
     */
    public playDieAnimation(onComplete?: () => void): void {
        tween(this.node)
            .to(0.5, { scale: new Vec3(0, 0, 1) }, { easing: 'backOut' })
            .call(() => {
                this.node.active = false;
                if (onComplete) onComplete();
            })
            .start();
    }

    /**
     * Plays the attack animation.
     * @param targetPos The world position of the target to animate towards.
     * @param onHitCallback A callback to be executed at the moment of impact.
     */
    public playAttackAnimation(targetPos: Vec3, onHitCallback: Function): void {
        const parentUITransform = this.node.parent?.getComponent(UITransform);
        if (!parentUITransform) {
            console.error("Attacker's parent node must have a UITransform component.");
            onHitCallback();
            return;
        }

        const localTargetPos = parentUITransform.convertToNodeSpaceAR(targetPos);
        const originalPos = this.node.position.clone();
        const originalIndex = this.node.getSiblingIndex();

        // Bring to front for the animation
        this.node.setSiblingIndex(999);

        tween(this.node)
            .to(0.2, { position: localTargetPos }, { easing: 'quadIn' })
            .call(() => {
                if (onHitCallback) onHitCallback();
            })
            .delay(0.1) // A small pause at the target
            .to(0.2, { position: originalPos }, { easing: 'quadOut' })
            .call(() => {
                this.node.setSiblingIndex(originalIndex);
            })
            .start();
    }
}