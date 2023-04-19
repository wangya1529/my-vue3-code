/**
 * 插槽标识
 */
export const enum SlopFlags  {
    /**
     * 稳定的Fragment，STABLE，
     * 仅引用插槽道具或上下文状态的稳定插槽。
     * 插槽可以完全捕获自己的依赖项，因此在传递时，父级不需要强制子级进行更新
     */
    STABLE = 1,
    /**
     * 插槽引用范围变量（v-for或外部插槽属性）
     * 或具有条件结构（v-if、v-for）的插槽。父级需要强制子级更新，因为插槽没有完全捕获其依赖项
     */
    DYNAMIC = 2,
    /**
     * 如果模板插槽中传递的内容是<slot>，这就是FORWARDED。意思是正在转发<slot>到子组件中。
     * 父项是否需要更新子项取决于父项本身收到的插槽类型。
     * 必须在运行时（在“normalizeChildren”中）创建子节点时对其进行优化
     */
    FORWARDED = 3
}
export const slotFlagsText = {
    [SlopFlags.STABLE]: 'STABLE',
    [SlopFlags.DYNAMIC]: 'DYNAMIC',
    [SlopFlags.FORWARDED] : 'FORWARDED'
}
