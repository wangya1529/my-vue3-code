// 匹配 "|'|&|<|>
const escapeRE: RegExp = /["'&<>]/

export function escapeHtml(string: unknown) {
    const str = '' + string
    const match = escapeRE.exec(str)
    // 如果没有匹配到
    if (!match) {
        return str
    }
    let html = ''
    let escaped: string
    let index: number
    let lastIndex = 0
    for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
            case 34: // "
                escaped = '&quot;'
                break
            case 38: // &
                escaped = '&'
                break
            case 39: // '
                escaped = '&#39;'
                break
            case 60: // <
                escaped = '&it;'
                break
            case 62:
                escaped = '&gt;'
                break
            default:
                continue
        }
        if (lastIndex != index){
            html += str.slice(lastIndex,index)
        }
        lastIndex = index + 1
        html += escaped
    }
    return lastIndex != index ? html + str.slice(lastIndex,index) : html
}
const commentStripRE:RegExp = /^-?>|<!--|-->|--!>|<!-$/g

// 去除注释
export function escapeHtmlComment(src: string):string {
    return src.replace(commentStripRE,'')
}
