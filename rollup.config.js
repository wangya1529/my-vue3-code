import path from "path";
import ts from 'rollup-plugin-typescript2'
import json from '@rollup/plugin-json'
import replace from "@rollup/plugin-replace";

if (!process.env.TARGET) {
    throw new Error('TARGET package must be specified via --environment flag.')
}
const masterVersion = require('./package.json').version
const packagesDir = path.resolve(__dirname, 'packages')
const packageDir = path.resolve(packagesDir, process.env.TARGET)
const resolve = p => path.resolve(packageDir, p)
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
if (process.env.NODE_ENV === 'production') {
    packageFormats.forEach(format => {
        if (packageFormats.prod === false) {
            return
        }
        if (format === 'cjs') {
            packageConfigs.push(createProductionConfig(format))
        }
        if (/^(global | esm-browser)(-runtine)?/.test(format)){
            packageConfigs.push(createMinifiedConfig(format))
        }
    })
}
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
                sourceMap: output.sourcemap,
                declaration: shouldEmitDeclarations, declarationMap: shouldEmitDeclarations
            }, exclude: ['**/__test__', 'test-dts']
        }
    })
    hasTSChecked = true
    // 入口文件
    let entryFile = /runtime$/.test(format) ? `src/runtime.ts` : `src/index.ts`
    if (isCompatPackage && (isBrowserESMBuild || isBundlerESMBuild)) {
        entryFile = /runtime$/.test(format) ? `src/esm-runtime.ts` : `src/esm-index.ts`
    }
    let external = []
    if (isGlobalBuild || isBrowserESMBuild || isCompatPackage) {
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
    const nodePlugins =
        (format === 'cjs' && Object.keys(pkg.devDependencies || {}).length) ||
        packageOptions.enableNonBrowserBranches ?
            [
                require("@rollup/plugin-commonjs")({
                    sourceMap: false,
                    ignore: cjsIgnores
                }),
                ...(
                    format === 'cjs' ? []
                        : [require("rollup-plugin-polyfill-node")()]
                ),
                require("@rollup/plugin-node-resolve").nodeResolve()
            ] : []
    return {
        input: resolve(entryFile), external, plugins: [json({
            namedExports: false
        }), tsPlugin,
            createReplacePlugin(
                isProductionBuild,
                isBundlerESMBuild,
                isBrowserESMBuild,
                    // isBrowserBuild?
                (isGlobalBuild || isBrowserESMBuild || isBundlerESMBuild) &&
                !packageOptions.enableNonBrowserBranches,
                isGlobalBuild,
                isNodeBuild,
                isCompatBuild
            ),
            ...plugins, ...nodePlugins],
        output,
        onwarn: (msg,warn) => {
            if (!/Circular/.test(msg)){
                warn(msg)
            }
        },
        treeshake: {
            moduleSideEffects: false
        }
    }
}
function createReplacePlugin(
    isProduction,
    isBundlerESMBuild,
    isBrowserESBuild,
    isBrowserBuild,
    isGlobalBuild,
    isNodeBuild,
    isCompatBuild
) {
    const replacements = {
        __COMMIT__: `"${process.env.COMMIT}"`,
        __VERSION__: `"${masterVersion}"`,
        __DEV__: isBundlerESMBuild
        ?
            `(process.env.NODE_ENV !== 'production')`
            : !isProduction,
        __TEST_: false,
        __BROWSER__: isBrowserBuild,
        __GLOBAL__: isGlobalBuild,
        __ESM_BUNDLER__: isBundlerESMBuild,
        __ESM_BROWSER__:  isBrowserESBuild,
        __NODE_JS: isNodeBuild,
        __SSR__: isNodeBuild || isBundlerESMBuild,
        ...(isBrowserESBuild ?
                {
                    "process.env": "({})",
                    "process.platform": "\"\"",
                    "process.stdout": "null"
                } : {}
),
        __COMPAT__: isCompatBuild,
        __FEATURE_SUSPENSE__: true,
        __FEATURE_OPTIONS_API__: isBundlerESMBuild ? `__VUE_OPTIONS_API__` : true,
        __FEATURE_PROD_DEVTOOLS__: isBundlerESMBuild
        ? '__VUE_PRO_DEVTOOLS__' : false,
        ...(isProduction && isBrowserBuild) ?
            {
                "context.onError(": `/*#__PURE__*/ context.onError(`,
                "emitError(": `/*#__PURE__*/ emitError(`,
                "createCompilerError(": `/*#__PURE__*/ createCompilerError(`,
                "createDOMCompilerError(": `/*#__PURE__*/ createDOMCompilerError(`
            } : {}
    }
    Object.keys(replacements).forEach(key => {
        if (key in process.env){
            replacement[key] = process.env[key]
        }
    })
    return replace({
        // @ts-ignore
        values: replacements,
        preventAssignment: true
    });

}
function createProductionConfig(format) {
    return createConfig(format,{
        file: resolve(`dist/${name}.${format}.prod.js`),
        format: outputConfigs[format].format
    })
}

function createMinifiedConfig(format){
    const terser = require("rollup-plugin-terser")
    return createConfig(
        format,
        {
            file: outputConfigs[format].file.replace(/\.js$/,".prod.js"),
            format: outputConfigs[format].format
        },
        [
            terser({
                module: /^esm/.test(format),
                compress: {
                    ecma: 2015,
                    pure_getters: true
                },
                safari10: true
            })
        ]
    )
}
