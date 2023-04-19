import {isArray, isDate, isObject} from "./index";

/**
 * 松散匹配数组
 * @param a a数组
 * @param b b数组
 */
function looseCompareArray(a: any[], b: any[]) {
    if (a.length != b.length) return false
    let equal = true
    for (let i = 0; equal && i < a.length; i++){
        equal = looseEqual(a[i],b[i])
    }
    return equal
}
// 松散匹配
export function looseEqual(a:any, b: any): boolean {
    if (a === b) return true
    // 日期类型做比较
    let aValidType = isDate(a)
    let bValidType = isDate(b)
    if (aValidType || bValidType){
        return aValidType && bValidType ? a.getTime() === b.getTime() : false
    }
    aValidType = isArray(a)
    bValidType = isArray(b)
    if (aValidType || bValidType){
        return aValidType && bValidType ? looseCompareArray(a,b) : false
    }
    // 对象匹配
    aValidType = isObject(a)
    bValidType = isObject(b)
    if (aValidType || bValidType){
        if (!aValidType || !bValidType){
            return false
        }
        const aKeyCount = Object.keys(a).length
        const bKeyCount = Object.keys(b).length
        if (aKeyCount !== bKeyCount){
            return false
        }
        for (const key in a) {
            const aHasKey = a.hasOwnProperty(key)
            const bHasKey = b.hasOwnProperty(key)
            if ((aHasKey && !bHasKey) ||
                (!aHasKey && bHasKey) ||
                !looseEqual(a[key],b[key])
            ){
                return false
            }
        }
    }
    return  String(a) === String(b)
}

// 松散匹配 获取 索引
export function looseIndexOf(arr: any[],val: any): number {
    return arr.findIndex(item => looseEqual(item,val))
}
