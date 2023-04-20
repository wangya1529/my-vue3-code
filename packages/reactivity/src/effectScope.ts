import {ReactiveEffect} from "./effect";
import {warn} from "./warning";
// 激活的 effectScope
let activeEffectScope: EffectScope | undefined
const effectScopeStack: EffectScope[] = []
export class EffectScope {
    // 是否激活
    active = true
    // effects
    effects: ReactiveEffect[] = []
    // 清除函数
    cleanups: (() => void)[] = []
    // 父元素
    parent: EffectScope | undefined
    // scopes
    scopes: EffectScope[] | undefined
    // 索引
    private index: number | undefined

    constructor(detached = false) {
        if (!detached && activeEffectScope){
            this.parent = activeEffectScope
            this.index = (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this) - 1
        }
    }

    run<T>(fn: () => T) : T | undefined {
        if (this.active){
            try {
                this.on()
                return fn()
            } finally {
                this.off()
            }
        } else if (__DEV__){
            console.warn(`cannot run an inactive effect scope`)
        }
    }

    on() {
        if (this.active){
            effectScopeStack.push(this)
            activeEffectScope = this
        }
    }
    off() {
        if (this.active) {
            effectScopeStack.pop()
            activeEffectScope = effectScopeStack[effectScopeStack.length - 1]
        }
    }

    stop(fromParent?: boolean) {
        if (this.active) {
            this.effects.forEach(e => e.stop())
            this.cleanups.forEach(cleanup => cleanup())
            if (this.scopes) {
                this.scopes.forEach(e => e.stop(true))
            }
            if (this.parent && !fromParent){
                const last = this.parent.scopes!.pop()
                if (last && last !== this){
                    this.parent.scopes![this.index!] = last
                    last.index = this.index!
                }
            }
            this.active = false
        }
    }
}
export function effectScope(detached?: boolean) {
    return new EffectScope(detached)
}
export function getCurrentScope() {
    return activeEffectScope
}

export function recordEffectScope(
    effect: ReactiveEffect,
    scope?: EffectScope | null
) {
    scope = scope || activeEffectScope
    if (scope && scope.active){
        scope.effects.push(effect)
    }
}

/**
 *
 * @param fn 注册清理函数
 */
export function onScopeDispose(fn: () => void) {
    if (activeEffectScope) {
        activeEffectScope.cleanups.push(fn)
    } else if (__DEV__) {
        warn(`onScopeDispose() is called when there is no active effect scope to be associated with`)
    }
}
