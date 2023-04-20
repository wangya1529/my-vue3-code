

declare const RefSymbol: unique symbol
export interface Ref<T = any> {
    value: T
    [RefSymbol]: true
}
