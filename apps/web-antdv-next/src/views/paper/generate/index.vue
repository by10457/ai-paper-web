<script lang="ts" setup>
import type {
  GenerateFormState,
  PaperOrderCreateResult,
  PaperOrderStatus,
  PaperOutlineChapter,
  PaperOutlineSection,
  PaperPrice,
  WorkflowStep,
} from './components/types';

import { computed, onUnmounted, reactive, ref } from 'vue';

import { confirm, Page } from '@vben/common-ui';

import { message } from 'antdv-next';

import {
  createPaperOrder,
  createPaperOutline,
  getPaperOrderDownloadUrl,
  getPaperOrderStatus,
  getPaperPrice,
  payPaperOrder,
} from '#/api';

import BasicInfoStep from './components/BasicInfoStep.vue';
import GenerationStatusStep from './components/GenerationStatusStep.vue';
import OutlineEditorStep from './components/OutlineEditorStep.vue';

const OUTLINE_PROGRESS_DURATION = 20_000;
const PAPER_PROGRESS_DURATION = 5 * 60_000;

const outlineLoading = ref(false);
const submitLoading = ref(false);
const statusLoading = ref(false);
const downloadLoading = ref(false);
const copyLoading = ref(false);
const step = ref<WorkflowStep>('config');
const price = ref<null | PaperPrice>(null);
const outlineRecordId = ref<number>();
const outline = ref<PaperOutlineChapter[]>([]);
const outlineAbstract = ref('');
const outlineKeywords = ref('');
const order = ref<null | PaperOrderCreateResult>(null);
const status = ref<null | PaperOrderStatus>(null);
const outlineProgress = ref(0);
const paperProgress = ref(0);

let outlineProgressTimer: null | ReturnType<typeof setInterval> = null;
let paperProgressTimer: null | ReturnType<typeof setInterval> = null;
let pollTimer: null | ReturnType<typeof setInterval> = null;

