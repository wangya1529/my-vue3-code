export const enum PatchFlags {
    TEXT = 0, // 动态文本节点
    CLASS = 1 << 1, // 动态Class
    STYLE = 1 << 2, // 动态style
    PROPS = 1 << 3, // 动态属性 不包含class style
    FULL_PORTS = 1 << 4, // 动态key属性 当key改变的时候,需要完整的diff
    HYDRATE_EVENTS = 1 << 5, // 具有监听事件的节点
    STABLE_FRAGMENT = 1 << 6, // 一个不会改变子节点顺序的fragment
    KEYED_FRAGMENT = 1 << 7, //带有key的 fragment
    UNKEYED_FRAGMENT = 1 << 8, // 没有key的fragment
    NEED_PATCH = 1 << 9, // 一个子节点 只会进行非props比较
    DYNAMIC_SLOTS = 1 << 10, // 动态插槽
    DEV_ROOT_FRAGMENT = 1 << 11, // 表示因为用户在模版的根节点放置注释而创建的片段 仅仅是开发的标志,因为注释在生产中剥离
    // 静态节点 内容永远不会改变 不需要进行diff
    HOISTED = -1,
    // 用来表示一个节点diff应该结束
    BAIL = -2
}
export const PatchFlagNames = {
    [PatchFlags.TEXT] : 'TEXT',
    [PatchFlags.CLASS] : 'CLASS',
    [PatchFlags.STYLE]: 'STYLE',
    [PatchFlags.PROPS]: 'PROPS',
    [PatchFlags.FULL_PORTS]: 'FULL_PROPS',
    [PatchFlags.HYDRATE_EVENTS]: 'HYDRATE_EVENT',
    [PatchFlags.STABLE_FRAGMENT]: 'STABLE_FRAGMENT',
    [PatchFlags.KEYED_FRAGMENT]: 'KEYED_FRAGMENT',
    [PatchFlags.UNKEYED_FRAGMENT]: 'UNKEYED_FRAGMENT',
    [PatchFlags.NEED_PATCH]: 'NEED_PATCH',
    [PatchFlags.DYNAMIC_SLOTS]: 'DYNAMIC_SLOTS',
    [PatchFlags.DEV_ROOT_FRAGMENT]: 'DEV_ROOT_FRAGMENT',
    [PatchFlags.HOISTED]: 'HOISTED',
    [PatchFlags.BAIL]: 'BAIL'

}
