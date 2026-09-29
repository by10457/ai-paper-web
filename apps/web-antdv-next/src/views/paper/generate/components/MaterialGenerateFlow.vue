<script lang="ts" setup>
import type { GenerateFormState } from './types';

import type {
  PaperOutlineChapter,
  ThesisMaterialDocumentType,
  ThesisMaterialProduct,
  ThesisMaterialTask,
} from '#/api';

import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { message } from 'antdv-next';

import {
  getThesisMaterialProducts,
  getThesisMaterialTask,
  submitThesisMaterialDocument,
} from '#/api';

const props = defineProps<{
  documentType: ThesisMaterialDocumentType;
  sourceOutline: PaperOutlineChapter[];
  thesisConfig: GenerateFormState;
  title: string;
}>();
const emit = defineEmits<{ configuring: []; submitted: [] }>();

const products = ref<ThesisMaterialProduct[]>([]);
const submitting = ref(false);
const task = ref<null | ThesisMaterialTask>(null);
let pollTimer: null | ReturnType<typeof setInterval> = null;

const form = reactive({
  direction: '',
  target_word_count: 4000,
});

const currentProduct = computed(() =>
  products.value.find((item) => item.document_type === props.documentType),
);
const wordLimits = computed(() =>
  props.documentType === 'proposal_report'
    ? { max: 12_000, min: 2500 }
    : (props.documentType === 'task_book'
      ? { max: 6000, min: 1000 }
      : { max: 20_000, min: 3500 }),
);
const materialCopy = computed(() => {
  const copyMap: Record<
    ThesisMaterialDocumentType,
    {
      description: string;
      directionLabel: string;
      directionPlaceholder: string;
      parameterHint: string;
    }
  > = {
    literature_review: {
      description: '围绕研究主题梳理代表性成果、主要观点和研究趋势。',
      directionLabel: '综述范围与关注重点',
      directionPlaceholder:
        '可选；说明文献范围、时间跨度、研究方法或重点关注的问题',
      parameterHint: '只需设置本文档篇幅；文献配置和研究范围继承已确认的大纲。',
    },
    proposal_report: {
      description: '形成研究背景、目标、内容、方法和实施计划。',
      directionLabel: '研究方向与补充要求',
      directionPlaceholder:
        '可选；说明研究对象、研究方法、技术路线或学校格式要求',
      parameterHint: '只需设置本文档篇幅；文献配置和研究范围继承已确认的大纲。',
    },
    task_book: {
      description: '明确课题目标、主要任务、成果要求和阶段安排。',
      directionLabel: '任务要求与预期成果',
      directionPlaceholder:
        '可选；说明课题范围、交付成果、技术要求或学校任务书规范',
      parameterHint: '只需设置本文档篇幅；文献配置和研究范围继承已确认的大纲。',
    },
  };
  return copyMap[props.documentType];
});
const canDownload = computed(
  () => task.value?.status === 'completed' && Boolean(task.value.download_url),
);
const statusText = computed(() => {
  const map: Record<string, string> = {
    completed: '已完成',
    failed: '生成失败',
    generating: '生成中',
    queued: '排队中',
  };
  return task.value ? map[task.value.status] || task.value.status : '';
});

