const fs = require('fs')
const chalk = require('chalk')
// 所有目标文件
const targets = (exports.targets = fs.readdirSync('packages').filter(f => {
    // 获取文件对象信息
    if (!fs.statSync(`packages/${f}`).isDirectory()){
        return false
    }
    const pkg = require(`../packages/${f}/package.json`)
    // 包私有或者没有构建选项
    if (pkg.private && !pkg.buildOptions){
        return false
    }
    return true
}))
// 模糊匹配
exports.fuzzyMatchTarget = (partialTargets,includeAllMatching) => {
    const matched = []
    partialTargets.forEach(partialTarget => {
        for (let target of targets) {
            if (target.match(partialTarget)){
                matched.push(target)
                if (!includeAllMatching){
                    break
                }
            }
        }
    })
    if (matched.length){
        return matched
    } else {
        console.log()
        console.error(`${chalk.bgRed.white('ERROR')} ${chalk.red(
            `Target ${chalk.underline(partialTargets)} not found`
        )}`)
    }
    console.log()
    process.exit(1)
}
