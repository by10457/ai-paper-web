# AI Paper Web

AI Paper Web 是 AI 论文生成系统的前端项目，基于 Vben Admin 单应用裁剪而来。当前只保留 `apps/web-antdv-next`，不启用 Mock 服务，默认对接后端项目：

```text
/home/by/wxy/ai-paper-api
```

前端提供两类入口：

- 用户侧：生成论文大纲、编辑大纲、积分支付、查看生成进度、下载论文、查看订单和 API Token。
- 管理侧：运营总览、用户与积分管理、订单任务处理、模型配置、模型调用日志和审计日志。

## 技术栈

- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia / Vben Store
- Vben Admin
- Ant Design Vue Next (`antdv-next`)
- pnpm workspace / Turbo

## 目录结构

```text
.
├── apps/
│   └── web-antdv-next/              # 当前实际运行的前端应用
│       ├── src/
│       │   ├── api/                 # 后端接口封装
│       │   │   ├── ai-paper.ts      # 用户侧论文、订单、积分、Token 接口
│       │   │   ├── admin.ts         # 管理后台接口
│       │   │   └── request.ts       # 请求实例、Token 注入、错误提示
│       │   ├── router/              # 路由、权限、菜单
│       │   ├── store/               # 应用侧 Pinia store
│       │   ├── views/
│       │   │   ├── paper/           # 用户侧论文生成、订单、文档
│       │   │   └── admin/           # 管理后台页面
│       │   └── preferences.ts       # 默认首页、应用名等偏好覆盖
│       ├── .env                     # 通用应用配置
│       ├── .env.development         # 开发环境配置
│       ├── .env.production          # 生产构建配置
│       └── vite.config.ts           # Vite 配置与开发代理
├── packages/                        # Vben workspace 内部包
├── internal/                        # Vite、TS、lint 等内部配置包
├── scripts/                         # 工程脚本
├── package.json                     # 根脚本
├── pnpm-workspace.yaml              # workspace 声明
└── turbo.json                       # Turbo 任务配置
```

## 环境要求

项目根 `package.json` 中声明：

```text
Node.js: ^20.19.0 || ^22.18.0 || ^24.0.0
pnpm: >=10.0.0
```

建议使用仓库声明的 pnpm 版本：

```text
pnpm@10.33.0
```

## 本地开发

先启动后端：

```bash
cd /home/by/wxy/ai-paper-api
uv run python main.py
```

后端默认监听：

```text
http://localhost:10462
```

再启动前端：

```bash
cd /home/by/wxy/ai-paper-web
pnpm install
pnpm dev
```

前端默认开发地址：

```text
http://localhost:5999
```

开发代理在 `apps/web-antdv-next/vite.config.ts` 中配置：

```text
/api -> http://localhost:10462
```

因此开发环境下前端请求 `/api/v1/...` 会被代理到后端。

## 常用命令

```bash
# 安装依赖
pnpm install

# 启动 web-antdv-next
pnpm dev

# 生产构建
pnpm build

# 预览构建产物
pnpm preview

# 类型检查
pnpm -F @vben/web-antdv-next run typecheck

# 仓库级检查
pnpm check

# 单元测试
pnpm test:unit
```

## 环境变量

主要配置位于 `apps/web-antdv-next/.env*`。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_APP_TITLE` | `AI Paper` | 应用标题。 |
| `VITE_APP_NAMESPACE` | `ai-paper-web` | 本地缓存、store 等命名空间。 |
| `VITE_APP_STORE_SECURE_KEY` | `please-replace-me-with-your-own-key` | store 持久化加密密钥，生产建议替换。 |
| `VITE_PORT` | `5999` | 开发服务器端口。 |
| `VITE_BASE` | `/` | 应用部署基础路径。 |
| `VITE_GLOB_API_URL` | `/api/v1` | API 前缀。开发环境会经 Vite 代理转到后端。 |
| `VITE_DEVTOOLS` | `false` | 是否启用 devtools。 |
| `VITE_ROUTER_HISTORY` | `hash` | 生产环境路由模式。 |
| `VITE_COMPRESS` | `none` | 构建压缩策略，可选 `none`、`brotli`、`gzip`。 |
| `VITE_ARCHIVER` | `true` | 生产构建后是否生成 `dist.zip`。 |

生产环境默认 `VITE_GLOB_API_URL=/api/v1`，适合让后端 FastAPI 同域托管前端静态资源。如果前端单独部署到其他域名，需要同时调整：

- 前端 `VITE_GLOB_API_URL`
- 后端 CORS 配置 `BACKEND_CORS_ORIGINS`

## 与后端接口关系

本项目默认对接 `/home/by/wxy/ai-paper-api` 的 `/api/v1`。

认证流程：

- 登录：`POST /api/v1/auth/login`
- 当前用户：`GET /api/v1/users/userInfo`
- 权限码：由用户 `role` 映射，`admin` 才能访问管理后台路由

用户侧论文接口集中在：

```text
apps/web-antdv-next/src/api/ai-paper.ts
```

主要接口：

- `GET /thesis/price`
- `POST /thesis/outlines`
- `POST /thesis/orders`
- `POST /thesis/orders/pay`
- `GET /thesis/orders/status`
- `GET /thesis/orders/events`
- `GET /thesis/orders/download-url`
- `GET /thesis/orders`
- `GET /users/points/ledger`
- `GET /users/apiToken`
- `POST /users/apiToken/reset`

管理端接口集中在：

```text
apps/web-antdv-next/src/api/admin.ts
```

主要能力：

- 运营总览：`/admin/overview`
- 用户管理：`/admin/users`
- 订单任务：`/admin/orders`
- 模型配置：`/admin/model-configs`
- 模型日志：`/admin/model-call-logs`
- 审计日志：`/admin/audit-logs`

请求实例在：

```text
apps/web-antdv-next/src/api/request.ts
```

这里负责：

- 自动注入 `Authorization: Bearer <token>`
- 注入 `Accept-Language`
- 按后端统一结构 `{ code, message, data }` 解包
- 处理登录失效
- 格式化 FastAPI `422 detail` 错误，避免提示 `[object Object]`

## 页面与路由

业务路由在：

```text
apps/web-antdv-next/src/router/routes/modules/ai-paper.ts
```

用户侧：

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/paper/generate` | AI 论文 | 三步式流程：填写信息、编辑大纲、生成进度。 |
| `/paper/orders` | 我的订单 | 查看订单、状态、下载链接、积分扣费。 |
| `/paper/docs` | 使用文档 | 面向用户和外部系统接入说明。 |

