<script lang="ts" setup>
import type { PaperOrderStatus, PaperOutlineChapter } from '#/api';

import { computed, reactive, ref } from 'vue';

import { confirm, Page } from '@vben/common-ui';

import { message } from 'antdv-next';

import {
  createPaperOrder,
  createPaperOutline,
  getPaperOrderStatus,
  getPaperPrice,
  payPaperOrder,
} from '#/api';

const loading = ref(false);
const paying = ref(false);
const price = ref<null | { points: number; user_points: number }>(null);
const outlineRecordId = ref<number>();
const outline = ref<PaperOutlineChapter[]>([]);
const order = ref<null | { order_sn: string; points: number }>(null);
const status = ref<null | PaperOrderStatus>(null);

const form = reactive({
  about_msg: '',
  codetype: '否',
  language: '否',
  target_word_count: 8000,
  three_level: false,
  title: '',
  wxnum: 25,
  wxquote: '标注',
});

const canPay = computed(() => {
  if (!order.value || !price.value) return false;
  return price.value.user_points >= order.value.points;
});
const currentStep = computed(() => {
  if (status.value?.status === 'completed') return 3;
  if (status.value) return 2;
  if (order.value) return 1;
  return outline.value.length > 0 ? 1 : 0;
});
const statusColorMap: Record<string, string> = {
  completed: 'green',
  created: 'default',
  failed: 'red',
  generating: 'blue',
  paid: 'cyan',
  refunded: 'orange',
};
const statusTextMap: Record<string, string> = {
  completed: '已完成',
  created: '待支付',
  failed: '生成失败',
  generating: '生成中',
  paid: '已扣费',
  refunded: '已退款',
};
const outlineSectionCount = computed(() =>
  outline.value.reduce((total, chapter) => total + chapter.sections.length, 0),
);

async function loadPrice() {
  price.value = await getPaperPrice();
}

async function generateOutline() {
  if (!form.title.trim()) {
    message.warning('请输入论文题目');
    return;
  }
  loading.value = true;
  try {
    await loadPrice();
    const result = await createPaperOutline({
      about_msg: form.about_msg,
      form_params: {
        codetype: form.codetype,
        language: form.language,
        lengthnum: form.target_word_count,
        wxnum: form.wxnum,
        wxquote: form.wxquote,
      },
      three_level: form.three_level,
      title: form.title,
    });
    outlineRecordId.value = result.record_id;
    outline.value = result.outline;
    order.value = null;
    status.value = null;
    message.success('大纲生成成功');
  } finally {
    loading.value = false;
  }
}

async function createOrder() {
  if (!outlineRecordId.value || outline.value.length === 0) return;
  const result = await createPaperOrder({
    outline: outline.value,
    record_id: outlineRecordId.value,
    selftemp: 0,
    service_ids: [],
    template_id: 1,
  });
  order.value = result;
  await loadPrice();
  message.success('订单已创建');
}

async function payOrder() {
  if (!order.value) return;
  if (!canPay.value) {
    message.warning('积分余额不足，请联系管理员充值');
    return;
  }
  try {
    await confirm({
      content: `将扣除 ${order.value.points} 积分并开始生成论文。生成中可以离开页面，稍后在“我的订单”继续查看。`,
      icon: 'question',
      title: '确认积分支付',
    });
  } catch {
    return;
  }
  paying.value = true;
  try {
    await payPaperOrder(order.value.order_sn);
    status.value = await getPaperOrderStatus(order.value.order_sn);
    await loadPrice();
    message.success('扣费成功，论文开始生成');
  } finally {
    paying.value = false;
  }
}

async function refreshStatus() {
  if (!order.value) return;
  status.value = await getPaperOrderStatus(order.value.order_sn);
}

function copyDownloadUrl() {
  if (!status.value?.download_url) return;
  navigator.clipboard?.writeText(status.value.download_url);
  message.success('下载链接已复制');
}

loadPrice();
</script>

