/**
 * @file CardData.ts
 * @description Defines the static data structures for cards and decks.
 *              This file is part of the game engine and should not have
 *              any dependency on Cocos Creator.
 */

// 定义单张卡牌的静态数据结构
export interface IStaticCardData {
    id: number;
    cardName: string;
    description: string;
    hp: number;
    attack: number;
    adjustCost: number; // The resource cost to move this card between decks
    hasPriority?: boolean; // Does this card attack before others?
    skill?: 'AttackLowestHP'; // Represents a special skill
    spriteFramePath: string; // 在 resources 目录下的相对路径
}

// 所有可用卡牌的数据库
export const CardDatabase: { [id: number]: IStaticCardData } = {
    1: {
        id: 1,
        cardName: "白袍将军陈庆之",
        description: "名师大将莫自牢，千军万马避白袍",
        hp: 20,
        attack: 2,
        adjustCost: 2,
        hasPriority: true,
        spriteFramePath: "cardPng/chenqingzhi/spriteFrame"
    },
    2: {
        id: 2,
        cardName: "三界靖魔大帝‌岳飞",
        description: "三十功名尘与土，八千里路云和月",
        hp: 15,
        attack: 5,
        adjustCost: 3,
        skill: 'AttackLowestHP',
        spriteFramePath: "cardPng/yuefei/spriteFrame"
    },
    3: {
        id: 3,
        cardName: "武安君侯白起",
        description: "太息臣无罪，胡为伏剑鋩",
        hp: 25,
        attack: 3,
        adjustCost: 2,
        spriteFramePath: "cardPng/baiqi/spriteFrame"
    },
    4: {
        id: 4,
        cardName: "兵家亚圣吴起",
        description: "有提七万之众而天下莫当者",
        hp: 30,
        attack: 2,
        adjustCost: 1,
        spriteFramePath: "cardPng/wuqi/spriteFrame"
    },
    5: {
        id: 5,
        cardName: "兵圣孙武",
        description: "兵者诡道也",
        hp: 18,
        attack: 2,
        adjustCost: 1,
        spriteFramePath: "cardPng/sunwu/spriteFrame"
    },
};

// 定义牌库结构
export interface IDeckData {
    left: number[];
    mid: number[];
    right: number[];
}

// 玩家的硬编码牌库 (使用卡牌ID)
export const PlayerDecks: IDeckData = {
    left: [1, 3, 2, 1, 5],
    mid: [2, 4, 1, 3],
    right: [5, 2, 4]
};

// 对手的硬编码牌库 (使用卡牌ID)
export const OpponentDecks: IDeckData = {
    left: [2, 1, 3, 5, 1],
    mid: [4, 1, 2],
    right: [3, 5, 4, 2]
};
