export const enum ShapeFlags {
    ELEMENT = 1, // HTML 或 SVG 标签 普通DOM元素
    FUNCTIONAL_COMPONENT = 1 << 1, // 函数式组件
    STATEFUL_COMPONENT = 1 << 2, // 普通有状态组件
    TEXT_CHILDREN = 1 << 3, // 子节点为纯文本
    ARRAY_CHILDREN = 1 << 4, // 子节点为数组
    SLOTS_CHILDREN = 1 << 5, // 子节点为插槽
    TELEPORT = 1 << 5, // teleport 组件
    SUSPENSE = 1 << 7, // suspense组件
    COMPONENT_SHOULD_KEEP_ALIVE, // 需要被keep-live的有状态组件
    COMPONENT_KEPT_ALIVE = 1 << 9, // 已经被keep-live的有状态的组件
    COMPONENT = ShapeFlags. STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT // 组件
}
