const minimist = require('minimist');
console.log(process.argv.slice(2));
// 这里从终端输入 node demo-minimist.js --name=123 --age=18
console.log(minimist(process.argv.slice(2)));
// 打印结果 { _: [], name: 123, age: 18 }
