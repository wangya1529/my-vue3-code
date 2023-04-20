import {Dep} from "./dep";
import {TrackOpTypes, TriggerOpTypes} from "./operations";
import * as events from "events";

/**
 * debugger事件
 */
export type DebuggerEvent = {
    effect: ReactiveEffect
} & DebuggerEventExtraInfo
/**
 * debugger事件的详细信息
 */
export type DebuggerEventExtraInfo = {
    target: object
    type: TrackOpTypes | TriggerOpTypes
    key: any
    newValue?: any
    oldValue?: any
    oldTarget?: Map<any,any> | Set<any>
}
// effectStack
const effectStack: ReactiveEffect[] = []
// 当前激活的 effect
let activeEffect: ReactiveEffect | undefined
export class ReactiveEffect<T = any> {
    active = true
    deps: Dep[] = []
    computed?: boolean
    // 是否允许递归
    allowRecurse? : boolean
    onStop?: ()=> void
    onTrack?: (event: DebuggerEvent) => void
    onTrigger?:(events:DebuggerEvent) => void
    stop() {}
}
export const ITERATE_KEY = Symbol(__DEV__? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')

let shouldTrack = true
const trackStack: boolean[] = []

/**
 * 停止跟踪
 */
export function pauseTracking() {
    trackStack.push(shouldTrack)
    shouldTrack = false
}

/**
 * 开启跟踪
 */
export function enableTracking() {
    trackStack.push(shouldTrack)
    shouldTrack = true
}

/**
 * 重置 track
 */
export function resetTracking() {
    const last = trackStack.pop()
    shouldTrack = last === undefined ? true : last
}