管理侧：

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/admin/overview` | 运营总览 | 用户、订单、积分、模型调用量和健康状态。 |
| `/admin/users` | 用户管理 | 创建用户、重置密码、增加积分、禁用/启用账号。 |
| `/admin/orders` | 订单任务 | 查看全量订单、重试、退款、标记失败、人工补发文件。 |
| `/admin/model-configs` | 模型配置 | 维护大纲、正文、图片和默认模型配置。 |
| `/admin/logs` | 日志审计 | 查看模型调用日志和后台审计日志。 |

默认首页在 `apps/web-antdv-next/src/preferences.ts` 中配置为：

```text
/paper/generate
```

管理员登录后会跳到：

```text
/admin/overview
```

## 论文生成前端流程

`/paper/generate` 页面实现了完整用户流程：

1. 填写论文题目、目标字数、参考文献数量、代码语言、文献标注、外文文献等参数。
2. 调用后端生成大纲，并保存大纲记录。
3. 用户编辑章节和小节。
4. 创建论文订单。
5. 查询价格并确认扣积分。
6. 支付订单。
7. 通过 SSE 接收生成进度，失败时降级轮询。
8. 生成完成后复制或打开下载链接。

相关文件：

```text
apps/web-antdv-next/src/views/paper/generate/index.vue
apps/web-antdv-next/src/views/paper/generate/components/
```

## 管理端用户创建约定

管理端创建用户时不要求填写邮箱。后端会生成内部占位邮箱以满足数据库唯一约束，前端显示为“未填写”。

创建用户时后端会自动生成长期 API Token；用户详情中会显示脱敏后的 Token 信息。

为了避免浏览器把“管理员代填密码”误判为当前站点登录密码，创建用户和重置密码弹窗使用了非登录语义字段名，并避免使用浏览器自动填充。

## 构建与部署

生产构建：

```bash
cd /home/by/wxy/ai-paper-web
pnpm build
```

构建产物：

```text
apps/web-antdv-next/dist
apps/web-antdv-next/dist.zip
```

当前推荐部署方式是将构建产物放到后端项目的 `public/`，由 FastAPI 同域托管：

```text
/home/by/wxy/ai-paper-api/public
```

后端已经支持 Vue Router history fallback 和静态资源缓存控制：

- `index.html`、`_app.config.js` 禁缓存
- hash 后缀 JS/CSS/图片资源长缓存

如果部署到独立 Nginx，需要确保：

- 前端 API 地址能访问后端 `/api/v1`
- 后端 CORS 允许该前端域名
- history/hash 路由策略与 `VITE_ROUTER_HISTORY` 一致

## 开发注意事项

- 不要启用 Mock 服务；当前所有业务接口都走真实后端。
- 新增页面时优先在 `router/routes/modules/ai-paper.ts` 注册。
- 新增业务接口时放在 `src/api/ai-paper.ts` 或 `src/api/admin.ts`，不要散落在页面里。
- 后端统一返回 `{ code, message, data }`，前端 `requestClient` 已统一解包，页面代码通常直接拿 `data`。
- SSE 订单进度使用原生 `fetch` 读取流，需要手动带 `Authorization`。
- 管理路由通过 `meta.authority: ['admin']` 控制，仅管理员可见。
- 修改 `.env` 或 `preferences.ts` 后，如浏览器仍显示旧配置，先清理本地缓存或换无痕窗口确认。

## 常见问题

### 前端请求 404 或连不到后端

确认后端是否已启动：

```bash
curl http://localhost:10462/api/v1/health
```

确认前端开发代理仍指向：

```text
http://localhost:10462
```

### 登录后看不到管理后台

后端用户 `role` 必须是：

```text
admin
```

普通用户只会看到论文生成、我的订单和使用文档。

### 创建用户后邮箱显示“未填写”

这是预期行为。管理端创建用户不要求邮箱，后端会写入内部占位邮箱，前端统一显示为“未填写”。

### 创建用户或重置密码后浏览器提示保存密码

管理端已经尽量规避浏览器密码管理器的自动识别，但浏览器策略是启发式，无法 100% 禁用。若仍出现，可忽略或在浏览器中关闭该站点的保存密码提示。

### 修改接口地址后不生效

检查以下位置：

```text
apps/web-antdv-next/.env.development
apps/web-antdv-next/.env.production
apps/web-antdv-next/public/_app.config.js
```

生产构建会生成运行时配置，部署时要确认服务器上加载的是最新 `_app.config.js`。
