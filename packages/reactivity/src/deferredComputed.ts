import {Dep} from "./dep";
import {ReactiveEffect} from "./effect";
import {ReactiveFlags, toRaw} from "./reactive";
import {ComputedGetter, ComputedRef} from "./computed";
import { trackRefValue, triggerRefValue} from "./ref";

const tick = Promise.resolve()
const queue: any[] = []
let queued = false
const scheduler = (fn: any) => {
    queue.push(fn)
    if (!queued){
        queued = true
        tick.then(flush)
    }
}
const flush = () => {
    for (let i = 0; i< queue.length; i++){
        queue[i]()
    }
    queue.length = 0
    queued = false
}
class DeferredComputedRefImpl<T> {
    public dep?: Dep = undefined
    private _value!: T
    private _dirty = true
    public readonly effect: ReactiveEffect<T>
    public readonly __v_isRef = true
    public readonly [ReactiveFlags.IS_READONLY] = true
    constructor(getter:ComputedGetter<T>) {
        let compareTarget: any
        let hasCompareTarget = false
        let scheduled = false
        this.effect = new ReactiveEffect(getter,(computedTrigger?: boolean) => {
            if (this.dep){
                if (computedTrigger){
                    compareTarget = this._value
                    hasCompareTarget = true
                } else if (!scheduled){
                    const valueToCompare = hasCompareTarget ? compareTarget : this._value
                    scheduled = true
                    hasCompareTarget = false
                    scheduler(() => {
                        if (this.effect.active && this._get() !== valueToCompare) {
                            triggerRefValue(this)
                        }
                        scheduled = false
                    })
                }
                for (const e of this.dep){
                    if (e.computed){
                        e.scheduler!(true)
                    }
                }
            }
            this._dirty = true
        })
        this.effect.computed = true
    }
    private _get() {
        if (this._dirty){
            this._dirty = false
            return (this._value = this.effect.run()!)
        }
        return this._value
    }
    get value() {
        trackRefValue(this)
        return toRaw(this)._get()
    }
}
export function deferredComputed<T>(getter: () => T):ComputedRef<T> {
    return new DeferredComputedRefImpl(getter) as any
}
