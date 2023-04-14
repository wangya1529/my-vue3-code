
// 获取运行环境目录
const path = require('path')
// node输出美化 chalk
const chalk = require('chalk');
// Execa库 执行本地命令
const execa = require('execa');
// brotli 压缩
const { compress } = require('brotli');
// gzip 压缩
const { gzipSync } = require('zlib');
// 文件操作
const fs = require('fs-extra');
// 获取命令行参数
const args = require('minimist')(process.argv.slice(2))
// 获取 target 也就是_
const targets = args._;
