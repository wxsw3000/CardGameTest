import {Enum} from 'cc';

/**
 * @enum Side
 * @description 定义玩家的阵营类型。
 */
export enum Side {
    /** 己方阵营 */
    Own,
    /** 对手阵营 */
    Opponent
}
Enum(Side);

/**
 * @enum ActorState
 * @description 定义战场单位（角色/卡牌）的当前状态。
 */
export enum ActorState {
    /** 正常状态 */
    Normal,
    /** 死亡状态 */
    Dead
}
Enum(ActorState);