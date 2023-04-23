import {createDep, Dep} from "./dep";
import {CollectionTypes} from "./collectionHandlers";
import {isProxy, isReactive, ShallowReactiveMarker, toRaw, toReactive} from "./reactive";
import {isTracking, trackEffects} from "./effect";
import {TrackOpTypes, TriggerOpTypes} from "./operations";
import {hasChanged, IfAny, isArray} from "@vue/shared";


declare const RefSymbol: unique symbol

export type ShallowRef<T = any> = Ref<T> & { [ShallowReactiveMarker]?: true }

export interface Ref<T = any> {
    value: T
    [RefSymbol]: true
}

export function ref<T extends object>(
    value: T
): [T] extends [Ref] ? T : Ref<UnwrapRef<T>>
export function ref<T>(value: T): Ref<UnwrapRef<T>>
export function ref<T = any>(): Ref<T | undefined>
export function ref(value?: unknown) {
    return createRef(value, false)
}
function createRef(rawValue: unknown,shallow:boolean) {
    if (isRef(rawValue)){
        return rawValue
    }
    return new RefImpl(rawValue,shallow)
}
export function shallowRef<T extends object>(
    value: T
): T extends Ref ? T : ShallowRef<T>
export function shallowRef<T>(value: T): ShallowRef<T>
export function shallowRef<T = any>(): ShallowRef<T | undefined>
export function shallowRef(value?: unknown) {
    return createRef(value, true)
}
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>

export function isRef(r: any): r is Ref {
    return Boolean(r && r.__v__isRef === true)
}

export function trackRefValue(ref: RefBase<any>) {
    if (isTracking()) {
        ref = toRaw(ref)
        if (!ref.dep) {
            ref.dep = createDep()
        }
        if (__DEV__) {
            trackEffects(ref.dep, {
                target: ref,
                type: TrackOpTypes.GET,
                key: 'value'
            })
        } else {
            trackEffects(ref.dep)
        }
    }
}

export function triggerRefValue(ref: RefBase<any>, newValue?: any) {
    ref = toRaw(ref)
    if (ref.dep) {
        if (__DEV__) {
            trackEffects(ref.dep, {
                target: ref,
                type: TriggerOpTypes.SET,
                key: 'value',
                newValue: newValue
            })
        } else {
            trackEffects(ref.dep)
        }

    }
}


type RefBase<T> = {
    dep?: Dep
    value: T
}
type BaseTypes = string | number | boolean

export interface RefUnwrapBailTypes {
}

export type ShallowUnwrapRef<T> = {
    [K in keyof T]: T[K] extends Ref<infer V>
        ? V
        : T[K] extends Ref<infer V> | undefined
            ? unknown extends V ? undefined : V | undefined
            : T[K]
}

export type UnwrapRef<T> = T extends ShallowRef<infer V> ?
    V
    : T extends Ref<infer V>
        ? UnwrapRefSimple<V>
        : UnwrapRefSimple<T>
export type UnwrapRefSimple<T> = T extends | Function
    | CollectionTypes
    | BaseTypes
    | Ref
    | RefUnwrapBailTypes[keyof RefUnwrapBailTypes]
    ? T
    : T extends Array<any>
        ? { [K in keyof T]: UnwrapRefSimple<T[K]> }
        : T extends object & { [ShallowReactiveMarker]?: never }
            ? {
                [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>
            }
            : T

class RefImpl<T> {
    private _value: T
    private _rawValue: T
    public dep?: Dep = undefined
    public readonly __v_isRef = true

    constructor(value: T, public readonly __v_isShallow: boolean) {
        this._rawValue = __v_isShallow ? value : toRaw(value)
        this._value = __v_isShallow ? value : toReactive(value)
    }

    get value() {
        trackRefValue(this)
        return this._value
    }

    set value(newVal: T) {
        newVal = this.__v_isShallow ? newVal : toRaw(newVal)
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal
            this._value = this.__v_isShallow ? newVal : toReactive(newVal)
            triggerRefValue(this, newVal)
        }
    }
}

export function triggerRef(ref: Ref) {
    triggerRefValue(ref, __DEV__ ? ref.value : void 0)
}

export function unref<T>(ref: T | Ref<T>): T {
    return isRef(ref) ? (ref.value as any) : ref
}

const shallowUnwrapHandlers: ProxyHandler<any> = {
    get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
    set: (target, key, value, receiver) => {
        const oldValue = target[key]
        if (isRef(oldValue) && !isRef(value)) {
            oldValue.value = value
            return true
        } else {
            return Reflect.set(target, key, value, receiver)
        }
    }
}

export function proxyRefs<T extends object>(
    objectWithRefs: T
): ShallowUnwrapRef<T> {
    return isReactive(objectWithRefs)
        ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}

export type CustomRefFactory<T> = (track: () => void,
                                   trigger: () => void
) => {
    get: () => T
    set: (value: T) => void
}

class CustomRefImpl<T> {
    public dep?: Dep = undefined
    private readonly _get: ReturnType<CustomRefFactory<T>>['get']
    private readonly _set: ReturnType<CustomRefFactory<T>>['set']
    public readonly __v_is_Ref = true

    constructor(factory: CustomRefFactory<T>) {
        const {get, set} = factory(
            () => trackRefValue(this),
            () => triggerRefValue(this)
        )
        this._set = set
        this._get = get
    }

    get value() {
        return this._get()
    }

    set value(newVal: T) {
        this._set(newVal)
    }
}

export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
    return new CustomRefImpl(factory) as any
}
export type ToRef<T> = IfAny<T, Ref<T>, [T] extends [Ref] ? T : Ref<T>>

export type ToRefs<T = any> = {
    [K in keyof T]: ToRefs<T[K]>
}

export function toRefs<T extends object>(object: T): ToRefs<T> {
    if (__DEV__ && !isProxy(object)) {
        console.warn(`toRefs() expects a reactive object but received a plain one`)
    }
    const ret: any = isArray(object) ? new Array(object.length) : {}
    for (const key in object) {
        ret[key] = toRef(object,key)
    }
    return ret
}
class ObjectRefImpl<T extends object,K extends keyof T> {
    public readonly __v_isRef = true
    constructor(private readonly _object: T,
                private readonly _key: K,
                private readonly _defaultValue?: T[K]
                ) {
    }
    get value() {
        const val = this._object[this._key]
        return val === undefined ? (this._defaultValue as T[K]) : val
    }
    set value(newVal) {
        this._object[this._key] = newVal
    }
}
export function toRef<T extends object, K extends keyof T>
(object: T,
 key: K): ToRefs<T[K]>
export function toRef<T extends object, K extends keyof T>
(object: T,
 key: K,
 defaultValue: T[K])
    : ToRefs<Exclude<T[K], undefined>>

export function toRef<T extends object,K extends keyof T>
(object: T,
 key: K,
 defaultValue?: T[K])
:ToRefs<T[K]> {
    const val = object[key]
    return isRef(val) ? val
        : (new ObjectRefImpl(object,key,defaultValue) as any)
}

