// 空对象
import {makeMap} from "./makeMap";
export { makeMap }
export * from './patchFlags'
export * from './shapeFlags'
export * from './slotFlags'
export * from './globalsWhitelist'
export * from './codeframe'
export * from './normalizeProp'
export * from './domTagConfig'
export * from './domAttrConfig'
export * from './escapeHtml'
export * from './looseEqual'
export * from './toDisplayString'
export * from './typeUtils'

export const EMPTY_OBJ: { readonly [key: string]: any } = __DEV__
    ? Object.freeze({}) : {}
// 空数组
export const EMPTY_ARR = __DEV__ ? Object.freeze([]) : []
// 空操作
export const NOOP = () => {
}
// 永远返回False
export const NO = () => false
// 事件正则
export const onRE: RegExp = /^on[^a-z]/
// 是否是 model 监听事件
export const isModelListener = (key: string) => key.startsWith('onUpdate:')
// 继承方法
export const extend = Object.assign
// 移除数组元素
export const remove = <T>(arr: T[], el: T) => {
    const i = arr.indexOf(el)
    if (i > -1) {
        arr.splice(i, 1)
    }
}
// 是否拥有某个属性
const hasOwnProperty = Object.prototype.hasOwnProperty
// 是否拥有某个key
export const hasOwn = (
    val: Object,
    key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)
// 是否是数组
export const isArray = Array.isArray
// 是否是map
export const isMap = (val: unknown): val is Map<any, any> =>
    toTypeString(val) === '[object Map]'
// 是否是set
export const isSet = (val: unknown): val is Set<any> =>
    toTypeString(val) === '[object Set]'
// 是否是Date
export const isDate = (val: unknown): val is Date => val instanceof Date
// 是否是String
export const isString = (val: unknown): val is string => typeof val === 'string'
// 是否是 symbol
export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'
// 是否是 Object
export const isObject = (val: unknown): val is Record<any, any> =>
    val !== null && typeof val === 'object'
// 是否 promise
export const isFunction = (val: unknown): val is Function =>
    typeof val === 'function'
export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch)
}
export const objectToString = Object.prototype.toString

// 类型 toString
export const toTypeString = (value: unknown): string => objectToString.call(value)
// 获取原始类型字符串
export const toRowType = (value: unknown): string => {
    return toTypeString(value).slice(8, -1)
}
// 是否是对象类型
export const isPlainObject = (val: unknown): val is object =>
    toTypeString(val) === '[object Object]'

export const isIntegerKey = (key: unknown) =>
    isString(key) &&
    key != 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key

export const isReservedProp = makeMap(
    ',key,ref,ref_for,ref_key,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted'
)
// 缓存 string 方法
const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
    const cache: Record<string, string> = Object.create(null)
    return ((str: string) => {
        const hit = cache[str]
        return hit || (cache[str] = fn(str))
    }) as any
}
// 匹配以 -开头的字符
const camelizeRE = /-(\w)/g

export const camelize = cacheStringFunction((str: string): string => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
})
// 匹配大写字母
const hyphenateRE: RegExp = /\B([A-Z])/g
// 把 aaaB 转换成 aaa-b
export const hyphenate = cacheStringFunction((str: string) =>
    str.replace(hyphenateRE, '-$1').toLowerCase()
)
/**
 * 首字符大写
 */
export const capitalize = cacheStringFunction(
    (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
)
// 事件名转换
export const toHandlerKey = cacheStringFunction((str: string) =>
    str ? `on${capitalize(str)}` : ``
)
// 判断值是否发生改变
export const hasChanged = (value: any, oldValue: any): boolean =>
    !Object.is(value, oldValue)
// 执行数组方法
export const invokeArrayFns = (fns: Function[], arg?: any) => {
    for (let i = 0; i < fns.length; i++) {
        fns[i](arg)
    }
}
/**
 * 定义对象属性
 * @param obj 对象
 * @param key key
 * @param value 值
 */
export const def = (obj: object, key: string | symbol, value: any) => {
    Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: false,
        value
    })
}
/**
 * 转数字
 * @param val 值
 */
export const toNumber = (val: any): any => {
    const n = parseFloat(val)
    return isNaN(n) ? val : n
}
let _globalThis: any

/**
 * 获取全局对象
 */
export const getGlobalThis = (): any => {
    return (
        _globalThis ||
        (_globalThis !== 'undefined'
                ? _globalThis
                : typeof self !== 'undefined'
                    ? self
                    : typeof window !== 'undefined'
                        ? window : typeof global !== 'undefined'
                            ? global : {}

        )
    )
}

