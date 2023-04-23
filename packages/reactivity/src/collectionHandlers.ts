import {ReactiveFlags, toRaw, toReactive, toReadonly} from "./reactive";
import {ITERATE_KEY, MAP_KEY_ITERATE_KEY, track, trigger} from "./effect";
import {TrackOpTypes, TriggerOpTypes} from "./operations";
import {capitalize, hasChanged, hasOwn, isMap, toRowType} from "@vue/shared";

export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
    get: createInstrumentationGetter(false,false)
}
export const shallowCollectionHandler: ProxyHandler<CollectionTypes> = {
    get: createInstrumentationGetter(false,true)
}
export const readonlyCollectionHandlers: ProxyHandler<CollectionTypes> = {
    get: createInstrumentationGetter(true,true)
}
export const shallowReadonlyCollectionHandlers: ProxyHandler<CollectionTypes> = {
    get: createInstrumentationGetter(true,true)
}


export type CollectionTypes = IterableCollections | WeakCollections
// 集合类型
type IterableCollections = Map<any, any> | Set<any>
type WeakCollections = WeakMap<any, any> | WeakSet<any>
type MapTypes = Map<any, any> | WeakMap<any, any>
type SetTypes = Set<any> | WeakSet<any>

const toShallow = <T extends unknown>(value: T): T => value
// 获取原型对象
const getProto = <T extends CollectionTypes>(v: T): any => Reflect.getPrototypeOf(v)

function get(
    target: MapTypes,
    key: unknown,
    isReadonly = false,
    isShallow = false
) {
    // 获取原始对象
    target = (target as any)[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const rawKey = toRaw(key)
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, TrackOpTypes.GET, key)
    }
    !isReadonly && track(rawTarget, TrackOpTypes.GET, rawKey)
    const {has} = getProto(rawTarget)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly: toReactive
    if (has.call(rawTarget,key)){
        return wrap(target.get(key))
    } else if (has.call(rawTarget,rawKey)) {
        return wrap(target.get(rawKey))
    } else if (target !== rawTarget) {
        target.get(key)
    }
}

function createInstrumentations() {
    const mutableInstrumentations: Record<string, Function> = {
        get(this: MapTypes, key: unknown) {
            return get(this, key)
        },
        get size() {
            return size(this as unknown as IterableCollections)
        },
        has,
        add,
        set,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false,false)
    }
    const shallowInstrumentations: Record<string, Function> = {
        get(this:MapTypes,key:unknown){
            return get(this,key,false,true)
        },
        get size(){
            return size(this as unknown as IterableCollections)
        },
        has,
        add,
        set,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false,true)
    }
    const readonlyInstumentations: Record<string, Function> = {
        get(this:MapTypes,key: unknown){
            return get(this,key,true)
        },
        get size() {
            return size(this as unknown as IterableCollections,true)
        },
        has(this: MapTypes,key: unknown) {
            return has.call(this,key,true)
        },
        add: createReadonlyMethod(TriggerOpTypes.ADD),
        set: createReadonlyMethod(TriggerOpTypes.SET),
        delete: createReadonlyMethod(TriggerOpTypes.DELETE),
        clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
        forEach: createForEach(true,false)
    }
    const shallowReadonlyInstrumentations: Record<string,Function> = {
        get(this:MapTypes,key: unknown){
            return get(this,key,true,true)
        },
        get size() {
            return size(this as unknown as IterableCollections,true)
        },
        has(this:MapTypes,key: unknown){
            return has.call(this,key,true)
        },
        add: createReadonlyMethod(TriggerOpTypes.ADD),
        set: createReadonlyMethod(TriggerOpTypes.SET),
        delete: createReadonlyMethod(TriggerOpTypes.DELETE),
        clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
        forEach: createForEach(true,true)
    }
    const iteratorMethods = ['keys','values','entries',Symbol.iterator]
    iteratorMethods.forEach(method => {
        mutableInstrumentations[method as string] = createIterableMethod(method,false,false)
        readonlyInstumentations[method as string] = createIterableMethod(method,true,false)
        shallowInstrumentations[method as string] = createIterableMethod(method,false,true)
        shallowReadonlyInstrumentations[method as string] = createIterableMethod(method,true,true)
    })
    return [
        mutableInstrumentations,
        readonlyInstumentations,
        shallowInstrumentations,
        shallowReadonlyInstrumentations
    ]
}
const [
    mutableInstrumentations,
    readonlyInstrumentations,
    shallowInstrmentations,
    shallowReadonlyInstrumentations
] = createInstrumentations()

function deleteEntry(this: CollectionTypes, key: unknown): boolean {
    const target = toRaw(this)
    const {has, get} = getProto(target)
    let hadKey = has.call(target, key)
    // 不存在key
    if (!hadKey) {
        key = toRaw(key)
        hadKey = has.call(target, key)
    } else if (__DEV__) {
        checkIdentityKeys(target, has, key)
    }
    const oldValue = get ? get.call(target, key) : undefined
    const result = target.delete(key)
    if (hadKey) {
        trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    return result
}

function clear(this: IterableCollections) {
    const target = toRaw(this)
    const hadItems = target.size !== 0
    const oldTarget = __DEV__
        ? isMap(target)
            ? new Map(target)
            : new Set(target) : undefined
    const result = target.clear()
    if (hadItems) {
        trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, oldTarget)
    }
    return result
}

