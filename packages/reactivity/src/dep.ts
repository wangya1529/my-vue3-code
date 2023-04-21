import {ReactiveEffect, trackOpBit} from "./effect";

export type Dep = TrackedMarker & Set<ReactiveEffect>
type TrackedMarker = {
    /**
     * wasTracked
     */
    w: number,
    /**
     * newTracked
     */
    n: number
}
export const createDep = (effects?: ReactiveEffect[]): Dep => {
    const dep = new Set<ReactiveEffect>(effects) as Dep
    dep.w = 0
    dep.n = 0
    return dep
}
export const wasTracked = (dep: Dep): boolean => (dep.w & trackOpBit) > 0
export const newTracked = (dep: Dep): boolean => (dep.n & trackOpBit) > 0

export const initDepMarkers  = ({deps}: ReactiveEffect) => {
    if (deps.length) {
        for (let i = 0;i< deps.length;i++){
            deps[i].w |= trackOpBit
        }
    }
}

export const finalizeDepMarkers = (effect: ReactiveEffect) => {
    const { deps } = effect
    if (deps.length) {
        let ptr = 0
        for (let i = 0; i< deps.length; i ++) {
            const dep = deps[i]
            // 删除 effect
            if (wasTracked(dep) && !newTracked(dep)) {
                dep.delete(effect)
            } else {
                deps[ptr++] = dep
            }
            dep.w &= ~trackOpBit
            dep.n &= ~trackOpBit
        }
        deps.length = ptr
    }
}


