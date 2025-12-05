const basicComponentsDocs = `
# Button组件的Props文档
### 1.组件概述
Button组件是按钮展示组件，支持不同类型、形状、尺寸等属性。
### 2.使用场景：在展示统一按钮的场景时使用

### 3. 属性值说明
#### 3.1 type（按钮类型）
1. default:黑边框，白背景色，黑字
2. primary: 无边框，背景色#232934，白字

#### 3.2 shape：形状
1. circle:border-radius: 44px; padding: 0 32px;
2. round：圆形按钮
3. special-shaped：  border-radius: 24px 24px 24px 0;

#### 3.3 size：尺寸
1. large：height: 60px;padding: 0 32px;line-height: 60px;
2. medium: height: 44px;padding: 0 32px;  line-height: 44px;
3. small：height: 30px;padding: 0 16px;    line-height: 16px;
4. mini: height: 24px;padding: 0 12px;line-height: 24px;

#### 3.4 disabled: 是否不可点击，布尔值

------split------

# Font组件的Props文档
### 1. 组件概述
Font组件是一个文本展示组件，用于统一管理文本的样式，包括字体大小、字重、颜色等属性。

### 2. 使用场景
- 需要统一文本样式的场景
- 需要展示不同层级标题的场景
- 需要展示不同重要程度文本的场景
- 需要展示数字文本的场景

### 3. 属性值说明

#### 3.1 字体类型（type）
type FontType = 'h1' | 'h2' | 'h3-medium' | 'h3-regular' | 'b1-medium' | 'b1-regular' | 'b1-light' | 'b2-medium' | 'b2-regular' | 'c1-medium' | 'c1-regular' | 'c3'
- h1：font-size：24px，font-weight:500, line-height: 34px
- h2: 一级、二级标题, font-size：20px，font-weight:500, line-height: 28px
- h3-medium: 三级标题（中等字重）font-size：18px，font-weight:500, line-height: 24px
- h3-regular: 三级标题（常规字重）font-size：18px，font-weight:400, line-height: 24px
- b1-medium: 正文一级（中等）font-size：16px，font-weight:500, line-height: 22px
- b1-regular: 正文一级（常规）font-weight:400 其他与b1-medium相同
- b1-light: 正文一级（细体）font-weight:300 其他与b1-medium相同
- b2-medium, 正文二级（中等）font-size：14px，font-weight:500, line-height: 20px
- b2-regular: 正文二级（常规）font-weight:400， 其他与b2-medium相同
- c1-medium：说明文字一级（中等）font-size：12px，font-weight:500, line-height: 16px
, c1-regular: 说明文字一级（常规）font-weight:400, 其他与c1-medium相同
- c3: 说明文字三级

#### 3.2 字体大小（size）
type FontSize = 'base' | 'xxs' | 'xs' | 's' | 'l' | 'xl' | 'xxl'
从小到大依次为：xxs < xs < s < base < l < xl < xxl

- xxs: font-size: 10px
- xs: font-size: 12px
- s: font-size: 14px
- base: font-size: 16px
- l: font-size: 18px
- xl: font-size: 20px
- xxl: font-size: 24px

#### 3.3 字重（weight）
type FontWeight = 'medium' | 'regular' | 'light'
- medium: 中等字重 font-weight: 500
- regular: 常规字重 font-weight: 400
- light: 细体 font-weight: 300

#### 3.4 字体颜色（color）
type FontColor = 'brand' | 'white' | 'primary' | 'content1' | 'content2' | 'content3' | 'content4' | 'tip' | 'succeed' | 'warning' | 'error'
- brand: 品牌色 color: #E57349
- white: 白色 color: #FFFFFF
- primary: 主要颜色 color: #232934
- content1: color: #232934
- content2: color: #4F545D
- content3: color: #7B7E85
- content4: color: #A8ABB3
- tip: 提示文本颜色 color: #509FFA
- succeed: 成功状态颜色 color: #65CD81
- warning: 警告状态颜色 color: #FFB400
- error: 错误状态颜色 color: #F53C32

### 4. 其他属性
- number: boolean - 是否为数字字体
- block: boolean - 是否为块级元素（默认为false，使用span标签；true时使用p标签）
- className: string - 自定义类名
- prefixCls: string - 类名前缀
- onClick: function - 点击事件处理函数

### 5. 使用示例

// 基础用法
<Font>普通文本</Font>

// 使用预设类型
<Font type="h1">一级标题</Font>
<Font type="b1-medium">正文一级中等字重</Font>

// 自定义大小和字重
<Font size="xl" weight="medium">大号中等字重文本</Font>

// 使用颜色
<Font color="primary">主要文本</Font>
<Font color="error">错误文本</Font>

// 块级元素
<Font block>块级文本</Font>

// 数字字体
<Font number>123456</Font>

// 组合使用
<Font type="h2" color="brand" block>品牌色二级标题</Font>

### 6. 注意事项
1. 当设置了type属性时，size和weight属性将失效
2. 默认字体大小为'base'，默认字重为'regular'
3. 组件支持所有原生span/p标签的属性（通过NativeProps）
4. 组件支持ref转发，可以获取底层DOM元素引用
5. 页面中有文字的部分尽量使用Font组件
6. 假如设计稿中font-size为奇数，可能是设计稿错误，可以使用 -1 的font-size。如设计稿中font-size等于21px,则可设置为20px，即将size设置为 xl .
这个组件设计遵循了DRY原则，通过预设的类型和样式组合，减少了重复的样式代码，同时也提供了足够的灵活性来满足不同的文本展示需求。
------split------
`
export default basicComponentsDocs;