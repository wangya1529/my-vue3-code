import {ReactiveFlags, toRaw} from "./reactive";
import {track} from "./effect";
import {TrackOpTypes} from "./operations";

export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {}
export type CollectionTypes = IterableCollections | WeakCollections
// 集合类型
type IterableCollections =  Map<any,any> | Set<any>
type WeakCollections = WeakMap<any,any> | WeakSet<any>
type MapTypes = Map<any,any> | WeakMap<any,any>
type SetTypes = Set<any> | WeakSet<any>

const toShallow = <T extends unknown>(value: T):  T => value
// 获取原型对象
const getProto = <T extends CollectionTypes>(v: T): any => Reflect.getPrototypeOf(v)

function get(
    target:MapTypes,
    key: unknown,
    isReadonly = false,
    isShallow = false
) {
    // 获取原始对象
    target = (target as any)[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const rawKey = toRaw(key)
    if (key !== rawKey){
        !isReadonly && track(rawTarget,TrackOpTypes.GET,key)
    }
    !isReadonly && track(rawTarget,TrackOpTypes.GET ,rawKey)
    const { has } = getProto(rawTarget)
    // const wrap = isShallow ? toShallow : isReadonly ?
}