async function loadProducts() {
  const result = await getThesisMaterialProducts();
  products.value = result.products;
  const product = currentProduct.value;
  if (product?.default_word_count) {
    form.target_word_count = product.default_word_count;
  }
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

async function refreshTask() {
  if (!task.value?.task_id) return;
  task.value = await getThesisMaterialTask(task.value.task_id);
  if (['completed', 'failed'].includes(task.value.status)) {
    stopPolling();
    await loadProducts();
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => void refreshTask(), 3000);
}

async function submit() {
  if (!form.target_word_count || form.target_word_count < wordLimits.value.min || form.target_word_count > wordLimits.value.max) {
    message.warning('请填写有效的文档目标字数');
    return;
  }
  submitting.value = true;
  try {
    const payload: Record<string, any> = {
      target_word_count: form.target_word_count,
      research_context: { direction: form.direction || undefined },
      source_outline: props.sourceOutline,
      thesis_config: {
        chinese_reference_count: props.thesisConfig.chinese_reference_count,
        english_reference_count: props.thesisConfig.english_reference_count,
        aboutmsg: props.thesisConfig.about_msg,
        target_word_count: props.thesisConfig.target_word_count,
      },
      title: props.title.trim(),
    };
    const submitted = await submitThesisMaterialDocument(
      props.documentType,
      payload,
    );
    task.value = await getThesisMaterialTask(submitted.task_id);
    emit('submitted');
    message.success('任务已提交，系统正在生成文档');
    startPolling();
  } finally {
    submitting.value = false;
  }
}

function download() {
  if (task.value?.download_url) {
    window.open(task.value.download_url, '_blank', 'noopener,noreferrer');
  }
}

function resetTask() {
  stopPolling();
  task.value = null;
  emit('configuring');
}

onMounted(loadProducts);
onBeforeUnmount(stopPolling);
</script>

<template>
  <div class="material-flow">
    <a-card class="material-card" variant="borderless">
      <template #title>
        <div class="material-card-heading">
          <span class="material-heading-icon">
            <IconifyIcon icon="lucide:file-pen-line" />
          </span>
          <div>
            <strong>生成{{ currentProduct?.name || '论文材料' }}</strong>
            <small>{{
                materialCopy.description
              }}
              已确认的大纲将用于生成本文档。</small>
          </div>
        </div>
      </template>

      <div v-if="task" class="material-status">
        <span
          class="material-status-icon"
          :class="{
            'material-status-icon--completed': task.status === 'completed',
            'material-status-icon--failed': task.status === 'failed',
          }"
        >
          <IconifyIcon
            :icon="
              task.status === 'completed'
                ? 'lucide:circle-check-big'
                : task.status === 'failed'
                  ? 'lucide:circle-x'
                  : 'lucide:loader-circle'
            "
          />
        </span>
        <h2>{{ statusText }}</h2>
        <p>{{ task.message || task.stage || '系统正在处理生成任务' }}</p>
        <a-progress
          class="material-status-progress"
          :percent="task.progress"
          :status="task.status === 'failed' ? 'exception' : undefined"
        />
        <a-space>
          <a-button
            v-if="canDownload"
            size="large"
            type="primary"
            @click="download"
          >
            下载 Word 文档
          </a-button>
          <a-button
            v-if="['completed', 'failed'].includes(task.status)"
            size="large"
            @click="resetTask"
          >
            {{ task.status === 'failed' ? '返回修改配置' : '再生成一份' }}
          </a-button>
        </a-space>
      </div>

      <a-form v-else layout="vertical">
        <section class="material-form-section">
          <div class="material-section-heading">
            <span>1</span>
            <div>
              <strong>{{ materialCopy.directionLabel }}</strong>
              <small>不填写时，系统将沿用已确认大纲和大纲阶段的补充要求。</small>
            </div>
          </div>
          <a-form-item>
            <a-textarea
              v-model:value="form.direction"
              :maxlength="1000"
              :rows="4"
              :placeholder="materialCopy.directionPlaceholder"
              show-count
            />
          </a-form-item>
        </section>

        <section class="material-form-section">
          <div class="material-section-heading">
            <span>2</span>
            <div>
              <strong>文档参数</strong>
              <small>{{ materialCopy.parameterHint }}</small>
            </div>
          </div>
          <a-row :gutter="20">
            <a-col :md="8" :xs="24">
              <a-form-item label="目标字数">
                <a-input-number
                  v-model:value="form.target_word_count"
                  :max="wordLimits.max"
                  :min="wordLimits.min"
                  class="w-full"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <p class="material-profile-hint">
            已继承大纲：中文参考文献 {{ thesisConfig.chinese_reference_count }} 篇，
            英文参考文献 {{ thesisConfig.english_reference_count }} 篇。
            如需调整，请返回大纲配置。
            <template v-if="documentType !== 'literature_review'">
              进度计划按相对周次生成，无需填写具体日期。
            </template>
          </p>
        </section>

        <p
          v-if="documentType !== 'literature_review'"
          class="material-profile-hint"
        >
          封面个人信息将在 Word 中标为“待补充”，下载后自行填写。
        </p>

        <div class="material-submit-row">
          <span v-if="currentProduct">
            本次生成预计消耗 {{ currentProduct.points }} 积分
          </span>
          <a-button
            size="large"
            type="primary"
            :loading="submitting"
            @click="submit"
          >
            <template #icon>
              <IconifyIcon icon="lucide:sparkles" />
            </template>
            开始生成{{ currentProduct?.name || '文档' }}
          </a-button>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<style scoped>