<template>
  <Page
    content-class="space-y-4"
    description="从题目到大纲、订单、积分支付和下载结果的完整论文生成流程。"
    title="AI 论文生成"
  >
    <a-row :gutter="[16, 16]" class="mb-4">
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="当前积分" :value="price?.user_points ?? 0" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="生成价格" :value="price?.points ?? 0" suffix="积分" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="章节数量" :value="outline.length" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="小节数量" :value="outlineSectionCount" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :lg="14" :xs="24">
        <a-card title="论文配置">
          <a-form layout="vertical">
            <a-form-item label="论文题目" required>
              <a-input v-model:value="form.title" placeholder="例如：基于深度学习的图像识别技术研究" />
            </a-form-item>
            <a-row :gutter="12">
              <a-col :md="8" :xs="24">
                <a-form-item label="目标字数">
                  <a-input-number v-model:value="form.target_word_count" class="w-full" :min="3000" :step="1000" />
                </a-form-item>
              </a-col>
              <a-col :md="8" :xs="24">
                <a-form-item label="参考文献数量">
                  <a-input-number v-model:value="form.wxnum" class="w-full" :min="5" :max="80" />
                </a-form-item>
              </a-col>
              <a-col :md="8" :xs="24">
                <a-form-item label="代码语言">
                  <a-select v-model:value="form.codetype" :options="['否', 'Python', 'Java', 'JavaScript'].map(value => ({ value }))" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="12">
              <a-col :md="8" :xs="24">
                <a-form-item label="文献标注">
                  <a-select v-model:value="form.wxquote" :options="['标注', '不标注'].map(value => ({ value }))" />
                </a-form-item>
              </a-col>
              <a-col :md="8" :xs="24">
                <a-form-item label="外文文献">
                  <a-select v-model:value="form.language" :options="['否', '是'].map(value => ({ value }))" />
                </a-form-item>
              </a-col>
              <a-col :md="8" :xs="24">
                <a-form-item label="三级大纲">
                  <a-switch v-model:checked="form.three_level" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="写作方向补充">
              <a-textarea v-model:value="form.about_msg" :rows="4" placeholder="可填写研究对象、技术路线、学校格式要求等" />
            </a-form-item>
            <a-space wrap>
              <a-button type="primary" :loading="loading" @click="generateOutline">
                生成免费大纲
              </a-button>
              <a-button @click="loadPrice">刷新积分</a-button>
            </a-space>
          </a-form>
        </a-card>

        <a-card class="mt-4" title="大纲编辑">
          <a-empty
            v-if="outline.length === 0"
            description="填写论文配置后先生成免费大纲"
          />
          <template v-else>
            <div
              v-for="(chapter, chapterIndex) in outline"
              :key="chapterIndex"
              class="mb-4 rounded border border-border p-3"
            >
              <a-input v-model:value="chapter.chapter" class="mb-2" />
              <a-space
                v-for="(section, sectionIndex) in chapter.sections"
                :key="sectionIndex"
                class="mb-2 w-full"
                direction="vertical"
              >
                <a-input v-model:value="section.name" />
                <a-textarea v-model:value="section.abstract" :rows="2" />
              </a-space>
            </div>
          </template>
          <a-button type="primary" :disabled="outline.length === 0" @click="createOrder">
            确认大纲并创建订单
          </a-button>
        </a-card>
      </a-col>

      <a-col :lg="10" :xs="24">
        <a-card title="流程状态">
          <a-steps :current="currentStep" direction="vertical" size="small">
            <a-step title="生成大纲" description="免费生成，可编辑章节和摘要" />
            <a-step title="创建订单" description="确认大纲并锁定配置快照" />
            <a-step title="积分支付" description="扣费后开始生成全文" />
            <a-step title="下载结果" description="完成后复制下载链接" />
          </a-steps>
        </a-card>

        <a-card class="mt-4" title="积分与订单">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="当前积分">
              {{ price?.user_points ?? '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="论文价格">
              {{ price?.points ?? '-' }} 积分
            </a-descriptions-item>
            <a-descriptions-item v-if="order" label="订单号">
              {{ order.order_sn }}
            </a-descriptions-item>
            <a-descriptions-item v-if="status" label="状态">
              <a-tag :color="statusColorMap[status.status] || 'default'">
                {{ statusTextMap[status.status] || status.status }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item v-if="status?.error_msg" label="失败原因">
              {{ status.error_msg }}
            </a-descriptions-item>
          </a-descriptions>
          <a-alert v-if="order && !canPay" class="mt-4" message="积分余额不足，请联系管理员充值" type="warning" show-icon />
          <a-space class="mt-4" wrap>
            <a-button v-if="order && !status" type="primary" :disabled="!canPay" :loading="paying" @click="payOrder">
              积分支付并生成
            </a-button>
            <a-button v-if="order" @click="refreshStatus">
              刷新状态
            </a-button>
            <a-button v-if="status?.download_url" type="primary" @click="copyDownloadUrl">
              复制下载链接
            </a-button>
          </a-space>
        </a-card>

        <a-card class="mt-4" title="填写建议">
          <a-list size="small">
            <a-list-item>题目尽量包含研究对象、方法和场景。</a-list-item>
            <a-list-item>补充说明里可以写学校格式、研究方向和技术路线。</a-list-item>
            <a-list-item>需要代码示例时请选择代码语言，避免生成泛化描述。</a-list-item>
          </a-list>
        </a-card>
      </a-col>
    </a-row>
  </Page>
</template>
