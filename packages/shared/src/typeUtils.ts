// 并集转换为交集
export type UnionToIntersection<U> = (
    U extends  any ? (k: U) => void : never
) extends (k : infer I) => void
    ? I
    : never

export type LooseRequired<T> = { [P in string & keyof T] : T[P]}
// 判断t类型是否是 any类型 如果是 就返回Y 否则返回N 类型
export type IfAny<T,Y,N> = 0 extends (1 & T) ? Y : N
