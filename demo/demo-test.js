
console.log(null === void 0)
console.log(undefined === void 0)

const map = new Set();
map.add('a',)
map.add('c')
console.log([...map])
const isSymbol = (val)=> typeof val === 'symbol'
const builtInSymbols = new Set(
    Object.getOwnPropertyNames(Symbol)
        .map(key => (Symbol )[key])
.filter(isSymbol)
)
console.log(builtInSymbols)
