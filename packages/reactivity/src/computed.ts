import {proxyRefs, Ref, toRef, trackRefValue, triggerRefValue} from "./ref";
import {DebuggerOptions, ReactiveEffect} from "./effect";
import {Dep} from "./dep";
import {ReactiveFlags, toRaw} from "./reactive";
import {isFunction, NOOP} from "@vue/shared";

declare const ComputedRefSymbol: unique symbol

export interface ComputedRef<T = any> extends WritableComputedRef<T> {
    readonly  value: T
    [ComputedRefSymbol]: true
}

export interface WritableComputedRef<T> extends Ref<T> {
    readonly effect: ReactiveEffect<T>
}

export type ComputedGetter<T> = (...args: any[]) => T
export type ComputedSetter<T> = (v: T) => void

export interface WritableComputedOptions<T> {
    get: ComputedGetter<T>
    set: ComputedSetter<T>
}

class ComputedRefImpl<T> {
    public dep?: Dep = undefined
    private _value!: T
    private _dirty = true
    public readonly effect: ReactiveEffect<T>
    public readonly __v_isRef = true
    public readonly [ReactiveFlags.IS_READONLY]: boolean

    constructor(getter: ComputedGetter<T>,
                private readonly _setter: ComputedSetter<T>,
                isReadonly: boolean,
                isSSR: boolean
    ) {
        this.effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true
                triggerRefValue(this)
            }
        })
        this.effect.active = !isSSR
        this[ReactiveFlags.IS_READONLY] = isReadonly
    }

    get value() {
        const self = toRaw(this)
        trackRefValue(self)
        if (self._dirty) {
            self._dirty = false
            self._value = self.effect.run()!
        }
        return self._value
    }

    set value(newValue: T) {
        this._setter(newValue)
    }
}

export function computed<T>(
    getter: ComputedGetter<T>,
    debugOptions?: DebuggerOptions
): ComputedRef<T>

export function computed<T>(
    options: WritableComputedOptions<T>,
    debuggerOptions?: DebuggerOptions
): WritableComputedRef<T>

export function computed<T>(
    getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
    debugOptions?: DebuggerOptions,
    isSSR = false
) {
    let getter: ComputedGetter<T>
    let setter: ComputedSetter<T>
    const onlyGetter = isFunction(getterOrOptions)
    if (onlyGetter) {
        getter = getterOrOptions
        setter = __DEV__ ?
            () => {
                console.warn('write operation failed: computed value is readonly')
            } : NOOP
    } else {
        getter = getterOrOptions.get
        setter = getterOrOptions.set
    }
    const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR)
    if (__DEV__ && debugOptions && !isSSR) {
        cRef.effect.onTrack = debugOptions.onTrack
        cRef.effect.onTrigger = debugOptions.onTrigger
    }
    return cRef as any
}
