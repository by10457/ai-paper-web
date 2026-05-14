<script lang="ts" setup>
import { Page } from '@vben/common-ui';
</script>

<template>
  <Page
    content-class="space-y-4"
    description="面向用户和外部系统接入方的操作说明、API 入口和异常处理规则。"
    title="使用文档"
  >
    <a-row :gutter="[16, 16]">
      <a-col :lg="8" :xs="24">
        <a-card title="快速流程">
          <a-steps direction="vertical" size="small">
            <a-step title="输入题目" description="填写题目、字数、文献数量和写作方向" />
            <a-step title="生成大纲" description="免费生成，可继续编辑章节、小节、摘要" />
            <a-step title="积分支付" description="确认订单并扣除积分" />
            <a-step title="下载论文" description="生成完成后复制下载链接" />
          </a-steps>
        </a-card>
      </a-col>
      <a-col :lg="16" :xs="24">
        <a-card title="文档中心">
          <a-tabs>
            <a-tab-pane key="workflow" tab="生成流程">
              <a-typography>
                <a-typography-title :level="4">用户流程</a-typography-title>
                <a-typography-paragraph>
                  输入论文题目，完善字数、参考文献、代码语言等配置后生成免费大纲。确认大纲后创建订单，使用积分支付并启动生成。
                </a-typography-paragraph>
                <a-typography-title :level="4">积分规则</a-typography-title>
                <a-typography-paragraph>
                  首版采用积分余额扣费。余额不足时不会扣费，订单不会进入生成中。生成失败后可联系管理员重试、人工补发下载链接或退回积分。
                </a-typography-paragraph>
              </a-typography>
            </a-tab-pane>
            <a-tab-pane key="token" tab="Token 接入">
              <a-alert
                class="mb-4"
                show-icon
                type="warning"
                message="Token 只在生成或重置时展示明文"
                description="请不要把 Token 暴露在公开仓库、浏览器地址栏或前端静态代码里。"
              />
              <a-typography>
                <a-typography-paragraph>
                  调用 Token 用于外部系统访问论文生成接口。请在“积分与 Token”页面生成并妥善保存，页面常规展示只返回脱敏值。
                </a-typography-paragraph>
                <a-typography-paragraph>
                  请求时可以使用 Bearer Token：
                </a-typography-paragraph>
                <pre class="rounded bg-muted p-3 text-xs">Authorization: Bearer YOUR_API_TOKEN</pre>
              </a-typography>
            </a-tab-pane>
            <a-tab-pane key="api" tab="常用接口">
              <a-descriptions :column="1" bordered size="small">
                <a-descriptions-item label="生成大纲">
                  <a-typography-text copyable>/api/v1/thesis/outlines</a-typography-text>
                </a-descriptions-item>
                <a-descriptions-item label="创建订单">
                  <a-typography-text copyable>/api/v1/thesis/orders</a-typography-text>
                </a-descriptions-item>
                <a-descriptions-item label="积分支付">
                  <a-typography-text copyable>/api/v1/thesis/orders/pay</a-typography-text>
                </a-descriptions-item>
                <a-descriptions-item label="查询状态">
                  <a-typography-text copyable>/api/v1/thesis/orders/status</a-typography-text>
                </a-descriptions-item>
                <a-descriptions-item label="下载链接">
                  <a-typography-text copyable>/api/v1/thesis/orders/download-url</a-typography-text>
                </a-descriptions-item>
              </a-descriptions>
            </a-tab-pane>
            <a-tab-pane key="faq" tab="常见问题">
              <a-collapse>
                <a-collapse-panel key="1" header="生成中可以离开页面吗？">
                  可以。论文生成任务在后端运行，回到“我的订单”打开详情即可继续查看状态。
                </a-collapse-panel>
                <a-collapse-panel key="2" header="积分不足会扣费吗？">
                  不会。余额不足时支付接口会失败，订单不会进入生成中，也不会扣除积分。
                </a-collapse-panel>
                <a-collapse-panel key="3" header="生成失败怎么办？">
                  可以把订单号发给管理员，由管理员查看失败原因并执行重试、补发链接或退积分。
                </a-collapse-panel>
              </a-collapse>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>
    </a-row>
  </Page>
</template>
