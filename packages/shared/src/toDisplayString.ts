import {isArray, isFunction, isMap, isObject, isPlainObject, isSet, objectToString} from "./index";


export const toDisplayString = (val: unknown): string => {
    return val == null
    ? ''
        : isArray(val) ||
        (isObject(val) && val.toString === objectToString || !isFunction(val.toString) )
    ? JSON.stringify(val,replacer,2)
            : String(val)
}
const replacer = (_key: string,val: any): any => {
    if (val && val.__v_isRef){
        return replacer(_key,val.value)
    } else if (isMap(val)){
        return {
            [`Map(${val.size})`]: [...val.entries()].reduce((entries,[key,val]) => {
                (entries as any)[`${key} =>`] = val
                return entries
            },{})
        }
    } else if (isSet(val)){
        return {[`Set(${val.size})`] : [...val.values()]}
    } else if (isObject(val) && !isArray(val) && !isPlainObject(val)) {
        return String(val)
    }
    return val
}
