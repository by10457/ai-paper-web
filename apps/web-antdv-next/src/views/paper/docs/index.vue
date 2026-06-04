<script lang="ts" setup>
import type { ApiTokenInfo } from '#/api';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { message } from 'antdv-next';

import { getApiTokenInfo, resetApiToken } from '#/api';

const tokenInfo = ref<ApiTokenInfo | null>(null);
const latestToken = ref('');
const tokenLoading = ref(false);

async function fetchTokenInfo() {
  tokenLoading.value = true;
  try {
    tokenInfo.value = await getApiTokenInfo();
  } finally {
    tokenLoading.value = false;
  }
}

async function handleResetToken() {
  if (!window.confirm('重置后旧 Token 会立即失效，确认继续？')) return;
  const res = await resetApiToken();
  latestToken.value = res.token;
  tokenInfo.value = res;
  message.success('调用 Token 已生成，请立即保存明文 Token');
}

function copyToken() {
  if (!latestToken.value) return;
  navigator.clipboard?.writeText(latestToken.value);
  message.success('Token 已复制');
}

onMounted(fetchTokenInfo);
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
                  调用 Token 用于外部系统访问论文生成接口。请在本页生成并妥善保存，页面常规展示只返回脱敏值。
                </a-typography-paragraph>
                <a-descriptions class="mb-4" :column="1" bordered size="small">
                  <a-descriptions-item label="当前 Token">
                    {{ tokenInfo?.masked_token || '未生成' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="调用次数">
                    {{ tokenInfo?.call_count ?? 0 }}
                  </a-descriptions-item>
                  <a-descriptions-item label="创建时间">
                    {{ tokenInfo?.created_at || '-' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="最近使用">
                    {{ tokenInfo?.last_used_at || '-' }}
                  </a-descriptions-item>
                </a-descriptions>
                <a-alert
                  v-if="latestToken"
                  class="mb-4"
                  show-icon
                  type="success"
                  message="新 Token 仅本次展示，请复制后妥善保存"
                >
                  <template #description>
                    <a-typography-text copyable>{{ latestToken }}</a-typography-text>
                  </template>
                </a-alert>
                <a-space class="mb-4">
                  <a-button type="primary" :loading="tokenLoading" @click="handleResetToken">
                    生成/重置 Token
                  </a-button>
                  <a-button :disabled="!latestToken" @click="copyToken">
                    复制明文 Token
                  </a-button>
                  <a-button :loading="tokenLoading" @click="fetchTokenInfo">
                    刷新状态
                  </a-button>
                </a-space>
                <a-typography-paragraph>请求时使用 Bearer Token：</a-typography-paragraph>
                <pre class="rounded bg-muted p-3 text-xs">Authorization: Bearer YOUR_API_TOKEN</pre>
              </a-typography>
            </a-tab-pane>
            <a-tab-pane key="developer" tab="开发对接教程">
              <a-typography>
                <a-typography-title :level="4">1. 准备 Token</a-typography-title>
                <a-typography-paragraph>
                  在“Token 接入”中生成调用 Token，服务端保存到环境变量或密钥管理系统，不要放进前端代码。
                </a-typography-paragraph>
                <pre class="rounded bg-muted p-3 text-xs">AI_PAPER_TOKEN=YOUR_API_TOKEN
AI_PAPER_BASE_URL=https://your-domain.com/api/v1</pre>

                <a-typography-title :level="4">2. 生成大纲</a-typography-title>
                <pre class="rounded bg-muted p-3 text-xs">POST /api/v1/thesis/outlines
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json

{
  "title": "基于深度学习的图像识别技术研究",
  "form_params": {
    "lengthnum": 8000,
    "codetype": "Python",
    "language": "否",
    "wxnum": 25,
    "wxquote": "标注"
  },
  "about_msg": "侧重算法应用与实验分析",
  "three_level": false
}</pre>

                <a-typography-title :level="4">3. 创建并支付订单</a-typography-title>
                <a-typography-paragraph>
                  使用大纲接口返回的 <a-typography-text code>record_id</a-typography-text> 和用户确认后的
                  <a-typography-text code>outline</a-typography-text> 创建订单，再调用积分支付接口启动生成任务。
                </a-typography-paragraph>
                <pre class="rounded bg-muted p-3 text-xs">POST /api/v1/thesis/orders
Authorization: Bearer YOUR_API_TOKEN

{
  "record_id": 123,
  "outline": [{ "chapter": "绪论", "sections": [{ "name": "研究背景", "abstract": "" }] }]
}

POST /api/v1/thesis/orders/pay
Authorization: Bearer YOUR_API_TOKEN

{ "order_sn": "AP202606030001" }</pre>

                <a-typography-title :level="4">4. 查询结果与下载</a-typography-title>
                <pre class="rounded bg-muted p-3 text-xs">GET /api/v1/thesis/orders/status?order_sn=AP202606030001
Authorization: Bearer YOUR_API_TOKEN

GET /api/v1/thesis/orders/download-url?order_sn=AP202606030001
Authorization: Bearer YOUR_API_TOKEN</pre>

                <a-typography-title :level="4">5. Node.js 示例</a-typography-title>
                <pre class="rounded bg-muted p-3 text-xs">const baseUrl = process.env.AI_PAPER_BASE_URL;
const token = process.env.AI_PAPER_TOKEN;

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.message || 'AI Paper API error');
  return json.data;
}</pre>
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
                <a-collapse-panel key="4" header="后台模型配置什么时候生效？">
                  管理员在“大模型配置”中启用对应用途的默认配置后，新提交的大纲、全文、摘要和参考文献关键词生成会优先使用后台配置；未配置时回退到服务端环境变量。
                </a-collapse-panel>
              </a-collapse>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>
    </a-row>
  </Page>
</template>
