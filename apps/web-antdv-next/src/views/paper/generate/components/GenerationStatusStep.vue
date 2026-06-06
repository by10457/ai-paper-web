<script lang="ts" setup>
import type {
  PaperOrderCreateResult,
  PaperOrderStatus,
  PaperPrice,
} from './types';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

const props = defineProps<{
  canDownload: boolean;
  copyLoading: boolean;
  downloadLoading: boolean;
  order: null | PaperOrderCreateResult;
  price: null | PaperPrice;
  progress: number;
  status: null | PaperOrderStatus;
  statusLoading: boolean;
  statusMessage: string;
  statusText: string;
}>();

defineEmits<{
  backToOutline: [];
  copy: [];
  download: [];
  refresh: [];
}>();

const resultState = computed(() => {
  if (props.status?.status === 'completed') return 'completed';
  if (props.status?.status === 'failed') return 'failed';
  return 'running';
});

const progressStatus = computed(() => {
  if (resultState.value === 'completed') return 'success';
  if (resultState.value === 'failed') return 'exception';
  return 'active';
});

const statusTone = computed(() => {
  if (resultState.value === 'completed') return 'success';
  if (resultState.value === 'failed') return 'danger';
  return 'processing';
});
</script>

<template>
  <section class="result-layout">
    <div class="status-hero" :class="`status-hero--${statusTone}`">
      <div class="status-icon">
        <IconifyIcon
          :icon="
            resultState === 'completed'
              ? 'lucide:check'
              : resultState === 'failed'
                ? 'lucide:triangle-alert'
                : 'lucide:loader-circle'
          "
        />
      </div>
      <div class="status-copy">
        <div class="section-kicker">STEP 03</div>
        <h2>{{ statusText }}</h2>
        <p v-if="statusMessage">{{ statusMessage }}</p>
        <p v-if="order?.order_sn">订单号：{{ order.order_sn }}</p>
      </div>
      <div class="status-actions">
        <a-button :loading="statusLoading" @click="$emit('refresh')">
          <template #icon>
            <IconifyIcon icon="lucide:refresh-cw" />
          </template>
          刷新状态
        </a-button>
        <a-button
          v-if="canDownload"
          type="primary"
          :loading="downloadLoading"
          @click="$emit('download')"
        >
          <template #icon>
            <IconifyIcon icon="lucide:download" />
          </template>
          下载论文
        </a-button>
        <a-button v-if="canDownload" :loading="copyLoading" @click="$emit('copy')">
          <template #icon>
            <IconifyIcon icon="lucide:copy" />
          </template>
          复制链接
        </a-button>
        <a-button v-if="status?.status === 'failed'" type="primary" @click="$emit('backToOutline')">
          <template #icon>
            <IconifyIcon icon="lucide:arrow-left" />
          </template>
          返回大纲
        </a-button>
      </div>
    </div>

    <div class="progress-panel">
      <div class="progress-copy">
        <div>
          <span>生成进度</span>
          <strong>{{ progress }}%</strong>
        </div>
        <p>
          {{
            resultState === 'completed'
              ? '论文已生成完成'
              : resultState === 'failed'
                ? '生成未完成'
                : statusMessage || '正在生成正文、图表、摘要和文档'
          }}
        </p>
      </div>
      <a-progress :percent="progress" :show-info="false" :status="progressStatus" />
    </div>

    <div class="detail-grid">
      <div class="detail-item">
        <span>状态</span>
        <strong>{{ statusText }}</strong>
      </div>
      <div class="detail-item">
        <span>任务 ID</span>
        <strong>{{ status?.task_id || '-' }}</strong>
      </div>
      <div class="detail-item">
        <span>扣费积分</span>
        <strong>{{ order?.points || price?.points || '-' }}</strong>
      </div>
      <div class="detail-item detail-item--wide">
        <span>错误信息</span>
        <strong>{{ status?.error_msg || '-' }}</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.result-layout {
  display: grid;
  gap: 20px;
}

.status-hero,
.progress-panel,
.detail-grid {
  background: rgb(255 255 255 / 92%);
  border: 1px solid rgb(174 211 224 / 62%);
  border-radius: 8px;
  box-shadow: 0 20px 52px rgb(38 102 138 / 9%);
}

.status-hero {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  min-height: 220px;
  padding: 30px;
  overflow: hidden;
  background:
    radial-gradient(circle at 88% 0%, rgb(91 123 255 / 14%), transparent 34%),
    linear-gradient(135deg, rgb(237 255 251 / 96%), rgb(246 249 255 / 92%)),
    linear-gradient(90deg, rgb(18 159 178 / 9%) 1px, transparent 1px),
    linear-gradient(0deg, rgb(18 159 178 / 6%) 1px, transparent 1px);
  background-size:
    auto,
    auto,
    30px 30px,
    30px 30px;
}

.status-hero--success {
  border-color: rgb(34 197 94 / 32%);
}

.status-hero--danger {
  border-color: rgb(239 68 68 / 30%);
}

.status-icon {
  display: grid;
  place-items: center;
  width: 92px;
  height: 92px;
  font-size: 42px;
  color: #0aa895;
  background: rgb(20 184 166 / 10%);
  border: 1px solid rgb(20 184 166 / 26%);
  border-radius: 50%;
}

.status-hero--success .status-icon {
  color: #16a34a;
  background: rgb(34 197 94 / 12%);
  border-color: rgb(34 197 94 / 34%);
}

.status-hero--danger .status-icon {
  color: #dc2626;
  background: rgb(239 68 68 / 10%);
  border-color: rgb(239 68 68 / 30%);
}

.section-kicker {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #0aa895;
  letter-spacing: 0;
}

h2,
p {
  margin: 0;
}

h2 {
  font-size: 30px;
  font-weight: 700;
  color: #13243a;
}

.status-copy p {
  margin-top: 10px;
  color: #60748a;
}

.status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.progress-panel {
  padding: 22px 24px;
}

.progress-copy {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.progress-copy span,
.detail-item span {
  display: block;
  color: #708497;
}

.progress-copy strong {
  display: block;
  margin-top: 4px;
  font-size: 24px;
  color: #14324a;
}

.progress-copy p {
  color: #60748a;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
}

.detail-item {
  min-width: 0;
  padding: 18px 20px;
  border-right: 1px solid rgb(174 211 224 / 52%);
  border-bottom: 1px solid rgb(174 211 224 / 52%);
}

.detail-item:nth-child(3) {
  border-right: 0;
}

.detail-item--wide {
  grid-column: 1 / -1;
  border-right: 0;
  border-bottom: 0;
}

.detail-item strong {
  display: block;
  margin-top: 8px;
  color: #14324a;
  overflow-wrap: anywhere;
}

@media (max-width: 980px) {
  .status-hero {
    grid-template-columns: 1fr;
  }

  .status-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .status-hero,
  .progress-panel {
    padding: 18px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-item,
  .detail-item:nth-child(3) {
    border-right: 0;
  }

  .progress-copy {
    display: grid;
    gap: 8px;
  }
}
</style>
