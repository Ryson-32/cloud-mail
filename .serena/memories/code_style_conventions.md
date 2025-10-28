# Cloud Mail 代码风格和规范

## 通用规范

### 文件编码
- 所有文件必须使用 **UTF-8** 编码（无 BOM）
- 严禁使用 GBK/ANSI 等其他编码
- 提交前确保文件编码正确

### 代码格式化 (Prettier 配置)
```json
{
  "printWidth": 140,      // 每行最大字符数
  "singleQuote": true,    // 使用单引号
  "semi": true,           // 语句末尾加分号
  "useTabs": true         // 使用 Tab 缩进
}
```

### 命名规范
- 文件名：kebab-case（如 `email-service.js`）
- 变量/函数：camelCase（如 `getUserEmail`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_EMAIL_SIZE`）
- 类/组件：PascalCase（如 `EmailService`）

## 前端规范 (Vue 3)

### 项目结构
```
mail-vue/
├── src/
│   ├── assets/        # 静态资源
│   ├── components/    # 公共组件
│   ├── views/         # 页面组件
│   ├── router/        # 路由配置
│   ├── store/         # Pinia 状态管理
│   ├── request/       # API 请求封装
│   ├── utils/         # 工具函数
│   ├── i18n/          # 国际化
│   └── layout/        # 布局组件
```

### Vue 组件规范
- 组件文件使用 `.vue` 单文件组件
- 组件名使用 PascalCase
- Props 定义需要指定类型
- 使用 Composition API（setup）
- 组件目录包含 `index.vue` 作为入口

### 状态管理
- 使用 Pinia 进行状态管理
- Store 文件命名：`{domain}.js`
- 使用 `pinia-plugin-persistedstate` 持久化

### 路由规范
- 路由使用懒加载
- 路由名称使用 kebab-case
- meta 中定义页面标题和权限

## 后端规范 (Cloudflare Workers)

### 项目结构
```
mail-worker/
├── src/
│   ├── api/           # API 路由处理
│   ├── service/       # 业务逻辑层
│   ├── dao/           # 数据访问层
│   ├── entity/        # 数据实体定义
│   ├── utils/         # 工具函数
│   ├── const/         # 常量定义
│   ├── hono/          # Hono 框架配置
│   └── email/         # 邮件处理逻辑
```

### 模块导出规范
- 使用 ES6 模块语法
- Service 层统一使用默认导出
```javascript
const serviceObject = {
  method1() {},
  method2() {}
};
export default serviceObject;
```

### API 规范
- RESTful 风格 API 设计
- 统一响应格式：
```javascript
{
  code: 200,      // 状态码
  msg: 'success', // 消息
  data: {}        // 数据
}
```

### 错误处理
- 使用 try-catch 捕获异常
- 返回统一的错误格式
- 记录错误日志

## 数据库规范

### 表命名
- 使用小写字母和下划线
- 如：`user`, `email`, `setting`

### 字段命名
- 使用 snake_case
- 如：`user_id`, `create_time`

### 时间字段
- 统一使用 Unix 时间戳（毫秒）
- 创建时间：`create_time`
- 更新时间：`update_time`

## 注释规范

### 文件头注释
```javascript
/**
 * 文件描述
 * @author 作者
 * @date 创建日期
 */
```

### 函数注释
```javascript
/**
 * 函数功能描述
 * @param {string} param1 - 参数描述
 * @param {number} param2 - 参数描述
 * @returns {Object} 返回值描述
 */
```

### 行内注释
- 复杂逻辑需要添加注释
- 注释位于代码上方或行尾
- 使用中文或英文保持一致

## Git 提交规范

### Commit Message 格式
```
<type>: <subject>

<body>
```

### Type 类型
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构代码
- test: 测试相关
- chore: 构建过程或辅助工具的变动

## 国际化规范
- 支持中文和英文
- 使用 i18n 统一管理文本
- 默认语言：简体中文
- 语言文件位置：`src/i18n/`

## 安全规范
- 敏感信息使用环境变量
- JWT 密钥必须随机生成
- 用户密码使用加密存储
- API 需要鉴权验证
- 防止 SQL 注入和 XSS 攻击