interface Iterable {
    [Symbol.iterator]: Iterator
}

interface Iterator {
    next(value?: any): IterationResult
}

interface IterationResult {
    value: any
    done: boolean
}

function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
    const instrumentations = shallow
        ? isReadonly
            ? shallowReadonlyInstrumentations
            : shallowInstrmentations
        : isReadonly ? readonlyInstrumentations : mutableInstrumentations
    return(target: CollectionTypes,
           key: string | symbol,
           receiver: CollectionTypes) => {
        // 判断key
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if(key === ReactiveFlags.IS_READONLY){
            return isReadonly
        }  else if (key === ReactiveFlags.RAW){
            return target
        }
        return Reflect.get(
            hasOwn(instrumentations,key) && key in target ? instrumentations : target,
            key,
            receiver
        )
    }
}

function has(this: CollectionTypes,key: unknown,isReadonly = false): boolean {
    const target = (this as any)[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const rawKey = toRaw(key)
    if (key !== rawKey){
        !isReadonly && track(rawTarget,TrackOpTypes.HAS, key)
    }
    !isReadonly && track(rawTarget,TrackOpTypes.HAS, rawKey)
    return key === rawKey
    ? target.has(key)
        : target.has(key) || target.has(rawKey)
}
function size(target: IterableCollections, isReadonly = false): any {
    target = (target as any)[ReactiveFlags.RAW]
    !isReadonly && track(toRaw(target), TrackOpTypes.ITERATE, ITERATE_KEY)
    return Reflect.get(target, 'size', target)
}

function add(this: SetTypes, value: unknown) {
    value = toRaw(value)
    const target = toRaw(this)
    const proto = getProto(target)
    // 是否存在key
    const hadKey = proto.has.call(target, value)
    if (!hadKey) {
        target.add(value)
        trigger(target, TriggerOpTypes.ADD, value, value)
    }
    return this
}

function set(this: MapTypes, key: unknown, value: unknown) {
    value = toRaw(value)
    const target = toRaw(this)
    const {has, get} = getProto(target)
    let hadKey = has.call(target, key)
    if (!hadKey) {
        key = toRaw(key)
        hadKey = has.call(target, key)
    } else if (__DEV__) {
        checkIdentityKeys(target, has, key)
    }
    // 获取旧值
    const oldValue = get.call(target, key)
    target.set(key, value)
    if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
    }
    // 触发更新
    else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    return this
}

function createForEach(isReadonly: boolean, isShallow: boolean) {
    return function forEach(
        this: IterableCollections,
        callback: Function,
        thisArgs?: unknown
    ) {
        const observed = this as any
        const target = observed[ReactiveFlags.RAW]
        const rawTarget = toRaw(target)
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
        !isReadonly && track(rawTarget, TrackOpTypes.ITERATE, ITERATE_KEY)
        return target.forEach((value: unknown, key: unknown) => {
            return callback.call(thisArgs, wrap(value), wrap(key), observed)
        })
    }
}
function createIterableMethod(
    method: string | symbol,
    isReadonly: boolean,
    isShallow: boolean
){
    return function (this: IterableCollections,
                     ...args: unknown[]){
        const target = (this as any)[ReactiveFlags.RAW]
        const rawTarget = toRaw(target)
        const targetIsMap = isMap(rawTarget)
        const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap)
        const isKeyOnly = method === 'keys' && targetIsMap
        const innerIterator = target[method](...args)
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
        !isReadonly && track(rawTarget,TrackOpTypes.ITERATE , isKeyOnly ? MAP_KEY_ITERATE_KEY :ITERATE_KEY)
        return {
            next() {
                const { value, done} = innerIterator.next()
                return done
                ? {value,done}
                    : {
                    value: isPair ? [wrap(value[0]),wrap(value[1])] : wrap(value),
                        done
                    }
            },
            [Symbol.iterator]() {
                return this
            }
        }
    }
}
function createReadonlyMethod(type: TriggerOpTypes): Function {
    return function (this: CollectionTypes,... args: unknown[]) {
        if (__DEV__){
            const key = args[0] ? `on key "${args[0]}"` :  ``
            console.warn(`${
                capitalize(type)
            } operation ${key}failed: target is readonly`)
        }
        return type === TriggerOpTypes.DELETE ? false : this
    }
}

function checkIdentityKeys(
    target: CollectionTypes,
    has: (key: unknown) => boolean,
    key: unknown
) {
    const rawKey = toRaw(key)
    if (rawKey !== key && has.call(target, rawKey)) {
        const type = toRowType(target)
        console.warn(
            `Reactive ${type} contains both the raw and reactive `
            + `versions of the same object${type === `Map` ? `as keys` : ''},`
            + `which can lead to inconsistencies.` +
            `Avoid differentiating between the raw and reactive versions` +
            `of an object and only use the reactive version if possible`
        )
    }
}

