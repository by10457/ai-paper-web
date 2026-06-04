<script lang="ts" setup>
import type {
  PaperOrderCreateResult,
  PaperOrderStatus,
  PaperOutlineChapter,
  PaperOutlineSection,
  PaperPrice,
} from '#/api';

import { computed, onUnmounted, reactive, ref } from 'vue';

import { confirm, Page } from '@vben/common-ui';

import { message } from 'antdv-next';

import {
  createPaperOrder,
  createPaperOutline,
  getPaperOrderStatus,
  getPaperPrice,
  payPaperOrder,
} from '#/api';

type WorkflowStep = 'config' | 'outline' | 'result';

const outlineLoading = ref(false);
const submitLoading = ref(false);
const statusLoading = ref(false);
const step = ref<WorkflowStep>('config');
const price = ref<null | PaperPrice>(null);
const outlineRecordId = ref<number>();
const outline = ref<PaperOutlineChapter[]>([]);
const outlineAbstract = ref('');
const outlineKeywords = ref('');
const order = ref<null | PaperOrderCreateResult>(null);
const status = ref<null | PaperOrderStatus>(null);

let pollTimer: null | ReturnType<typeof setInterval> = null;

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

const codeTypeOptions = ['否', 'Python', 'Java', 'JavaScript', 'C++'].map(
  (value) => ({ label: value, value }),
);
const yesNoOptions = ['否', '是'].map((value) => ({ label: value, value }));
const quoteOptions = ['标注', '不标注'].map((value) => ({
  label: value,
  value,
}));

const stepIndexMap: Record<WorkflowStep, number> = {
  config: 0,
  outline: 1,
  result: 2,
};

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

const currentStep = computed(() => stepIndexMap[step.value]);
const outlineSectionCount = computed(() =>
  outline.value.reduce((total, chapter) => total + chapter.sections.length, 0),
);
const statusText = computed(() => {
  if (!status.value) return '等待生成';
  return statusTextMap[status.value.status] || status.value.status;
});
const progressPercent = computed(() => {
  if (!status.value) return 20;
  if (status.value.status === 'completed') return 100;
  if (status.value.status === 'failed') return 100;
  if (status.value.status === 'generating') return 75;
  if (status.value.status === 'paid') return 45;
  return 20;
});
const progressStatus = computed(() => {
  if (status.value?.status === 'completed') return 'success';
  if (status.value?.status === 'failed') return 'exception';
  return 'active';
});

function stopPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

function shouldPoll(data?: null | PaperOrderStatus) {
  return Boolean(data && ['generating', 'paid'].includes(data.status));
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    void refreshStatus(true);
  }, 5000);
}

function resetResultState() {
  stopPolling();
  order.value = null;
  status.value = null;
}

function validateConfig() {
  if (!form.title.trim()) {
    message.warning('请输入论文题目');
    return false;
  }
  if (form.title.trim().length < 2) {
    message.warning('论文题目至少 2 个字');
    return false;
  }
  return true;
}

function createBlankSection(): PaperOutlineSection {
  return {
    abstract: '',
    name: '',
  };
}

function addChapter() {
  outline.value.push({
    chapter: `第 ${outline.value.length + 1} 章`,
    sections: [createBlankSection()],
  });
}

function removeChapter(index: number) {
  outline.value.splice(index, 1);
}

function addSection(chapter: PaperOutlineChapter) {
  chapter.sections.push(createBlankSection());
}

function removeSection(chapter: PaperOutlineChapter, sectionIndex: number) {
  chapter.sections.splice(sectionIndex, 1);
}

function validateOutline() {
  if (!outlineRecordId.value || outline.value.length === 0) {
    message.warning('请先生成大纲');
    return false;
  }
  if (outline.value.some((chapter) => !chapter.chapter.trim())) {
    message.warning('章节标题不能为空');
    return false;
  }
  const hasInvalidSection = outline.value.some(
    (chapter) =>
      chapter.sections.length === 0 ||
      chapter.sections.some((section) => !section.name.trim()),
  );
  if (hasInvalidSection) {
    message.warning('每个章节至少保留一个小节，且小节标题不能为空');
    return false;
  }
  return true;
}

async function generateOutline() {
  if (!validateConfig()) return;
  outlineLoading.value = true;
  try {
    const result = await createPaperOutline({
      about_msg: form.about_msg.trim(),
      form_params: {
        codetype: form.codetype,
        language: form.language,
        lengthnum: form.target_word_count,
        wxnum: form.wxnum,
        wxquote: form.wxquote,
      },
      three_level: form.three_level,
      title: form.title.trim(),
    });
    outlineRecordId.value = result.record_id;
    outline.value = result.outline;
    outlineAbstract.value = result.abstract;
    outlineKeywords.value = result.keywords;
    resetResultState();
    step.value = 'outline';
    message.success(`大纲生成成功，共 ${result.outline.length} 个章节`);
  } finally {
    outlineLoading.value = false;
  }
}

