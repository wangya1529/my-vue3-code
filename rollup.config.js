import path from "path";
import ts from 'rollup-plugin-typescript2'
import json from '@rollup/plugin-json'

if (!process.env.TARGET) {
    throw new Error('TARGET package must be specified via --environment flag.')
}
const masterVersion = require('./package.json').version
const packagesDir = path.resolve(__dirname, 'packages')
const packageDir = path.resolve(packagesDir, process.env.TARGET)
const resolve = p => path.resolve(packageDir,p)
const pkg = require(resolve('package.json'))
const packageOptions = pkg.buildOptions || {}
const name = packageOptions.filename || path.basename(packageDir)
let hasTSChecked = false
// 输出配置
const outputConfigs = {
    'esm-bundler': {
        file: resolve(`dist/${name}.es-bundler.js`), format: `es`
    }, 'esm-browser': {
        file: resolve(`dist/${name}.esm-browser.js`), format: 'es'
    }, cjs: {
        file: resolve(`dist/${name}.cjs.js`), format: `cjs`
    }, global: {
        file: resolve(`dist/${name}.global.js`), format: `iife`
    }, 'esm-bundler-runtime': {
        file: resolve(`dist/${name}.runtime.esm-bundler.js`), format: `es`
    }, 'esm-browser-runtime': {
        file: resolve(`dist/${name}.runtime.esm-browser.js`), format: 'es'
    }, 'global-runtime': {
        file: resolve(`dist/${name}.runtime.global.js`), format: 'iife'
    }
}
const defaultFormats = ['esm-bundler', 'cjs']
const inlineFormats = process.env.FORMATS && process.env.FORMATS.split(',')
const packageFormats = inlineFormats || packageOptions.formats || defaultFormats
const packageConfigs = process.env.PROD_ONLY ? [] : packageFormats.map(format => createConfig(format, outputConfigs[format]))
// 导出模块
export default packageConfigs

function createConfig(format, output, plugins = []) {
    if (!output) {
        console.log(require('chalk').yellow(`invalid format: "${format}"`))
        process.exit(1)
    }
    // 是否为生产环境构建
    const isProductionBuild =
        process.env.__DEV__ === "false" || /\.prod\.js$/.test(output.file);
    // 全包构建
    const isBundlerESMBuild = /esm-bundler/.test(format)
    const isBrowserESMBuild = /esm-browser/.test(format)
    const isNodeBuild = format === 'cjs'
    const isGlobalBuild = /global/.test(format)
    const isCompatPackage = pkg.name === '@vue/compat'
    const isCompatBuild = !!packageOptions.compat

    output.exports = isCompatBuild ? 'auto' : 'named'
    output.sourcemap = !!process.env.SOURCE_MAP
    output.externalLiveBindings = false
    if (isGlobalBuild) {
        output.name = packageOptions.name
    }
    const shouldEmitDeclarations = pkg.types && process.env.TYPES != null && !hasTSChecked
    const tsPlugin = ts({
        check: process.env.NODE_ENV === 'production' && !hasTSChecked,
        tsconfig: path.resolve(__dirname, 'tsconfig.json'),
        cacheRoot: path.resolve(__dirname, 'node_modules/.rts_cache'),
        tsconfigOverride: {
            compilerOptions: {
               declaration: shouldEmitDeclarations, declarationMap: shouldEmitDeclarations
            }, exclude: ['**/__test__', 'test-dts']
        }
    })
    hasTSChecked = true
    // 入口文件
    let entryFile = /runtime$/.test(format) ? `src/runtime.ts` : `src/index.ts`
    if (isCompatPackage && (isBundlerESMBuild || isBundlerESMBuild)) {
        entryFile = /runtime$/.test(format) ? `src/esm-runtime.ts` : `src/esm-index.ts`
    }
    let external = []
    if (isGlobalBuild || isBundlerESMBuild || isCompatPackage) {
        if (!packageOptions.enableNonBrowserBranches) {
            external = ['source-map', '@babel/parser', 'estree-walker']
        }
    } else {
        external = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {}), ...['path', 'url', 'stream']]
    }
    let cjsIgnores = []
    if (pkg.name === '@vue/compiler-sfc') {
        cjsIgnores = [...Object.keys(require('@vue/consolidate/package.json').devDependencies), 'vm', 'crypto', 'react-dom/server', 'teacup/lib/express', 'arc-templates/dist/es5', 'then-pug', 'then-jade']
    }
    // todo: ??
    const nodePlugins = []
    return {
        input: resolve(entryFile), external, plugins: [json({
            namedExports: false
        }), tsPlugin, ...plugins, ...nodePlugins],
        output,
        treeshake: {
            moduleSideEffects: false
        }
    }
}

