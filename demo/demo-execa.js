// 使用execa来调用本地命令
const execa = require("execa");
// 调用 ls -a 命令
execa('ls', ['-l']).then(({stdout}) => {
  console.log(stdout);
})

