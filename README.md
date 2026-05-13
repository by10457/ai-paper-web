# AI Paper Web

基于 Vben Admin 的 AI 论文系统前端项目，仅保留 `web-antdv-next` 应用，不启用 Mock 服务。

## 技术栈

- Vue 3
- Vite
- TypeScript
- Vben Admin
- Ant Design Vue Next
- pnpm workspace

## 开发

```bash
pnpm install
pnpm dev
```

默认开发端口在 `apps/web-antdv-next/.env.development` 中配置为 `5999`。

## 构建

```bash
pnpm build
```

构建产物位于：

```text
apps/web-antdv-next/dist
```

## 后端接口

当前接口前缀配置为：

```text
/api/v1
```

后续可在 `apps/web-antdv-next/.env.development` 和 `apps/web-antdv-next/.env.production` 中调整 `VITE_GLOB_API_URL`。
