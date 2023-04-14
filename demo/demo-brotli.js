const { compress} = require('brotli');
const { gzipSync } = require('zlib')
const fs = require('fs-extra');
const file = fs.readFileSync('a.text', 'utf-8');
const fileSize = (file.length / 1024).toFixed(2) + 'kb'
console.log('源文件:' + fileSize)
const compressed = compress(file)
const compressedSize = (compressed.length / 1024).toFixed(2) + 'kb'
console.log('brotli：' + compressedSize);
const buffer = gzipSync(file);
console.log('gzip：' + (buffer.length / 1024).toFixed(2) + 'kb')
