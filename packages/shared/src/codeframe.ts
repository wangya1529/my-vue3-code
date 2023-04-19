const range: number = 2

/**
 * 编译Vue 3 模版 生成错误的代码片段
 * @param source 源代码
 * @param start 开始位置
 * @param end 结束为止
 */
export function generateCodeFrame(
    source: string,
    start: number = 0,
    end: number = source.length
): string {
    // 分割行 进行分割
    let lines = source.split(/(\r?\n)/)
    const newLineSequences = lines.filter((_, idx) => idx % 2 === 1)
    lines = lines.filter((_, idx) => idx % 2 === 0)
    // 计算字符
    let count = 0
    const res: string[] = []
    for (let i = 0; i < lines.length; i++) {
        if (count >= start) {
            for (let j = i - range; j < i + range || end > count; j++) {
                if (j < 0 || j > lines.length) continue
                const line = j + 1
                res.push(`${line}${' '.repeat(Math.max(3 - String(line).length, 0))}| 
                    ${lines[j]}
                `)
                const lineLength = lines[j].length
                const newLineSeqLength = (newLineSequences[j] && newLineSequences[j].length) || 0
                if (j === i) {
                    const pad = start - (count - (lineLength + newLineSeqLength))
                    const length = Math.max(1, end > count ? lineLength - pad : end - start)
                    res.push(`   |  ` + ' '.repeat(pad) + '^'.repeat(length))
                } else if (j > i) {
                    if (end > count) {
                        const length = Math.max(Math.min(end - count, lineLength), 1)
                        res.push(`   |  ` + '^'.repeat(length))
                    }
                    count += lineLength + newLineSeqLength
                }

            }
            break
        }

    }
    return res.join('\n')
}
