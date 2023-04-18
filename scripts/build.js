// 获取运行环境目录
const path = require('path')
// node输出美化 chalk
const chalk = require('chalk')
// Execa库 执行本地命令
const execa = require('execa')
// brotli 压缩
const {compress} = require('brotli')
// gzip 压缩
const {gzipSync} = require('zlib')
// 文件操作
const fs = require('fs-extra')
// 获取命令行参数
const args = require('minimist')(process.argv.slice(2))
// 获取包信息
const {targets: allTargets,fuzzyMatchTarget} = require('./utils');
// 获取 target 也就是_
const targets = args._
// 一些命令行参数
const formats = args.formats || args.f
// 是否是开发环境
const devOnly = args.devOnly || args.d
// 是否是生产环境 非开发环境
const prodOnly = !devOnly && (args.prodOnly || args.p)
// 是否生成 sourceMap
const sourceMap = args.sourceMap || args.s
// 是否release版本 如果是则 需要清除build的缓存,避免过时的枚举
const isRelease = args.release
const buildTypes = args.t || args.types || isRelease
// 是否构建所有
const buildAllMatching = args.all || args.a
// 获取最新的 commit id 截取前七位
const commit = execa.sync('git', ['rev-parse', 'HEAD']).stdout.slice(0, 7)
// 执行构建
const run = async () => {
    if (isRelease) {
        await fs.remove(path.resolve(__dirname, '../node_modules/.rts2_cache'))
    }
}

async function build(target) {
    // 包路径
    const pkgDir = path.resolve(`packages/${target}`)
    const pkg = require(`${pkgDir}/package.json`)
    if ((isRelease || !target.length) && pkg.private) {
        return
    }
    if (!formats) {
        await fs.remove(`${pkgDir}/dist`)
    }
    // 构建的环境
    const env = (pkg.buildOptions && pkg.buildOptions.env) || (devOnly ? 'development' : 'production')
    // 执行rollup打包
    await execa(
        'rollup',
        [
            '-c',
            '--environment',
            [
                `COMMIT:${commit}`,
                `NODE_ENV:${env}`,
                `TARGET:${target}`,
                formats ? `FORMATS:${formats}` : ``,
                buildTypes ? `TYPES:true` : ``,
                prodOnly ? `PROD_ONLY:true` : ``,
                sourceMap ? `SOURCE_MAP:true` : ``
            ]
                .filter(Boolean)
                .join(',')
        ],
        // 子进程将使用父进程的标准输入输出
        {stdio: 'inherit'}
    )
    if (buildTypes && pkg.types) {
        console.log()
        chalk.bold(chalk.yellow(`Rolling up type definition for ${target}...`))
        /**
         * @microsoft/api-extractor 的大致工作流程如下：
         * 1.tsc 将ts源码转换成js之后会生成 一堆的*.d.ts文件
         * 2.api-extractor 读取 这些 d.ts 文件
         *  feat: 1.生成api报告
         *        2.将凌乱的 d.ts 打包并删减
         *        3.生成文档描述模型(xxx.api.json) 可以通过微软提供的api-documenter 进一步转换成 md文档
         */
        const {Extractor, ExtractorConfig} = require('@microsoft/api-extractor');
        const extractorConfigPath = path.resolve(pkgDir, 'api-extractor.json')
        const extractorConfig = ExtractorConfig.loadFileAndPrepare(extractorConfigPath);
        const extractorResult = Extractor.invoke(extractorConfig, {
            localBuild: true,
            showVerboseMessages: true
        })
        // 解析成功
        if (extractorResult.succeeded) {
            // 类型 文件路径
            const typesDir = path.resolve(pkgDir, 'types')
            if (await fs.exists(typesDir)) {
                const dtsPath = path.resolve(pkgDir, pkg.types)
                const existing = await fs.readFile(dtsPath, 'utf-8')
                const typeFiles = await fs.readdir(typesDir)
                const toAdd = await Promise.all(
                    typeFiles.map(file => {
                        return fs.readFile(path.resolve(typesDir, file), 'utf-8')
                    })
                )
                await fs.writeFile(dtsPath, existing + '\n' + toAdd.join('\n'))
            }
            console.log(chalk.bold(chalk.green(`API Extractor completed successfully.`)))
        } else {
            console.error(
                `API Extractor completed with ${extractorResult.errorCount} errors`
                + `and ${extractorResult.warningCount} warnings`
            )
            process.exitCode = 1
        }
    }
    await fs.remove(`${pkgDir}/dist/packages`)
}

/**
 * 并行执行
 * @param maxConcurrency 最大并发
 * @param source 源目标
 * @param iteratorFn 迭代方法
 * @returns {Promise<void>}
 */
async function runParallel(maxConcurrency,source,iteratorFn){
    const ret = []
    const executing = []
    for (const item of source){
        const p = Promise.resolve().then(() => iteratorFn(item,source))
        ret.push(p)
        if (maxConcurrency <= source.length){
            const e = p.then(() => executing.splice(executing.indexOf(e),1))
            executing.push(e)
            // 保证任务数不大于cpu最大内核数
            if (executing.length >= maxConcurrency){
                await Promise.race(executing)
            }
        }
    }
    return Promise.all(ret)
}

/**
 * 检查 文件大小
 * @param filePath 文件路径
 */
function checkFileSize(filePath) {
    const fileSizeStr = (file) => (file.length / 1024).toFixed(2) + 'kb'
    // 文件不存在
    if (!fs.existsSync(filePath)) {
        return
    }
    const file = fs.readFileSync(filePath);
    const minSize = fileSizeStr(file)
    const gzipped = gzipSync(file)
    const gzippedSize = fileSizeStr(gzipped)
    const compressed = compress(file)
    const compressedSize = fileSizeStr(compressed)
    console.log(`${
        chalk.grey(
            chalk.bold(path.basename(filePath))
        )
    } min: ${minSize} / gzip:${gzippedSize} / brotli: ${compressedSize}`)
}






