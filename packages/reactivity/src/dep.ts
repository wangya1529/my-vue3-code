
export type Dep = TrackedMarker
type TrackedMarker = {
    /**
     * wasTracked
     */
    w: number,
    /**
     * newTracked
     */
    n: number
}

type RefBase<T> = {
    dep?: Dep
    value: T
}
