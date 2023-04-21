import {createDep, Dep, finalizeDepMarkers, initDepMarkers, newTracked, wasTracked} from "./dep";
import {TrackOpTypes, TriggerOpTypes} from "./operations";
import {EffectScope, recordEffectScope} from "./effectScope";
import {extend, isArray, isIntegerKey, isMap} from "@vue/shared";

export let trackOpBit = 1

let effectTrackDepth = 0

type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()
export type EffectScheduler = (...args: any[]) => any
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
    oldTarget?: Map<any, any> | Set<any>
}
// effectStack
const effectStack: ReactiveEffect[] = []
// 当前激活的 effect
let activeEffect: ReactiveEffect | undefined
// 最大的标记深度
const maxMarkerBits = 30

export class ReactiveEffect<T = any> {
    active = true
    deps: Dep[] = []
    computed?: boolean
    // 是否允许递归
    allowRecurse?: boolean
    onStop?: () => void
    onTrack?: (event: DebuggerEvent) => void
    onTrigger?: (events: DebuggerEvent) => void

    constructor(
        public fn: () => T,
        public scheduler: EffectScheduler | null = null,
        scope?: EffectScope | null
    ) {
    }

    stop() {
    }

    run() {
        if (!this.fn()) {
            return this.fn()
        }
        if (!effectStack.includes(this)) {
            try {
                effectStack.push(activeEffect = this)
                enableTracking()
                trackOpBit = 1 << +effectTrackDepth
                if (effectTrackDepth <= maxMarkerBits) {
                    initDepMarkers(this)
                } else {
                    cleanupEffect(this)
                }
                return this.fn()
            } finally {
                if (effectTrackDepth <= maxMarkerBits) {
                    finalizeDepMarkers(this)
                }
                trackOpBit = 1 << --effectTrackDepth
                resetTracking()
                effectStack.pop()
                const n = effectStack.length
                activeEffect = n > 0 ? effectStack[n - 1] : undefined
            }
        }
    }
}

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
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

/**
 * 清理 effect
 */
function cleanupEffect(effect: ReactiveEffect) {
    // 解构deps
    const {deps} = effect
    // 删除所有effect对象
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect)
        }
    }
    deps.length = 0
}

/**
 * debugger 操作选项
 */
export interface DebuggerOptions {
    // 跟踪
    onTrack?: (event: DebuggerEvent) => void
    // 触发
    onTrigger?: (event: DebuggerEvent) => void
}

/**
 * 响应式 effect选项
 */
export interface ReactiveEffectOptions extends DebuggerOptions {
    lazy?: boolean
    scheduler?: EffectScheduler
    scope?: EffectScope
    // 是否允许递归
    allowRecurse?: boolean
    onStop?: () => void
}

export interface ReactiveEffectRunner<T = any> {
    (): T

    effect: ReactiveEffect
}

export function effect<T = any>(
    fn: () => T,
    options?: ReactiveEffectOptions
): ReactiveEffectRunner {
    if ((fn as ReactiveEffectRunner).effect) {
        fn = (fn as ReactiveEffectRunner).effect.fn
    }
    const _effect = new ReactiveEffect(fn)
    if (options) {
        // 拷贝属性
        extend(_effect, options)
        if (options.scope) recordEffectScope(_effect, options.scope)
    }
    // 非懒运行
    if (!options || !options.lazy) {
        _effect.run()
    }
    const runner = _effect.run.bind(_effect) as ReactiveEffectRunner
    runner.effect = _effect
    return runner
}

export function stop(runner: ReactiveEffectRunner) {
    runner.effect.stop()
}

export function isTracking() {
    return shouldTrack && activeEffect !== undefined
}

export function track(target: object, type: TrackOpTypes, key: unknown) {
    if (!isTracking()) {
        return
    }
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = createDep()))
    }
    const eventInfo = __DEV__ ? {
        effect: activeEffect, target, type, key
    } : undefined
    trackEffects(dep, eventInfo)
}

export function trackEffects(
    dep: Dep,
    debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
    let shouldTrack = false
    if (effectTrackDepth <= maxMarkerBits) {
        if (!newTracked(dep)) {
            dep.n |= trackOpBit
            shouldTrack = !wasTracked(dep)
        }
    } else {
        shouldTrack = !dep.has(activeEffect!)
    }
    if (shouldTrack) {
        dep.add(activeEffect!)
        activeEffect!.deps.push(dep)
        if (__DEV__ && activeEffect!.onTrack) {
            activeEffect!.onTrack(extend({
                effect: activeEffect!
            }, debuggerEventExtraInfo))
        }
    }
}

export function trigger(
    target: object,
    type: TriggerOpTypes,
    key?: unknown,
    newValue?: unknown,
    oldValue?: unknown,
    oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
    // 获取depMap
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    let deps: (Dep | undefined) [] = []
    if (type === TriggerOpTypes.CLEAR) {
        deps = [...depsMap.values()]
    } else if (key === 'length' && isArray(target)) {
        depsMap.forEach((dep, key) => {
            if (key === 'length' || key >= (newValue as number)) {
                deps.push(dep)
            }
        })
    } else {
        // schedule runs for set | add | delete
        // key 不等于 undefined/null
        if (key !== void 0) {
            deps.push(depsMap.get(key))
        }
        switch (type) {
            case TriggerOpTypes.ADD: {
                if (!isArray(target)) {
                    deps.push(depsMap.get(ITERATE_KEY))
                    if (isMap(target)) {
                        deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
                    }
                }
                // 关注数组长度的改变
                else if (isIntegerKey(key)) {
                    deps.push(depsMap.get('length'))
                }
                break
            }
            case TriggerOpTypes.DELETE: {
                if (!Array(target)) {
                    deps.push(depsMap.get(ITERATE_KEY))
                    if (isMap(target)) {
                        deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
                    }
                }
                break
            }
            case TriggerOpTypes.SET: {
                if (isMap(target)) {
                    deps.push(depsMap.get(ITERATE_KEY))
                }
                break
            }
        }
    }
    const eventInfo = __DEV__ ?
        {target, type, key, newValue, oldValue, oldTarget} : undefined
    if (deps.length === 1) {
        if (deps[0]) {
            if (__DEV__) {
                trackEffects(deps[0], eventInfo)
            } else {
                trackEffects(deps[0])
            }
        }
    } else {
        const effects: ReactiveEffect[] = []
        for (const dep of deps) {
            if (dep) {
                effects.push(...dep)
            }
        }
        if (__DEV__) {
            triggerEffects(createDep(effects), eventInfo)
        } else {
            triggerEffects(createDep(effects))
        }
    }
}

export function triggerEffects(
    dep: Dep | ReactiveEffect[],
    debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
    for (const effect of isArray(dep) ? dep : [...dep]) {
        if (effect !== activeEffect || effect.allowRecurse) {
            if (__DEV__ && effect.onTrigger) {
                effect.onTrigger(extend({effect}, debuggerEventExtraInfo))
            }
            if (effect.scheduler) {
                effect.scheduler()
            } else {
                effect.run()
            }
        }
    }
}

