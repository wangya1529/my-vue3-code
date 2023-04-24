export type Namespace = number

export const enum Namespaces {
    HTML
}

export const enum NodeTypes {
    ROOT,
    ELEMENT,
    TEXT,
    COMMENT,
    SIMPLE_EXPRESSION,
    INTERPOLATION,
    ATTRIBUTE,
    DIRECTIVE,
    COMPOUND_EXPRESSION,
    IF,
    IF_BRANCH,
    FOR,
    TEXT_CALL,

    VODE_CALL,
    JS_CALL_EXPRESSION,
    JS_OBJECT_EXPRESSION,
    JS_PROPERTY,
    JS_ARRAY_EXPRESSION,
    JS_FUNCTION_EXPRESSION,
    JS_CONDITIONAL_EXPRESSION,
    JS_CACHE_EXPRESSION,

    // ssr
    JS_BLOCK_STATEMENT,
    JS_TEMPLATE_LITERAL,
    JS_IF_STATEMENT,
    JS_ASSIGNMENT_EXPRESSION,
    JS_SEQUENCE_EXPRESSION,
    JS_RETURN_STATEMENT
}

export const enum ConstantTypes {
    NOT_CONSTANT,
    CAN_SKIP_PATCH,
    CAN_HOIST,
    CAN_STRINGIFY
}


export interface SourceLocation {
    start: Position,
    end: Position,
    source: string
}

export interface Position {
    offset: number,
    line: number,
    column: number
}

export interface Node {
    type: NodeTypes
    loc: SourceLocation
}

export interface TextNode extends Node {
    type: NodeTypes.TEXT
    content: string
}

export interface CommentNode extends Node {
    type: NodeTypes.COMMENT
    context: string
}

export interface AttributeNode extends Node {
    type: NodeTypes.ATTRIBUTE,
    name: string,
    value: TextNode | undefined
}

export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode

export type JSChildNode =
    | ExpressionNode
    | ObjectExpression
    | ArrayExpression
    | CacheExpression
    | FunctionExpression
    | AssignmentExpression
    | SequenceExpression
    | ConditionalExpression

export interface CallExpression extends Node {
    type: NodeTypes.JS_CALL_EXPRESSION
    callee: string | symbol
    arguments: (
        |string
        |symbol
        |JSChildNode
        |TemplateChildNode
        |TemplateChildNode[]
    )[]
}
export type TemplateChildNode =
    | TextNode
    | CommentNode

export interface InterpolationNode extends Node {
    type: NodeTypes.INTERPOLATION
    content: ExpressionNode
}

export interface SimpleExpressionNode extends Node {
    type: NodeTypes.SIMPLE_EXPRESSION
    context: string
    isStatic: boolean
    constType: ConstantTypes
    hoisted?: JSChildNode
    identifiers?: string[]
    isHandlerKey?: boolean
}

export interface CompoundExpressionNode extends Node {
    type: NodeTypes.COMPOUND_EXPRESSION
    children: (
        | SimpleExpressionNode
        | CompoundExpressionNode
        | InterpolationNode
        | TextNode
        | string
        | symbol
        )[]
}

export interface ConditionalExpression extends Node {
    type: NodeTypes.JS_CONDITIONAL_EXPRESSION
    test: JSChildNode
    consequent: JSChildNode
    alternate: JSChildNode
    newline: boolean
}
export interface FunctionExpression extends Node {
    type: NodeTypes.JS_FUNCTION_EXPRESSION
    params: ExpressionNode | string | (ExpressionNode | string) [] | undefined
    returns?: TemplateChildNode | TemplateChildNode[] |JSChildNode
    body?: BlockStatement | IfStatement
    newline: boolean
    isSlot: boolean
    isNonScopedSlot?:boolean
}

// 数组表达式
export interface ArrayExpression extends Node {
    type: NodeTypes.JS_ARRAY_EXPRESSION
    elements: Array<string | Node>
}

export interface Property extends Node {
    type: NodeTypes.JS_PROPERTY
    key: ExpressionNode
    value: JSChildNode
}

export interface ObjectExpression extends Node {
    type: NodeTypes.JS_OBJECT_EXPRESSION
    properties: Array<Property>
}

export interface CacheExpression extends Node {
    type: NodeTypes.JS_CACHE_EXPRESSION
    index: number
    value: JSChildNode
    isVNode: Boolean
}

export interface ReturnStatement extends Node {
    type: NodeTypes.JS_RETURN_STATEMENT
    return: TemplateChildNode | TemplateChildNode[] | JSChildNode
}

export interface IfStatement extends Node {
    type: NodeTypes.JS_IF_STATEMENT
    test: ExpressionNode
    consequent: BlockStatement
    alternate: IfStatement | BlockStatement | ReturnStatement | undefined
}

export interface BlockStatement extends Node {
    type: NodeTypes.JS_BLOCK_STATEMENT
    body: (JSChildNode | IfStatement) []
}

export interface TemplateLiteral extends Node {
    type: NodeTypes.JS_TEMPLATE_LITERAL
    elements: (string | JSChildNode) []
}

export interface AssignmentExpression extends Node {
    type: NodeTypes.JS_ASSIGNMENT_EXPRESSION
    left: SimpleExpressionNode
    right: JSChildNode
}

export interface SequenceExpression extends Node {
    type: NodeTypes.JS_SEQUENCE_EXPRESSION
    expression: JSChildNode[]
}

export interface SlotObjectExpression extends ObjectExpression {
    properties: SlotsObjectProperty[]
}
export interface SlotsObjectProperty extends Property {
    value: SlotFunctionExpression
}
export interface SlotFunctionExpression extends FunctionExpression {
    returns: TemplateChildNode[]
}
export interface ListDynamicSlotIterator extends FunctionExpression {
    returns: DynamicSlotNode
}
export interface DynamicSlotNode extends ObjectExpression {
    properties: [Property,DynamicSlotFuProperty]
}
export interface DynamicSlotFuProperty extends Property {
    value: SlotFunctionExpression
}

export interface DirectiveArgumentNode extends ArrayExpression {
    elements:
    | [string]
    | [string,ExpressionNode]
    | [string,ExpressionNode,ExpressionNode]
    | [string,ExpressionNode,ExpressionNode,ObjectExpression]
}

