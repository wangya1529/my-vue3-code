import {Dep} from "./dep";
import {CollectionTypes} from "./collectionHandlers";
import {ShallowReactiveMarker} from "./reactive";


declare const RefSymbol: unique symbol

export type ShallowRef<T = any> = Ref<T> & { [ShallowReactiveMarker]?: true }

export interface Ref<T = any> {
    value: T
    [RefSymbol]: true
}


type RefBase<T> = {
    dep?: Dep
    value: T
}
type BaseTypes = string | number | boolean

export interface RefUnwrapBailTypes {
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
