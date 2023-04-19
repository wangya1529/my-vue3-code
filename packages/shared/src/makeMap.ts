/**
 * 将字符串转换成 map<string,boolean>
 * @param str ,拼接的字符串
 * @param expectsLowerCase 是否 小写
 */
export function makeMap(
    str: string,
    expectsLowerCase?: boolean
)
    : (key: string) => boolean
{
    const map : Record<string, boolean> = Object.create(null)
    const list: Array<string> = str.split(',')
    for (let i = 0; i < list.length; i++) {
        map[list[i]] = true
    }
    return  expectsLowerCase ? val => map[val.toLocaleLowerCase()]: val => map[val]
}
