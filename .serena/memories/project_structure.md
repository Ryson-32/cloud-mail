# Cloud Mail 项目结构详解

## 项目根目录结构
```
cloud-mail/
├── mail-vue/              # 前端 Vue 3 项目
├── mail-worker/           # 后端 Workers 项目
├── doc/                   # 文档和演示图片
│   ├── demo/             # 演示截图
│   └── images/           # 文档图片
├── .github/              # GitHub 配置
├── README.md             # 项目说明（中文）
├── README-en.md          # 项目说明（英文）
├── LICENSE               # MIT 许可证
├── OAUTH_SETUP.md        # OAuth 配置文档
├── Linux DO Connect官方文档.md  # Linux.do OAuth 文档
├── test-oauth.html       # OAuth 测试页面
└── package-lock.json     # 根目录依赖锁定

```

## 前端项目结构 (mail-vue)
```
mail-vue/
├── public/               # 静态资源目录
│   ├── tinymce/         # TinyMCE 富文本编辑器资源
│   │   ├── langs/       # 语言包
│   │   ├── plugins/     # 插件
│   │   ├── skins/       # 皮肤主题
│   │   └── themes/      # 主题
│   ├── content.css      # 内容样式
│   └── vite.svg         # 图标
│
├── src/                  # 源代码目录
│   ├── App.vue          # 根组件
│   ├── main.js          # 入口文件
│   ├── style.css        # 全局样式
│   │
│   ├── assets/          # 资源文件
│   │   ├── favicon.svg
│   │   └── fonts/       # 字体文件
│   │
│   ├── axios/           # HTTP 请求配置
│   │   └── index.js
│   │
│   ├── components/      # 公共组件
│   │   ├── email-scroll/     # 邮件滚动组件
│   │   ├── hamburger/        # 汉堡菜单
│   │   ├── loading/          # 加载组件
│   │   ├── send-percent/     # 发送进度
│   │   ├── shadow-html/      # HTML 阴影容器
│   │   └── tiny-editor/      # 富文本编辑器
│   │
│   ├── db/              # IndexedDB 本地数据库
│   │   └── db.js
│   │
│   ├── echarts/         # ECharts 图表配置
│   │   └── index.js
│   │
│   ├── i18n/            # 国际化
│   │   ├── index.js     # i18n 配置
│   │   ├── zh.js        # 中文语言包
│   │   └── en.js        # 英文语言包
│   │
│   ├── init/            # 初始化逻辑
│   │   └── init.js
│   │
│   ├── layout/          # 布局组件
│   │   ├── index.vue    # 主布局
│   │   ├── aside/       # 侧边栏
│   │   ├── header/      # 顶部栏
│   │   ├── main/        # 主内容区
│   │   ├── account/     # 账户管理
│   │   └── write/       # 写邮件
│   │
│   ├── perm/            # 权限指令
│   │   └── perm.js
│   │
│   ├── request/         # API 请求模块
│   │   ├── account.js   # 账户相关
│   │   ├── all-email.js # 所有邮件
│   │   ├── analysis.js  # 数据分析
│   │   ├── email.js     # 邮件操作
│   │   ├── linuxdo.js   # Linux.do 集成
│   │   ├── login.js     # 登录认证
│   │   ├── my.js        # 个人信息
│   │   ├── reg-key.js   # 注册密钥
│   │   ├── role.js      # 角色管理
│   │   ├── setting.js   # 系统设置
│   │   ├── star.js      # 星标邮件
│   │   └── user.js      # 用户管理
│   │
│   ├── router/          # 路由配置
│   │   └── index.js
│   │
│   ├── store/           # Pinia 状态管理
│   │   ├── account.js   # 账户状态
│   │   ├── draft.js     # 草稿状态
│   │   ├── email.js     # 邮件状态
│   │   ├── role.js      # 角色状态
│   │   ├── send.js      # 发送状态
│   │   ├── setting.js   # 设置状态
│   │   ├── ui.js        # UI 状态
│   │   ├── user.js      # 用户状态
│   │   └── writer.js    # 编辑器状态
│   │
│   ├── utils/           # 工具函数
│   │   ├── clipboard-utils.js  # 剪贴板
│   │   ├── convert.js          # 转换工具
│   │   ├── day.js              # 日期处理
│   │   ├── file-utils.js       # 文件处理
│   │   ├── icon-utils.js       # 图标工具
│   │   ├── text.js             # 文本处理
│   │   ├── time-utils.js       # 时间工具
│   │   └── verify-utils.js     # 验证工具
│   │
│   └── views/           # 页面组件
│       ├── 404/         # 404 页面
│       ├── all-email/   # 所有邮件
│       ├── analysis/    # 数据分析
│       ├── content/     # 邮件内容
│       ├── draft/       # 草稿箱
│       ├── email/       # 收件箱
│       ├── linuxdo-setting/  # Linux.do 设置
│       ├── login/       # 登录页
│       ├── oauth/       # OAuth 回调
│       ├── reg-key/     # 注册密钥
│       ├── role/        # 角色管理
│       ├── send/        # 已发送
│       ├── setting/     # 个人设置
│       ├── star/        # 星标邮件
│       ├── sys-setting/ # 系统设置
│       ├── test/        # 测试页面
│       └── user/        # 用户管理
│
├── index.html           # HTML 入口
├── package.json         # 项目配置
├── package-lock.json    # 依赖锁定
└── vite.config.js       # Vite 配置

```

