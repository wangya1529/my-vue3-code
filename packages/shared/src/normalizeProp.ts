import {hyphenate, isArray, isObject, isString} from "./";
import {isNoUnitNumericStyleProp} from "./domAttrConfig";

export type NormalizedStyle = Record<string, string | number>

/**
 * 处理样式
 * @param value 样式值
 */
export function normalizeStyle(
    value: unknown
): NormalizedStyle | string | unknown {
    // 样式是数组
    if (isArray(value)){
        const res: NormalizedStyle = {}
        for (let i = 0; i < value.length; i++) {
            const item = value[i]
            const normalized = isString(item)
            ? parseStringStyle(item)
                : (normalizeStyle(item) as NormalizedStyle)
            if (normalized) {
                for (const key in normalized) {
                    res[key] = normalized[key]
                }
            }
        }
        return res
    } else if (isString(value)){
        return  value
    } else if (isObject(value)){
        return value
    }
}
// 匹配分号但排除在() 的字符;
const listDelimiterRE = /;(?![^(]*\))/g
// :分割
const propertyDelimiterRE = /:(.+)/

export function stringifyStyle(
    styles: NormalizedStyle | string | undefined
): string {
    let ret = ''
    if (!styles || isString(styles)){
        return ret
    }
    for (const key in styles){
        const value = styles[key]
        const normalizedKey = key.startsWith(`--`) ? key : hyphenate(key)
        if (isString(value) || isNoUnitNumericStyleProp(normalizedKey)){
            ret += `${normalizedKey}:${value}`
        }
    }
    return ret
}

export function parseStringStyle(cssText:string): NormalizedStyle {
    const ret:NormalizedStyle = {}
    cssText.split(listDelimiterRE).forEach(item => {
        if (item){
            const tmp = item.split(propertyDelimiterRE)
            tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim())
        }
    })
    return ret
}
export function normalizeClass(value: unknown): string {
    let res = ''
    if (isString(value)){
        res = value
    } else if (isArray(value)) {
        for (let i = 0;i < value.length; i++) {
            const normalized = normalizeClass(value[i])
            if (normalized) {
                res += normalized +  ' '
            }
        }
    } else if (isObject(value)){
        for (const name in value){
            if (value[name]) {
                res += name + ' '
            }
        }
    }
    return  res.trim()
}
export function normalizeProps(props: Record<string, any> | null) {
    if (!props) return null
    let{ class: klass, style} = props
    if (klass && !isString(klass)){
        props.class = normalizeClass(klass)
    }
    if (style){
        props.styple = normalizeStyle(style)
    }
    return props
}
