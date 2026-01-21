# CardGameTest Project Setup

This project has been reconstructed with the core gameplay logic of the original CardGame.

## Scripts Overview

*   **Scripts/Match/Match.ts**: The main controller. Attach this to a Node in your Scene (e.g., "GameManager").
*   **Scripts/Match/Player/Player.ts**: Controls a player (Own or Opponent). Attach this to your Player and Opponent nodes.
*   **Scripts/Match/Card/Card.ts**: The Card component. You should create a Prefab for the Card.
*   **Scripts/Match/Battle/Battle.ts**: Logic only (not a component). Handles the combat rules.

## Scene Setup Instructions

1.  **Open Cocos Creator**.
2.  **Create a Blank Scene**.
3.  **UI Setup**:
    *   Create a Canvas.
    *   Create a Node named `GameRoot`.
    *   **Opponent Node**: Create a Node `Opponent` (top of screen).
        *   Add `Sprite` (Hero Face).
        *   Add `Label` (HP).
        *   Add 3 empty Nodes for Slots: `LeftSlot`, `MidSlot`, `RightSlot`.
        *   **Attach `Player` component**:
            *   Set `Side` to `Opponent`.
            *   Drag the 3 Slot nodes to `Left Slot`, `Mid Slot`, `Right Slot`.
            *   Drag the HP/Attack Labels to the component references.
    *   **Player Node**: Create a Node `Player` (bottom of screen).
        *   Similar setup to Opponent.
        *   **Attach `Player` component**:
            *   Set `Side` to `Own`.
            *   Link Slots and Labels.
    *   **Start Button**: Add a Button for starting the battle.
    *   **Result Label**: Add a Label for "Win/Lose".

4.  **Card Prefab**:
    *   Create a Node `Card`.
    *   Add `Sprite` (Visual).
    *   Add `Label` (Attack), `Label` (HP).
    *   **Attach `Card` component**:
        *   Link the Visual Sprite and Labels.
    *   Drag this Node to Assets to create a Prefab.
    *   Delete the Node from Scene.

5.  **Match Manager**:
    *   Create an empty Node `MatchManager`.
    *   **Attach `Match` component**.
    *   Link `Player` node (with Player component) to `Player` property.
    *   Link `Opponent` node (with Player component) to `Opponent` property.
    *   Link `Start Button` and `Result Label`.
    *   **Assign Card Prefab**: Go to both Player and Opponent nodes in the scene, and drag the `Card` Prefab to the `Card Prefab` property in their `Player` components.

6.  **Run**:
    *   Press Play.
    *   Click "Start".
    *   Watch the console and visual animations.

## Gameplay Logic
*   **Slots**: Every round, 3 random cards are generated from `assets/resources/cardPng`.
*   **Combat**: Left -> Mid -> Right -> Hero.
*   **Damage**: Simultaneous exchange.
*   **Targeting**: If slot empty, attacks Hero. If Hero acts, attacks first empty slot's opposite.
