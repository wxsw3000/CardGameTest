/**
 * @file CardData.ts
 * @description Defines the static data structures for cards and decks.
 */

import { SpriteFrame } from "cc";

// 定义单张卡牌的静态数据结构
export interface ICardData {
    id: number;
    cardName: string;
    description: string;
    hp: number;
    attack: number;
    spriteFramePath: string; // 在 resources 目录下的相对路径
}

// 所有可用卡牌的数据库
export const CardDatabase: { [id: number]: ICardData } = {
    1: {
        id: 1,
        cardName: "白袍将军陈庆之",
        description: "名师大将莫自牢，千军万马避白袍",
        hp: 20,
        attack: 2,
        spriteFramePath: "cardPng/chenqingzhi/spriteFrame" // 指向 'assets/resources/cardPng/chenqingzhi.png'
    },
    2: {
        id: 2,
        cardName: "三界靖魔大帝‌岳飞",
        description: "三十功名尘与土，八千里路云和月",
        hp: 15,
        attack: 5,
        spriteFramePath: "cardPng/yuefei/spriteFrame" // 指向 'assets/resources/cardPng/yuefei.png'
    },
    3: {
        id: 3,
        cardName: "武安君侯白起",
        description: "太息臣无罪，胡为伏剑鋩",
        hp: 25,
        attack: 3,
        spriteFramePath: "cardPng/baiqi/spriteFrame" // 指向 'assets/resources/cardPng/baiqi.png'
    },
    4: {
        id: 4,
        cardName: "兵家亚圣吴起",
        description: "有提七万之众而天下莫当者",
        hp: 30,
        attack: 2,
        spriteFramePath: "cardPng/wuqi/spriteFrame" // 指向 'assets/resources/cardPng/wuqi.png'
    },
    5: {
        id: 5,
        cardName: "兵圣孙武",
        description: "兵者诡道也",
        hp: 18,
        attack: 2,
        spriteFramePath: "cardPng/sunwu/spriteFrame" // 指向 'assets/resources/cardPng/sunwu.png'
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
