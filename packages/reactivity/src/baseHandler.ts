import {
    isReadonly,
    isShallow,
    ReactiveFlags,
    reactiveMap,
    readonlyMap,
    shallowReadonlyMap,
    Target,
    toRaw
} from "./reactive";
import {extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject, isSymbol, makeMap} from "@vue/shared";
import {ITERATE_KEY, pauseTracking, resetTracking, track, trigger} from "./effect";
import {TrackOpTypes, TriggerOpTypes} from "./operations";
import {isRef} from "./ref";


const isNonTrackableKeys = makeMap('__proto,__v_isRef,__isVue')
const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)
const set = createSetter()
const shallowSet = createSetter(true)

const arrayInstrumentations = createArrayInstrumentations()
export const mutableHandlers: ProxyHandler<object> = {
    get,
    set,
    deleteProperty,
    has,
    ownKeys,
}
export const readonlyHandlers: ProxyHandler<object> = {
    get: readonlyGet,
    set(target: object, key: string | symbol, newValue: any, receiver: any): boolean {
        if (__DEV__) {
            console.log(`Set operation on key "${String(key)}" failed: target is readonly`)
        }
        return true
    },
    deleteProperty(target: object, k: string | symbol): boolean {
        if (__DEV__) {
            console.warn(
                `Delete operation on key "${String(k)}" failed: target is readonly`
            )
        }
        return true
    }
}
export const shallowReactiveHandlers = extend({},
    mutableHandlers,
    {
        get: shallowGet,
        set: shallowGet
    })

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
})
const builtInSymbols = new Set(
    Object.getOwnPropertyNames(Symbol)
        .map(key => (Symbol as any)[key])
        .filter(isSymbol)
)


function createArrayInstrumentations() {
    const instrumentations: Record<string, Function> = {}
    ;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
        instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
            const arr = toRaw(this) as any
            for (let i = 0, l = this.length; i < l; i++) {
                // 收集依赖
                track(arr, TrackOpTypes.GET, i + '')
            }
            const res = arr[key](...args)
            if (res === -1 || res === false) {
                return arr[key](...args.map(toRaw))
            } else {
                return res
            }
        }
    })
    ;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
        instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
            pauseTracking()
            const res = (toRaw(this) as any)[key].apply(this, args)
            resetTracking()
            return res
        }
    })
    return instrumentations
}

function createGetter(isReadonly = false, shallow = false) {
    return function get(target: Target, key: string | symbol, receiver: object) {
        //
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return shallow
        } else if (key === ReactiveFlags.IS_SHALLOW) {
            return shallow
        }
        // 从缓存中取
        else if (
            key === ReactiveFlags.RAW &&
            receiver === (isReadonly
                    ? shallow
                        ? shallowReadonlyMap
                        : readonlyMap
                    : shallow
                        ? shallowReadonlyMap :
                        reactiveMap
            ).get(target)
        ) {
            return target
        }
        // 是否是数组
        const targetIsArray = isArray(target)
        if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
            return Reflect.get(arrayInstrumentations, key, receiver)
        }
        const res = Reflect.get(target, key, receiver)
        if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
            return res
        }
        if (!isReadonly) {
            // 跟踪
            track(target, TrackOpTypes.GET, key)
        }
        if (shallow) {
            return res
        }
        if (isRef(res)) {
            const shouldUnwrap = !targetIsArray || !isIntegerKey(key)
            return shouldUnwrap ? res.value : res
        }
        if (isObject(res)) {
            // return isReadonly ? readon
        }
        return res
    }
}

function createSetter(shallow = false) {
    return function set(
        target: object,
        key: string | symbol,
        value: unknown,
        receiver: object
    ): boolean {
        // 获取旧值
        let oldValue = (target as any)[key]
        if (!shallow && isReadonly(value)) {
            if (!isShallow(value)) {
                value = toRaw(value)
                oldValue = toRaw(oldValue)
            }
            if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                oldValue.value = value
                return true
            }
        } else {

        }
        const hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key)
        const result = Reflect.set(target, key, value, receiver)
        if (target === toRaw(receiver)) {
            if (!hadKey) {
                trigger(target, TriggerOpTypes.ADD, key, value)
            } else if (hasChanged(value, oldValue)) {
                trigger(target, TriggerOpTypes.SET, key, value, oldValue)
            }
        }
        return result
    }
}

function ownKeys(target: object): (string | symbol) [] {
    track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
    return Reflect.ownKeys(target)
}

function has(target: object, key: string | symbol): boolean {
    const result = Reflect.has(target, key)
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
        track(target, TrackOpTypes.HAS, key)
    }
    return result
}

function deleteProperty(target: object, key: string | symbol): boolean {
    const hadKey = hasOwn(target, key)
    const oldValue = (target as any)[key]
    const result = Reflect.deleteProperty(target, key)
    if (result && hadKey) {
        trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    return result
}