const form = reactive<GenerateFormState>({
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

const workflowTips = ['大纲规划', '结构编辑', '正文生成'];

const statusTextMap: Record<string, string> = {
  completed: '已完成',
  created: '待支付',
  failed: '生成失败',
  generating: '生成中',
  paid: '等待生成',
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
const canDownloadPaper = computed(
  () => status.value?.status === 'completed' && status.value?.has_file === 1,
);

function clearTimer(timer: null | ReturnType<typeof setInterval>) {
  if (timer) clearInterval(timer);
}

function startProgress(
  progressRef: typeof outlineProgress,
  duration: number,
  timerSetter: (timer: null | ReturnType<typeof setInterval>) => void,
) {
  timerSetter(null);
  progressRef.value = Math.max(progressRef.value, 3);
  const startedAt = Date.now();
  const interval = duration <= OUTLINE_PROGRESS_DURATION ? 600 : 2500;
  const timer = setInterval(() => {
    const elapsedRatio = Math.min((Date.now() - startedAt) / duration, 0.985);
    const timeBased = Math.floor(elapsedRatio * 92) + 4;
    const drift = Math.floor(Math.random() * 4);
    const nextValue = Math.max(
      progressRef.value + (Math.random() > 0.45 ? 1 : 0),
      timeBased + drift,
    );
    progressRef.value = Math.min(99, nextValue);
  }, interval);
  timerSetter(timer);
}

function startOutlineProgress() {
  clearTimer(outlineProgressTimer);
  startProgress(outlineProgress, OUTLINE_PROGRESS_DURATION, (timer) => {
    outlineProgressTimer = timer;
  });
}

function stopOutlineProgress(completed: boolean) {
  clearTimer(outlineProgressTimer);
  outlineProgressTimer = null;
  outlineProgress.value = completed ? 100 : 0;
}

function startPaperProgress() {
  clearTimer(paperProgressTimer);
  startProgress(paperProgress, PAPER_PROGRESS_DURATION, (timer) => {
    paperProgressTimer = timer;
  });
}

function stopPaperProgress(completed: boolean) {
  clearTimer(paperProgressTimer);
  paperProgressTimer = null;
  paperProgress.value = completed ? 100 : Math.max(paperProgress.value, 99);
}

function stopPolling() {
  clearTimer(pollTimer);
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
  clearTimer(paperProgressTimer);
  paperProgressTimer = null;
  paperProgress.value = 0;
  order.value = null;
  status.value = null;
}

function updateForm(patch: Partial<GenerateFormState>) {
  Object.assign(form, patch);
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

function getWorkflowTipClass(index: number) {
  return {
    'workflow-tip--active': currentStep.value === index,
    'workflow-tip--done': currentStep.value > index,
    'workflow-tip--pending': currentStep.value < index,
  };
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
  startOutlineProgress();
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
    stopOutlineProgress(true);
    step.value = 'outline';
    message.success(`大纲生成成功，共 ${result.outline.length} 个章节`);
  } catch (error) {
    stopOutlineProgress(false);
    throw error;
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
    paperProgress.value = 4;
    step.value = 'result';
    if (status.value.status === 'completed') {
      stopPaperProgress(true);
    } else if (status.value.status === 'failed') {
      stopPaperProgress(false);
    } else {
      startPaperProgress();
      if (shouldPoll(status.value)) startPolling();
    }
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
    if (result.status === 'completed') {
      stopPolling();
      stopPaperProgress(true);
    } else if (result.status === 'failed') {
      stopPolling();
      stopPaperProgress(false);
    } else if (shouldPoll(result)) {
      if (!paperProgressTimer) startPaperProgress();
      if (!pollTimer) startPolling();
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

async function resolveDownloadUrl() {
  if (!order.value?.order_sn) return '';
  const result = await getPaperOrderDownloadUrl(order.value.order_sn);
  return result.download_url;
}

async function copyDownloadUrl() {
  copyLoading.value = true;
  try {
    const url = await resolveDownloadUrl();
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    message.success('下载链接已复制');
  } finally {
    copyLoading.value = false;
  }
}

async function downloadPaper() {
  downloadLoading.value = true;
  try {
    const url = await resolveDownloadUrl();
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  } finally {
    downloadLoading.value = false;
  }
}

onUnmounted(() => {
  stopPolling();
  clearTimer(outlineProgressTimer);
  clearTimer(paperProgressTimer);
});
</script>

<template>
  <Page content-class="paper-generate-page">
    <div class="workflow-shell">
      <header class="workflow-header">
        <div class="header-meta">
          <span
            v-for="(item, index) in workflowTips"
            :key="item"
            class="workflow-tip"
            :class="getWorkflowTipClass(index)"
          >
            <i>{{ index + 1 }}</i>
            {{ item }}
          </span>
        </div>
      </header>

      <section class="workflow-board">
        <a-steps class="workflow-steps" :current="currentStep" responsive>
          <a-step title="填写基本信息生成大纲" />
          <a-step title="编辑大纲" />
          <a-step title="论文生成情况" />
        </a-steps>

        <BasicInfoStep
          v-if="step === 'config'"
          :code-type-options="codeTypeOptions"
          :form="form"
          :loading="outlineLoading"
          :progress="outlineProgress"
          :quote-options="quoteOptions"
          :yes-no-options="yesNoOptions"
          @change="updateForm"
          @generate="generateOutline"
        />

        <OutlineEditorStep
          v-else-if="step === 'outline'"
          :abstract-text="outlineAbstract"
          :chapter-count="outline.length"
          :keywords="outlineKeywords"
          :loading="submitLoading"
          :outline="outline"
          :outline-record-id="outlineRecordId"
          :section-count="outlineSectionCount"
          @add-chapter="addChapter"
          @add-section="addSection"
          @back="backToConfig"
          @generate="confirmGeneratePaper"
          @remove-chapter="removeChapter"
          @remove-section="removeSection"
        />

        <GenerationStatusStep
          v-else
          :can-download="canDownloadPaper"
          :copy-loading="copyLoading"
          :download-loading="downloadLoading"
          :order="order"
          :price="price"
          :progress="paperProgress"
          :status="status"
          :status-loading="statusLoading"
          :status-text="statusText"
          @back-to-outline="backToOutline"
          @copy="copyDownloadUrl"
          @download="downloadPaper"
          @refresh="() => refreshStatus()"
        />
      </section>
    </div>
  </Page>
</template>

<style scoped>
.paper-generate-page {
  min-height: calc(100vh - 96px);
  padding: 24px;
  background:
    radial-gradient(circle at 12% 0%, rgb(84 238 214 / 18%), transparent 30%),
    radial-gradient(circle at 88% 8%, rgb(58 132 255 / 12%), transparent 26%),
    linear-gradient(180deg, #f7fcff 0%, #eef8fc 44%, #f7f9fc 100%),
    linear-gradient(90deg, rgb(15 142 176 / 7%) 1px, transparent 1px),
    linear-gradient(0deg, rgb(15 142 176 / 5%) 1px, transparent 1px);
  background-size:
    auto,
    auto,
    auto,
    36px 36px,
    36px 36px;
}

.workflow-shell {
  width: min(1520px, 100%);
  margin: 0 auto;
}

.workflow-header {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 10px 4px 24px;
}

.workflow-header p {
  max-width: 620px;
  margin: 10px 0 0;
  font-size: 15px;
  color: #5e7186;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.workflow-tip {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  color: #50687a;
  background: rgb(255 255 255 / 66%);
  border: 1px solid rgb(174 211 224 / 68%);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgb(28 120 150 / 6%);
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.workflow-tip i {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
  color: #6f8396;
  background: #eef6fa;
  border-radius: 999px;
}

.workflow-tip--active {
  color: #065f73;
  background: linear-gradient(135deg, #e7fffb, #f2f7ff);
  border-color: rgb(20 184 166 / 46%);
  box-shadow:
    0 14px 34px rgb(20 120 150 / 12%),
    inset 0 0 0 1px rgb(255 255 255 / 72%);
}

.workflow-tip--active i {
  color: #fff;
  background: linear-gradient(135deg, #14b8a6, #3678ff);
}

.workflow-tip--done {
  color: #27817e;
  background: rgb(245 253 251 / 78%);
  border-color: rgb(20 184 166 / 24%);
}

.workflow-tip--done i {
  color: #0f766e;
  background: rgb(20 184 166 / 14%);
}

.workflow-tip--pending {
  color: #7a8b9d;
  background: rgb(247 250 252 / 72%);
  opacity: 0.52;
}

.workflow-board {
  min-height: calc(100vh - 210px);
  padding: 26px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 92%), rgb(255 255 255 / 78%)),
    linear-gradient(135deg, rgb(49 216 193 / 10%), transparent 42%, rgb(67 124 255 / 8%));
  border: 1px solid rgb(174 211 224 / 52%);
  border-radius: 8px;
  box-shadow: 0 24px 70px rgb(37 92 126 / 13%);
  backdrop-filter: blur(18px);
}

.workflow-steps {
  max-width: 1180px;
  padding: 18px 24px;
  margin: 0 auto 28px;
  background: rgb(255 255 255 / 86%);
  border: 1px solid rgb(174 211 224 / 60%);
  border-radius: 8px;
  box-shadow: 0 14px 34px rgb(44 118 152 / 8%);
}

.workflow-steps :deep(.ant-steps-item-title) {
  color: #2b4057 !important;
}

.workflow-steps :deep(.ant-steps-item-description) {
  color: #6b7f94 !important;
}

.workflow-steps :deep(.ant-steps-item-tail::after) {
  background-color: rgb(38 171 184 / 22%) !important;
}

.workflow-steps :deep(.ant-steps-item-icon) {
  background: #f8fcff;
  border-color: rgb(38 171 184 / 32%);
}

.workflow-steps :deep(.ant-steps-item-process .ant-steps-item-icon) {
  background: linear-gradient(135deg, #13c2c2, #7c5cff);
  border-color: transparent;
}

.workflow-steps :deep(.ant-steps-item-finish .ant-steps-item-icon) {
  background: rgb(20 184 166 / 12%);
  border-color: rgb(20 184 166 / 62%);
}

@media (max-width: 768px) {
  .paper-generate-page {
    padding: 12px;
  }

  .workflow-header {
    display: grid;
  }

  h1 {
    font-size: 28px;
  }

  .workflow-board {
    padding: 14px;
  }

  .workflow-steps {
    padding: 14px;
  }
}
</style>