async function confirmGeneratePaper() {
  if (!validateOutline() || !outlineRecordId.value) return;
  submitLoading.value = true;
  try {
    price.value = await getPaperPrice();
    if (price.value.user_points < price.value.points) {
      message.warning('积分余额不足，请联系管理员增加积分');
      return;
    }
    try {
      await confirm({
        content: `将扣除 ${price.value.points} 积分并开始生成论文。`,
        icon: 'question',
        title: '确认生成论文',
      });
    } catch {
      return;
    }

    const createdOrder = await createPaperOrder({
      outline: outline.value,
      record_id: outlineRecordId.value,
    });
    order.value = createdOrder;
    await payPaperOrder(createdOrder.order_sn);
    status.value = await getPaperOrderStatus(createdOrder.order_sn);
    step.value = 'result';
    if (shouldPoll(status.value)) startPolling();
    message.success('论文已提交生成，页面将自动刷新结果');
  } finally {
    submitLoading.value = false;
  }
}

async function refreshStatus(silent = false) {
  if (!order.value?.order_sn) {
    if (!silent) message.warning('暂无可查询订单');
    return;
  }
  statusLoading.value = !silent;
  try {
    const result = await getPaperOrderStatus(order.value.order_sn);
    status.value = result;
    if (shouldPoll(result)) {
      if (!pollTimer) startPolling();
    } else {
      stopPolling();
    }
    if (!silent) message.success('状态已刷新');
  } finally {
    statusLoading.value = false;
  }
}

function backToConfig() {
  step.value = 'config';
}

function backToOutline() {
  step.value = 'outline';
}

function copyDownloadUrl() {
  if (!status.value?.download_url) return;
  navigator.clipboard?.writeText(status.value.download_url);
  message.success('下载链接已复制');
}

onUnmounted(stopPolling);
</script>

