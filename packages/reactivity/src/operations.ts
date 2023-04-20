/**
 * 跟踪的操作类型
 */
export const enum TrackOpTypes {
    GET = 'get',
    HAS = 'has',
    ITERATE = 'iterate'
}

/**
 * 触发的操作类型
 */
export const enum TriggerOpTypes {
    SET = 'set',
    ADD = 'add',
    DELETE  = 'delete',
    CLEAR = 'clear'
}
