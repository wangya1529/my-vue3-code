// 响应式标识
import {def, extend, isObject, toRowType} from "@vue/shared";
import {Ref, UnwrapRefSimple} from "./ref";
import {mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers} from "./baseHandler";
import {
    mutableCollectionHandlers,
    readonlyCollectionHandlers,
    shallowCollectionHandler,
    shallowReadonlyCollectionHandlers
} from "./collectionHandlers";


export declare const ShallowReactiveMarker: unique symbol

export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>

export const enum ReactiveFlags {
    SKIP = '__v_skip', // 是否跳过
    IS_REACTIVE = '__v_isReactive', // 是否 响应式
    IS_READONLY = '__v_isReadonly', // 是否只读
    IS_SHALLOW = '__v_isShallow', // 是否是浅响应
    RAW = '__v_raw'
}

export interface Target {
    [ReactiveFlags.SKIP]?: boolean
    [ReactiveFlags.IS_REACTIVE]?: boolean
    [ReactiveFlags.IS_READONLY]?: boolean
    [ReactiveFlags.IS_SHALLOW]?: boolean
    [ReactiveFlags.RAW]?: any
}

// 响应式 缓存
export const reactiveMap = new WeakMap<Target, any>()
// 浅响应式  缓存
export const shallowReactiveMap = new WeakMap<Target, any>()

// 只读的缓存
export const readonlyMap = new WeakMap<Target, any>()
// 浅只读缓存
export const shallowReadonlyMap = new WeakMap<Target, any>()

// 目标类型
const enum TargetType {
    INVALID = 0,
    COMMON = 1,
    COLLECTION = 2
}

// 目标类型 转换map
function targetTypeMap(rawType: string) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return TargetType.COMMON
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return TargetType.COLLECTION
        default:
            return TargetType.INVALID
    }
}

/**
 * 获取目标类型
 * @param value
 */
function getTargetType(value: Target) {
    // 如果是跳过标识 或者 扩展标识 就返回 invalid
    return value[ReactiveFlags.SKIP] || Object.isExtensible(value)
        ? TargetType.INVALID : targetTypeMap(toRowType(value))
}

// 原始类型
type Primitive = string | number | boolean | bigint | symbol | unknown | null
// 内置类型
type Builtin = Primitive | Function | Date | Error | RegExp
export type DeepReadonly<T> = T extends Builtin
    ? T
    : T extends Map<infer K, infer V>
        ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
        : T extends WeakMap<infer K, infer V>
            ? WeakMap<DeepReadonly<K>, DeepReadonly<V>>
            : T extends Set<infer U>
                ? ReadonlySet<DeepReadonly<U>>
                : T extends ReadonlySet<infer U>
                    ? ReadonlySet<DeepReadonly<U>>
                    : T extends WeakSet<infer U>
                        ? WeakSet<DeepReadonly<U>>
                        : T extends Promise<infer U>
                            ? Promise<DeepReadonly<U>>
                            : T extends Ref<infer U>
                                ? Ref<DeepReadonly<U>>
                                : T extends {}
                                    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
                                    : Readonly<T>

export function readonly<T extends object>(
    target: T
): DeepReadonly<UnwrapNestedRefs<T>> {
    return createReactiveObject(
        target,
        true,
        readonlyHandlers,
        readonlyCollectionHandlers,
        readonlyMap
    )
}

export function shallowReadonly<T extends object>(target: T): Readonly<T> {
    return createReactiveObject(
        target, true,
        shallowReadonlyHandlers,
        shallowReadonlyCollectionHandlers,
        shallowReadonlyMap
    )
}

export type ShallowReactive<T> = T & { [ShallowReactiveMarker]?: true }

export function shallowReactive<T extends object>(
    target: T
): ShallowReactive<T> {
    return createReactiveObject(target, false,
        shallowReactiveHandlers,
        shallowCollectionHandler,
        shallowReactiveMap
    )
}

/**
 * 转换成原始对象 可能是嵌套的
 */
export function toRaw<T>(obs: T): T {
    const raw = obs && (obs as Target)[ReactiveFlags.RAW]
    return raw ? toRaw(raw) : obs
}

export function markRaw<T extends object>(value: T) {
    def(value, ReactiveFlags.SKIP, true)
    return value
}


function getTarget(value: Target) {
    return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
        ? TargetType.INVALID : targetTypeMap(toRowType(value))

}

export function reactive<T extends object>(target: T): UnwrapNestedRefs<any>

export function reactive(target: object) {
    if (isReadonly(target)) {
        return target
    }
    return createReactiveObject(target,
        false,
        mutableHandlers,
        mutableCollectionHandlers,
        reactiveMap
    )
}

/**
 * 创建响应式对象
 * @param target 目标对象
 * @param isReadonly 是否只读
 * @param baseHandlers 对象处理
 * @param collectionHandlers 集合处理
 * @param proxyMap 代理对象缓存
 */
function createReactiveObject(
    target: Target,
    isReadonly: boolean,
    baseHandlers: ProxyHandler<any>,
    collectionHandlers: ProxyHandler<any>,
    proxyMap: WeakMap<Target, any>
) {
    // 响应式只能接受对象
    if (!isObject(target)) {
        if (__DEV__) {
            console.warn(`value cannot be made reactive: ${String(target)}`)
        }
        return target
    }
    // 说明已经是响应式对象
    if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
        return target
    }
    // 从缓存中取
    const existingProxy = proxyMap.get(target)
    if (existingProxy) {
        return existingProxy
    }
    const targetType = getTargetType(target)
    if (targetType == TargetType.INVALID) {
        return target
    }
    const proxy = new Proxy(
        target,
        targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
    )
    proxyMap.set(target, proxy)
    return proxy
}

export function isReactive(value: unknown): boolean {
    if (isReadonly(value)) {
        return isReactive((value as Target) [ReactiveFlags.RAW])
    }
    return !!(value && (value as Target) [ReactiveFlags.IS_REACTIVE])
}

export function isReadonly(value: unknown): boolean {
    return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
}

export function isShallow(value: unknown): boolean {
    return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW])
}

export function isProxy(value: unknown): boolean {
    return isReactive(value) || isReadonly(value)
}

export const toReactive = <T extends unknown>(value: T): T =>
    isObject(value) ? reactive(value) : value

export const toReadonly = <T extends unknown>(value: T): T =>
    isObject(value) ? readonly(value as Record<any, any>) : value




