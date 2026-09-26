<script lang="ts" setup>
import type {
  ThesisMaterialDocumentType,
  ThesisMaterialProduct,
  ThesisMaterialTask,
} from '#/api';

import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { message } from 'antdv-next';

import {
  getThesisMaterialProducts,
  getThesisMaterialTask,
  submitThesisMaterialDocument,
} from '#/api';

const products = ref<ThesisMaterialProduct[]>([]);
const userPoints = ref(0);
const submitting = ref(false);
const task = ref<null | ThesisMaterialTask>(null);
let pollTimer: null | ReturnType<typeof setInterval> = null;

const form = reactive({
  direction: '',
  end_date: '',
  chinese_reference_count: 15,
  english_reference_count: 0,
  start_date: '',
  target_word_count: 4000,
  title: '',
  type: 'proposal_report' as ThesisMaterialDocumentType,
});

const currentProduct = computed(() =>
  products.value.find((item) => item.document_type === form.type),
);
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
  userPoints.value = result.user_points;
  applyProductDefaults();
}

function applyProductDefaults() {
  const product = currentProduct.value;
  if (product?.default_word_count)
    form.target_word_count = product.default_word_count;
  if (product?.default_reference_count)
    form.chinese_reference_count = product.default_reference_count;
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
  if (!form.title.trim()) {
    message.warning('请填写文档题目');
    return;
  }
  submitting.value = true;
  try {
    const payload: Record<string, any> = {
      reference_options: {
        chinese_reference_count: form.chinese_reference_count,
        english_reference_count: form.english_reference_count,
      },
      research_context: { direction: form.direction || undefined },
      schedule_options: {
        end_date: form.end_date || undefined,
        start_date: form.start_date || undefined,
      },
      title: form.title.trim(),
    };
    if (form.type !== 'task_book')
      payload.target_word_count = form.target_word_count;
    const submitted = await submitThesisMaterialDocument(form.type, payload);
    task.value = await getThesisMaterialTask(submitted.task_id);
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

onMounted(loadProducts);
onBeforeUnmount(stopPolling);
</script>

<template>
  <Page
    content-class="space-y-4"
    description="生成开题报告、文献综述或毕业设计任务书"
    title="论文材料生成"
  >
    <a-row :gutter="[16, 16]">
      <a-col :lg="16" :xs="24">
        <a-card title="生成配置">
          <a-form layout="vertical">
            <a-form-item label="文档类型" required>
              <a-radio-group
                v-model:value="form.type"
                button-style="solid"
                @change="applyProductDefaults"
              >
                <a-radio-button
                  v-for="item in products"
                  :key="item.document_type"
                  :value="item.document_type"
                >
                  {{ item.name }} · {{ item.points }} 积分
                </a-radio-button>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="题目" required>
              <a-input
                v-model:value="form.title"
                :maxlength="200"
                placeholder="例如：人工智能辅助大学生个性化学习路径研究"
                show-count
              />
            </a-form-item>
            <a-form-item label="研究方向或补充要求">
              <a-textarea
                v-model:value="form.direction"
                :maxlength="1000"
                :rows="3"
                placeholder="可选；说明研究对象、方法、技术路线或学校要求"
              />
            </a-form-item>
            <a-row :gutter="16">
              <a-col v-if="form.type !== 'task_book'" :sm="8" :xs="24">
                <a-form-item label="目标字数">
                  <a-input-number
                    v-model:value="form.target_word_count"
                    :max="20000"
                    :min="2500"
                    class="w-full"
                  />
                </a-form-item>
              </a-col>
              <a-col :sm="8" :xs="24">
                <a-form-item label="中文参考文献（篇）">
                  <a-input-number
                    v-model:value="form.chinese_reference_count"
                    :max="60"
                    :min="0"
                    :precision="0"
                    class="w-full"
                  />
                </a-form-item>
              </a-col>
              <a-col :sm="8" :xs="24">
                <a-form-item label="英文参考文献（篇）">
                  <a-input-number
                    v-model:value="form.english_reference_count"
                    :max="60"
                    :min="0"
                    :precision="0"
                    class="w-full"
                  />
                </a-form-item>
              </a-col>
              <a-col :sm="24" :xs="24">
                <a-form-item label="任务周期">
                  <a-space-compact block>
                    <a-date-picker
                      v-model:value="form.start_date"
                      value-format="YYYY-MM-DD"
                      placeholder="开始"
                    />
                    <a-date-picker
                      v-model:value="form.end_date"
                      value-format="YYYY-MM-DD"
                      placeholder="结束"
                    />
                  </a-space-compact>
                </a-form-item>
              </a-col>
            </a-row>
            <p v-if="form.type !== 'literature_review'">
              封面个人信息将在 Word 中标为“待补充”，下载后自行填写。
            </p>
            <a-button
              block
              size="large"
              type="primary"
              :loading="submitting"
              @click="submit"
            >
              提交生成{{ currentProduct?.name || '文档' }}
            </a-button>
          </a-form>
        </a-card>
      </a-col>
      <a-col :lg="8" :xs="24">
        <a-card title="账户与任务">
          <a-statistic title="当前积分" :value="userPoints" />
          <a-divider />
          <a-empty v-if="!task" description="提交后可在这里查看实时进度" />
          <template v-else>
            <a-typography-title :level="5">{{ task.title }}</a-typography-title>
            <a-tag
              :color="
                task.status === 'completed'
                  ? 'green'
                  : task.status === 'failed'
                    ? 'red'
                    : 'blue'
              "
            >
              {{ statusText }}
            </a-tag>
            <a-progress
              class="mt-4"
              :percent="task.progress"
              :status="task.status === 'failed' ? 'exception' : undefined"
            />
            <p class="mt-3 text-gray-500">{{ task.message || task.stage }}</p>
            <a-button v-if="canDownload" block type="primary" @click="download">
              下载 Word 文档
            </a-button>
          </template>
        </a-card>
      </a-col>
    </a-row>
  </Page>
</template>