<template>
  <Page content-class="paper-generate-page">
    <a-card class="generate-card" title="AI 论文生成">
      <a-steps class="workflow-steps" :current="currentStep">
        <a-step title="配置生成大纲" />
        <a-step title="编辑确认大纲" />
        <a-step title="查看生成结果" />
      </a-steps>

      <a-form v-if="step === 'config'" layout="vertical">
        <a-form-item label="论文题目" required>
          <a-input
            v-model:value="form.title"
            size="large"
            placeholder="例如：基于深度学习的图像识别技术研究"
          />
        </a-form-item>

        <a-row :gutter="[16, 0]">
          <a-col :lg="8" :sm="12" :xs="24">
            <a-form-item label="目标字数">
              <a-input-number
                v-model:value="form.target_word_count"
                class="number-input"
                :min="3000"
                :step="1000"
              />
            </a-form-item>
          </a-col>
          <a-col :lg="8" :sm="12" :xs="24">
            <a-form-item label="参考文献数量">
              <a-input-number
                v-model:value="form.wxnum"
                class="number-input"
                :max="80"
                :min="5"
              />
            </a-form-item>
          </a-col>
          <a-col :lg="8" :sm="12" :xs="24">
            <a-form-item label="代码语言">
              <a-select
                v-model:value="form.codetype"
                :options="codeTypeOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :lg="8" :sm="12" :xs="24">
            <a-form-item label="文献标注">
              <a-select
                v-model:value="form.wxquote"
                :options="quoteOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :lg="8" :sm="12" :xs="24">
            <a-form-item label="外文文献">
              <a-select
                v-model:value="form.language"
                :options="yesNoOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :lg="8" :sm="12" :xs="24">
            <a-form-item label="三级大纲">
              <a-switch v-model:checked="form.three_level" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="写作方向补充">
          <a-textarea
            v-model:value="form.about_msg"
            :rows="4"
            placeholder="可填写研究对象、技术路线、学校格式要求等"
          />
        </a-form-item>

        <div class="form-actions">
          <a-button
            size="large"
            type="primary"
            :loading="outlineLoading"
            @click="generateOutline"
          >
            {{ outlineLoading ? 'AI 正在生成大纲...' : '生成免费大纲' }}
          </a-button>
        </div>
      </a-form>

      <div v-else-if="step === 'outline'" class="outline-editor">
        <a-alert
          v-if="outlineAbstract || outlineKeywords"
          class="mb-4"
          show-icon
          type="info"
        >
          <template #message>
            {{ outlineKeywords ? `关键词：${outlineKeywords}` : '大纲摘要' }}
          </template>
          <template #description>
            {{ outlineAbstract || '可继续调整大纲后生成论文。' }}
          </template>
        </a-alert>

        <a-descriptions class="mb-4" :column="2" bordered size="small">
          <a-descriptions-item label="大纲记录">
            {{ outlineRecordId }}
          </a-descriptions-item>
          <a-descriptions-item label="章节/小节">
            {{ outline.length }} / {{ outlineSectionCount }}
          </a-descriptions-item>
        </a-descriptions>

        <div class="outline-list">
          <div
            v-for="(chapter, chapterIndex) in outline"
            :key="chapterIndex"
            class="outline-item"
          >
            <div class="outline-item__header">
              <a-input
                v-model:value="chapter.chapter"
                class="outline-title-input"
                :placeholder="`第 ${chapterIndex + 1} 章标题`"
              />
              <a-space>
                <a-button size="small" @click="addSection(chapter)">
                  添加小节
                </a-button>
                <a-button
                  danger
                  size="small"
                  :disabled="outline.length <= 1"
                  @click="removeChapter(chapterIndex)"
                >
                  删除章节
                </a-button>
              </a-space>
            </div>

            <div
              v-for="(section, sectionIndex) in chapter.sections"
              :key="sectionIndex"
              class="section-item"
            >
              <div class="section-item__title">
                <a-input
                  v-model:value="section.name"
                  :placeholder="`${chapterIndex + 1}.${sectionIndex + 1} 小节标题`"
                />
                <a-button
                  danger
                  size="small"
                  :disabled="chapter.sections.length <= 1"
                  @click="removeSection(chapter, sectionIndex)"
                >
                  删除
                </a-button>
              </div>
              <a-textarea
                v-model:value="section.abstract"
                :rows="2"
                placeholder="本节写作要点"
              />
            </div>
          </div>
        </div>

        <div class="form-actions">
          <a-space wrap>
            <a-button @click="backToConfig">返回修改配置</a-button>
            <a-button @click="addChapter">添加章节</a-button>
            <a-button
              size="large"
              type="primary"
              :loading="submitLoading"
              @click="confirmGeneratePaper"
            >
              确认生成论文
            </a-button>
          </a-space>
        </div>
      </div>

      <div v-else class="result-panel">
        <a-result
          :status="status?.status === 'completed' ? 'success' : status?.status === 'failed' ? 'error' : 'info'"
          :title="statusText"
          :sub-title="order?.order_sn ? `订单号：${order.order_sn}` : undefined"
        >
          <template #extra>
            <a-space wrap>
              <a-button
                :loading="statusLoading"
                @click="() => refreshStatus()"
              >
                刷新状态
              </a-button>
              <a-button
                v-if="status?.download_url"
                type="primary"
                :href="status.download_url"
                target="_blank"
              >
                下载论文
              </a-button>
              <a-button
                v-if="status?.download_url"
                @click="copyDownloadUrl"
              >
                复制链接
              </a-button>
              <a-button
                v-if="status?.status === 'failed'"
                type="primary"
                @click="backToOutline"
              >
                返回大纲
              </a-button>
            </a-space>
          </template>
        </a-result>

        <a-progress
          :percent="progressPercent"
          :show-info="false"
          :status="progressStatus"
        />

        <a-descriptions class="mt-4" :column="1" bordered size="small">
          <a-descriptions-item label="状态">
            <a-tag :color="statusColorMap[status?.status || ''] || 'default'">
              {{ statusText }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="任务 ID">
            {{ status?.task_id || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="扣费积分">
            {{ order?.points || price?.points || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="下载链接">
            <a-typography-text v-if="status?.download_url" copyable>
              {{ status.download_url }}
            </a-typography-text>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="错误信息">
            {{ status?.error_msg || '-' }}
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-card>
  </Page>
</template>

<style scoped>
.paper-generate-page {
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 140px);
  padding: 32px 20px;
}

.generate-card {
  width: min(1120px, 100%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: none;
}

.generate-card :deep(.ant-card-head) {
  min-height: 64px;
  padding-inline: 28px;
}

.generate-card :deep(.ant-card-head-title) {
  font-size: 18px;
  font-weight: 600;
}

.generate-card :deep(.ant-card-body) {
  padding: 28px;
}

.workflow-steps {
  margin-bottom: 28px;
}

.number-input {
  width: 112px;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

.outline-editor,
.result-panel {
  max-width: 960px;
  margin: 0 auto;
}

.outline-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.outline-item {
  padding: 14px;
  background: hsl(var(--muted) / 45%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.outline-item__header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.outline-title-input {
  flex: 1;
}

.section-item {
  padding: 12px;
  margin-top: 10px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.section-item__title {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .paper-generate-page {
    align-items: stretch;
    min-height: auto;
    padding: 12px;
  }

  .number-input {
    width: 100%;
  }

  .generate-card :deep(.ant-card-head),
  .generate-card :deep(.ant-card-body) {
    padding-inline: 16px;
  }

  .form-actions :deep(.ant-btn) {
    width: 100%;
  }

  .outline-item__header {
    flex-direction: column;
    align-items: stretch;
  }

  .section-item__title {
    grid-template-columns: 1fr;
  }
}
</style>
