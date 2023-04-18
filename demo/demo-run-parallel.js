async function runParallel(maxConcurrency,source,iteratorFn){
    const ret = []
    // 执行队列
    const executing = []
    for (const item of source){
        const p = Promise.resolve().then(() => iteratorFn(item,source))
        ret.push(p)
        if (maxConcurrency <= source.length){
            const e = p.then(() => executing.splice(executing.indexOf(e),1))
            executing.push(e)
            console.log(executing)
            // 保证任务数不大于cpu最大内核数
            if (executing.length >= maxConcurrency){
                console.log('大于最大并发')
                await Promise.race(executing)
                console.log(executing)
            }
        }
    }
    return Promise.all(ret)
}
const source = [1000,2000,1000,2000,1000,3000,4000,2000,4000]
const maxConcurrency = 1
const build = async (item) => {
    console.log(`item: ${item}`)
    await new Promise((resolve,reject) => {
        setTimeout(() => {
            console.log('执行build',item)
            resolve('success')
        },item)
    })
}
runParallel(maxConcurrency,source,build)