.material-flow {
  width: min(980px, 100%);
  margin: 0 auto;
}

.material-card {
  overflow: hidden;
  background: rgb(255 255 255 / 94%);
  border: 1px solid rgb(174 211 224 / 66%);
  border-radius: 10px;
  box-shadow: 0 18px 48px rgb(38 102 138 / 9%);
}

.material-card :deep(.ant-card-head) {
  min-height: 82px;
  padding: 0 30px;
  background: linear-gradient(135deg, rgb(239 255 251 / 76%), #f8fbff);
  border-bottom-color: rgb(174 211 224 / 52%);
}

.material-card :deep(.ant-card-body) {
  padding: 30px;
}

.material-card-heading {
  display: flex;
  gap: 14px;
  align-items: center;
}

.material-card-heading > div,
.material-section-heading > div {
  display: grid;
  gap: 3px;
}

.material-card-heading strong {
  font-size: 18px;
  color: #193247;
}

.material-card-heading small,
.material-section-heading small {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: #74889c;
}

.material-heading-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  font-size: 20px;
  color: #0f8ca2;
  background: rgb(20 184 166 / 12%);
  border-radius: 10px;
}

.material-form-section + .material-form-section {
  padding-top: 26px;
  margin-top: 10px;
  border-top: 1px solid #edf2f5;
}

.material-section-heading {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.material-section-heading > span {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  font-size: 13px;
  font-weight: 700;
  color: #087f8c;
  background: rgb(20 184 166 / 12%);
  border-radius: 999px;
}

.material-section-heading strong {
  color: #20364b;
}

.material-form-section :deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}

.material-profile-hint {
  margin: 22px 0 0;
  font-size: 13px;
  color: #74889c;
}

.material-submit-row {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding-top: 26px;
  margin-top: 20px;
  border-top: 1px solid #edf2f5;
}

.material-submit-row > span {
  font-size: 13px;
  color: #74889c;
}

.material-submit-row :deep(.ant-btn) {
  min-width: 240px;
}

.material-status {
  display: grid;
  place-items: center;
  min-height: 420px;
  padding: 40px;
  text-align: center;
}

.material-status-icon {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  font-size: 34px;
  color: #1677ff;
  background: rgb(22 119 255 / 10%);
  border-radius: 999px;
}

.material-status-icon--completed {
  color: #0f9f6e;
  background: rgb(15 159 110 / 10%);
}

.material-status-icon--failed {
  color: #e24b4b;
  background: rgb(226 75 75 / 10%);
}

.material-status h2 {
  margin: 18px 0 0;
  color: #193247;
}

.material-status p {
  margin: 8px 0 22px;
  color: #74889c;
}

.material-status-progress {
  width: min(520px, 100%);
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .material-card :deep(.ant-card-head),
  .material-card :deep(.ant-card-body) {
    padding-right: 20px;
    padding-left: 20px;
  }

  .material-submit-row {
    flex-direction: column;
    align-items: stretch;
  }

  .material-submit-row :deep(.ant-btn) {
    width: 100%;
  }
}
</style>