## 后端项目结构 (mail-worker)
```
mail-worker/
├── dist/                # 前端构建输出目录
│
├── src/                 # 源代码目录
│   ├── index.js        # Worker 入口文件
│   │
│   ├── api/            # API 路由处理器
│   │   ├── account-api.js     # 账户 API
│   │   ├── all-email-api.js   # 所有邮件 API
│   │   ├── analysis-api.js    # 数据分析 API
│   │   ├── email-api.js       # 邮件 API
│   │   ├── init-api.js        # 初始化 API
│   │   ├── linuxdo-api.js     # Linux.do API
│   │   ├── login-api.js       # 登录 API
│   │   ├── my-api.js          # 个人信息 API
│   │   ├── oauth-api.js       # OAuth API
│   │   ├── public-api.js      # 公开 API
│   │   ├── r2-api.js          # R2 存储 API
│   │   ├── reg-key-api.js     # 注册密钥 API
│   │   ├── resend-api.js      # Resend API
│   │   ├── role-api.js        # 角色 API
│   │   ├── setting-api.js     # 设置 API
│   │   ├── star-api.js        # 星标 API
│   │   ├── test-api.js        # 测试 API
│   │   └── user-api.js        # 用户 API
│   │
│   ├── const/          # 常量定义
│   │   ├── constant.js        # 通用常量
│   │   ├── entity-const.js    # 实体常量
│   │   └── kv-const.js        # KV 存储常量
│   │
│   ├── dao/            # 数据访问层
│   │   └── analysis-dao.js
│   │
│   ├── email/          # 邮件处理
│   │   └── email.js    # 邮件接收处理
│   │
│   ├── entity/         # 数据实体
│   │   ├── account.js         # 账户实体
│   │   ├── att.js            # 附件实体
│   │   ├── email.js          # 邮件实体
│   │   ├── orm.js            # ORM 配置
│   │   ├── perm.js           # 权限实体
│   │   ├── reg-key.js        # 注册密钥实体
│   │   ├── role-perm.js      # 角色权限关联
│   │   ├── role.js           # 角色实体
│   │   ├── setting.js        # 设置实体
│   │   ├── star.js           # 星标实体
│   │   ├── user.js           # 用户实体
│   │   └── verify-record.js  # 验证记录
│   │
│   ├── error/          # 错误处理
│   │   └── biz-error.js      # 业务错误
│   │
│   ├── hono/           # Hono 框架
│   │   ├── hono.js           # Hono 配置
│   │   └── webs.js           # 路由配置
│   │
│   ├── i18n/           # 国际化
│   │   ├── i18n.js           # i18n 配置
│   │   ├── zh.js             # 中文
│   │   └── en.js             # 英文
│   │
│   ├── init/           # 初始化
│   │   └── init.js           # 数据库初始化
│   │
│   ├── model/          # 数据模型
│   │   └── result.js         # 响应结果模型
│   │
│   ├── security/       # 安全相关
│   │   ├── security.js       # 安全中间件
│   │   └── user-context.js   # 用户上下文
│   │
│   ├── service/        # 业务逻辑层
│   │   ├── account-service.js      # 账户服务
│   │   ├── analysis-service.js     # 分析服务
│   │   ├── att-service.js          # 附件服务
│   │   ├── email-service.js        # 邮件服务
│   │   ├── linuxdo-service.js      # Linux.do 服务
│   │   ├── login-service.js        # 登录服务
│   │   ├── oauth-service.js        # OAuth 服务
│   │   ├── perm-service.js         # 权限服务
│   │   ├── public-service.js       # 公开服务
│   │   ├── r2-service.js           # R2 存储服务
│   │   ├── reg-key-service.js      # 注册密钥服务
│   │   ├── resend-service.js       # Resend 服务
│   │   ├── role-service.js         # 角色服务
│   │   ├── setting-service.js      # 设置服务
│   │   ├── star-service.js         # 星标服务
│   │   ├── turnstile-service.js    # 人机验证服务
│   │   ├── user-service.js         # 用户服务
│   │   └── verify-record-service.js # 验证记录服务
│   │
│   └── utils/          # 工具函数
│       ├── crypto-utils.js   # 加密工具
│       ├── date-uitil.js     # 日期工具
│       ├── email-utils.js    # 邮件工具
│       ├── file-utils.js     # 文件工具
│       ├── jwt-utils.js      # JWT 工具
│       ├── req-utils.js      # 请求工具
│       └── verify-utils.js   # 验证工具
│
├── test/               # 测试文件
│   └── index.spec.js
│
├── package.json        # 项目配置
├── package-lock.json   # 依赖锁定
├── vitest.config.js    # Vitest 测试配置
├── wrangler.toml       # 生产环境配置
├── wrangler-dev.toml   # 开发环境配置
├── wrangler-test.toml  # 测试环境配置
└── wrangler-action.toml # GitHub Action 配置
```

## 关键文件说明

### 配置文件
- `wrangler.toml`: Cloudflare Workers 生产配置
- `wrangler-dev.toml`: 本地开发配置
- `vite.config.js`: Vite 构建配置
- `.env.*`: 环境变量配置

### 入口文件
- `mail-vue/src/main.js`: 前端入口
- `mail-worker/src/index.js`: 后端入口

### 路由配置
- `mail-vue/src/router/index.js`: 前端路由
- `mail-worker/src/hono/webs.js`: 后端路由