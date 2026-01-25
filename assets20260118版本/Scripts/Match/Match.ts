import { _decorator, Component, Node, Button, Label, log, randomRangeInt } from 'cc';
import { Player } from './Player/Player';
import { Battle, IBattleAction } from './Battle/Battle';
import { PlayerDecks, OpponentDecks } from '../Data/CardData';
import { Card } from './Card/Card';
import { ActorState } from '../Constants';

const { ccclass, property } = _decorator;

@ccclass('Match')
export class Match extends Component {

    @property(Player)
    player: Player = null;

    @property(Player)
    opponent: Player = null;
    
    @property(Button)
    startBtn: Button = null;

    @property(Label)
    public resultLabel: Label | null = null;

    private currentPlayer: Player = null;
    private isBattling: boolean = false;
    private isGameOver: boolean = false;

    start() {
        if (!this.player || !this.opponent || !this.startBtn) {
            log('[ERROR] Player, Opponent, or StartBtn is not linked in the editor!');
            return;
        }
        this.startBtn.node.on(Button.EventType.CLICK, this.onStartClick, this);
        this.resetGame();
    }

    resetGame() {
        log("--- New Game Started ---");
        this.isGameOver = false;
        
        const startBtnLabel = this.startBtn.getComponentInChildren(Label);
        if(startBtnLabel) startBtnLabel.string = "Start Turn";
        
        // Init Player with ID 2 (Yue Fei) visuals
        this.player.initPlayer('Player', 20, 0, 2, PlayerDecks);
        // Init Opponent with ID 3 (Bai Qi) visuals
        this.opponent.initPlayer('Opponent', 20, 0, 3, OpponentDecks);
        
        this.player.slots.forEach(s => s.clear());
        this.opponent.slots.forEach(s => s.clear());

        // For simplicity, Player always starts first. Initiative roll can be added later.
        this.currentPlayer = this.player;
        this.resultLabel.string = `Player's Turn to Start`;
        this.isBattling = false;
        this.startBtn.interactable = true;
    }

    async onStartClick() {
        if (this.isBattling) return;

        if (this.isGameOver) {
            this.resetGame();
            return;
        }

        this.isBattling = true;
        this.startBtn.interactable = false;
        
        await this.runTurn();

        if (!this.isGameOver) {
            // Switch player for the next turn
            this.currentPlayer = (this.currentPlayer === this.player) ? this.opponent : this.player;
            this.resultLabel.string = `${this.currentPlayer.node.name}'s Turn`;
            this.isBattling = false;
            this.startBtn.interactable = true;
        }
    }

    async runTurn() {
        const actingPlayer = this.currentPlayer;
        const defendingPlayer = (this.currentPlayer === this.player) ? this.opponent : this.player;
        log(`======== ${actingPlayer.node.name}'s Turn Start ========`);
        
        // --- 1. "摇牌" (Card Shaking) Phase ---
        // Return surviving cards from last turn to their decks
        for (const slot of actingPlayer.slots) {
            if (slot.card && slot.card.state === ActorState.Normal) {
                slot.card.deckState = 'InDeck';
            }
            slot.clear();
        }

        // Draw new cards for the current player
        const scrollPromises: Promise<void>[] = [];
        for (let i = 0; i < 3; i++) {
            const deck = i === 0 ? actingPlayer.leftDeck : i === 1 ? actingPlayer.midDeck : actingPlayer.rightDeck;
            if (deck.length > 0) {
                // Get a random card from the appropriate deck
                const availableCards = deck.filter(c => c.deckState === 'InDeck');
                const targetCard = availableCards.length > 0 ? availableCards[randomRangeInt(0, availableCards.length)] : null;

                if (targetCard) {
                    // Set the deck for the slot (needed by new Slot.ts logic)
                    actingPlayer.slots[i].setDeck(deck); 
                    scrollPromises.push(actingPlayer.slots[i].startScroll(targetCard));
                }
            }
        }
        await Promise.all(scrollPromises);
        log(`--- ${actingPlayer.node.name}'s card selection complete.`);

        // --- 2. Calculate and Animate Battle ---
        // This will be rewritten to follow new rules
        // For now, let's just log it
                log('--- Battle Phase ---');
                await this.animateBattle(actingPlayer, defendingPlayer);
                
                // --- 3. Check for Winner ---
                if (this.player.hp <= 0 || this.opponent.hp <= 0) {
                    this.isGameOver = true;
                    if (this.player.hp <= 0 && this.opponent.hp <= 0) this.resultLabel.string = "Draw!";
                    else if (this.player.hp <= 0) this.resultLabel.string = "You Lose!";
                    else this.resultLabel.string = "You Win!";
                    const startBtnLabel = this.startBtn.getComponentInChildren(Label);
                    if(startBtnLabel) startBtnLabel.string = "Reset";
                    this.startBtn.interactable = true;
                }
                
                log(`======== ${actingPlayer.node.name}'s Turn End ========`);
            }
        
            async animateBattle(actingPlayer: Player, defendingPlayer: Player) {
                const actions = Battle.calculateTurn(actingPlayer, defendingPlayer);
                log(`Calculated ${actions.length} actions for this turn.`);
        
                for (const action of actions) {
                    if (action.attacker.state === ActorState.Dead || action.defender.state === ActorState.Dead) {
                        continue; // Skip action if anyone is already dead
                    }
        
                    log(`Action: ${action.attacker.node.name} attacks ${action.defender.node.name}`);
                    
                    // Animate the attack
                    await new Promise<void>(resolve => {
                        action.attacker.animateAttack(action.defender.node.worldPosition, () => {
                            // Animation has reached the target, now apply damage.
                            Battle.applyAction(action);
                            resolve();
                        });
                    });
                    
                    // A small delay after each action to make it easier to follow
                    await new Promise(res => setTimeout(res, 300));
                }
        
                // After all actions, handle permanently removing defeated cards
                Battle.handleDefeatedCards(this.player, this.opponent);
                log('--- Battle phase finished.');
            }
        }
        