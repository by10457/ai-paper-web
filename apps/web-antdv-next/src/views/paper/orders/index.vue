<script setup lang="ts">
import type {
  PaperOrderDetail,
  ThesisMaterialOrderDetail,
  UnifiedOrderDocumentType,
  UnifiedOrderItem,
} from '#/api/ai-paper';

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { message } from 'antdv-next';
import dayjs from 'dayjs';

import {
  getMyPaperOrderDetail,
  getPaperOrderDownloadUrl,
  getThesisMaterialOrder,
  listUnifiedOrders,
} from '#/api/ai-paper';

defineOptions({ name: 'PaperOrders' });

type OrderDetail = PaperOrderDetail | ThesisMaterialOrderDetail;

const orders = ref<UnifiedOrderItem[]>([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<OrderDetail>();
const detailType = ref<UnifiedOrderDocumentType>();
const downloadingOrderSn = ref('');
const copyingOrderSn = ref('');
const tableScrollY = ref(360);
const tableShellRef = ref<HTMLElement>();
let pollingTimer: ReturnType<typeof setInterval> | undefined;
let tableResizeObserver: ResizeObserver | undefined;

const documentTypeMeta: Record<
  UnifiedOrderDocumentType,
  {
    color: string;
    icon: string;
    label: string;
  }
> = {
  thesis: { color: 'blue', icon: 'lucide:file-text', label: '论文' },
  proposal_report: {
    color: 'cyan',
    icon: 'lucide:clipboard-pen-line',
    label: '开题报告',
  },
  literature_review: {
    color: 'purple',
    icon: 'lucide:library-big',
    label: '文献综述',
  },
  task_book: { color: 'orange', icon: 'lucide:list-checks', label: '任务书' },
};

const statusMeta: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待处理' },
  queued: { color: 'processing', label: '排队中' },
  paid: { color: 'processing', label: '排队中' },
  generating: { color: 'processing', label: '生成中' },
  completed: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '生成失败' },
  refunded: { color: 'warning', label: '已退款' },
  cancelled: { color: 'default', label: '已取消' },
};

const columns = [
  { align: 'center' as const, key: 'document_type', title: '类型', width: 120 },
  { align: 'center' as const, key: 'order', title: '订单信息', width: 330 },
  { align: 'center' as const, key: 'status', title: '状态', width: 110 },
  { align: 'center' as const, key: 'paid_points', title: '消耗积分', width: 110 },
  { align: 'center' as const, key: 'created_at', title: '创建时间', width: 170 },
  { align: 'center' as const, key: 'completed_at', title: '完成时间', width: 170 },
  {
    align: 'center' as const,
    fixed: 'right' as const,
    key: 'action',
    title: '操作',
    width: 190,
  },
];

const thesisDetail = computed(() =>
  detailType.value === 'thesis'
    ? (detail.value as PaperOrderDetail | undefined)
    : undefined,
);
const materialDetail = computed(() =>
  detailType.value && detailType.value !== 'thesis'
    ? (detail.value as ThesisMaterialOrderDetail | undefined)
    : undefined,
);
const detailPaidPoints = computed(
  () =>
    thesisDetail.value?.paid_points ?? materialDetail.value?.cost_points ?? 0,
);
const detailProgress = computed(
  () => thesisDetail.value?.task_progress ?? materialDetail.value?.progress ?? 0,
);
const detailStage = computed(
  () => thesisDetail.value?.task_stage ?? materialDetail.value?.stage ?? '-',
);
const detailError = computed(
  () => thesisDetail.value?.error_msg ?? materialDetail.value?.error_message ?? '',
);
const detailTypeMeta = computed(() =>
  detailType.value ? documentTypeMeta[detailType.value] : undefined,
);

function formatDate(value?: null | string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';
}

function getStatusMeta(status: string) {
  return statusMeta[status] ?? { color: 'default', label: status || '未知' };
}

function getDocumentTypeMeta(documentType: UnifiedOrderDocumentType) {
  return documentTypeMeta[documentType];
}

function isProcessing(status: string) {
  return status === 'generating' || status === 'paid';
}

async function fetchOrders(showLoading = true) {
  if (showLoading) loading.value = true;
  try {
    const response = await listUnifiedOrders(currentPage.value, pageSize.value);
    orders.value = response.items;
    total.value = response.total;
  } finally {
    if (showLoading) loading.value = false;
  }
}

function handleTableChange(pagination: { current?: number; pageSize?: number }) {
  currentPage.value = pagination.current ?? 1;
  pageSize.value = pagination.pageSize ?? 10;
  fetchOrders();
}

async function openDetail(order: UnifiedOrderItem) {
  detailVisible.value = true;
  detailLoading.value = true;
  detailType.value = order.document_type;
  detail.value = undefined;
  try {
    detail.value =
      order.document_type === 'thesis'
        ? await getMyPaperOrderDetail(order.order_sn)
        : await getThesisMaterialOrder(order.order_sn);
  } catch {
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

async function resolveDownloadUrl(order: UnifiedOrderItem) {
  if (order.document_type === 'thesis') {
    const result = await getPaperOrderDownloadUrl(order.order_sn);
    return result.download_url;
  }
  const result = await getThesisMaterialOrder(order.order_sn);
  return result.download_url;
}

async function downloadOrder(order: UnifiedOrderItem) {
  downloadingOrderSn.value = order.order_sn;
  try {
    const url = await resolveDownloadUrl(order);
    if (!url) {
      message.warning('文档暂未生成，请稍后刷新');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  } finally {
    downloadingOrderSn.value = '';
  }
}

async function copyDownloadUrl(order: UnifiedOrderItem) {
  copyingOrderSn.value = order.order_sn;
  try {
    const url = await resolveDownloadUrl(order);
    if (!url) {
      message.warning('文档暂未生成，请稍后刷新');
      return;
    }
    await navigator.clipboard.writeText(url);
    message.success('下载链接已复制');
  } finally {
    copyingOrderSn.value = '';
  }
}

function startPolling() {
  pollingTimer = setInterval(() => {
    if (orders.value.some((order) => isProcessing(order.status))) {
      fetchOrders(false);
    }
  }, 5000);
}

async function updateTableScrollHeight() {
  await nextTick();
  const shell = tableShellRef.value;
  if (!shell) return;

  const tableHeader = shell.querySelector<HTMLElement>('.ant-table-thead');
  const pagination = shell.querySelector<HTMLElement>('.ant-pagination');
  const headerHeight = tableHeader?.offsetHeight ?? 55;
  let paginationHeight = 68;
  if (pagination) {
    const paginationStyle = window.getComputedStyle(pagination);
    paginationHeight =
      pagination.offsetHeight +
      Number.parseFloat(paginationStyle.marginTop) +
      Number.parseFloat(paginationStyle.marginBottom);
  }
  tableScrollY.value = Math.max(
    160,
    Math.floor(shell.clientHeight - headerHeight - paginationHeight - 2),
  );
}

onMounted(() => {
  fetchOrders().finally(updateTableScrollHeight);
  if (tableShellRef.value) {
    tableResizeObserver = new ResizeObserver(updateTableScrollHeight);
    tableResizeObserver.observe(tableShellRef.value);
  }
  startPolling();
});

onBeforeUnmount(() => {
  if (pollingTimer) clearInterval(pollingTimer);
  tableResizeObserver?.disconnect();
});
</script>

<template>
  <Page auto-content-height content-class="orders-page">
    <section ref="tableShellRef" class="orders-table-shell">
      <a-table
        :columns="columns"
        :data-source="orders"
        :loading="loading"
        :pagination="{
          current: currentPage,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count: number) => `共 ${count} 条订单`,
        }"
        :row-key="(record: UnifiedOrderItem) => `${record.document_type}-${record.order_sn}`"
        :scroll="{ x: 1200, y: tableScrollY }"
        :style="{ '--orders-table-body-height': `${tableScrollY}px` }"
        class="orders-table"
        @change="handleTableChange"
      >
        <template #emptyText>
          <a-empty description="暂无生成订单" />
        </template>

        <template #bodyCell="{ column, record: order }">
          <template v-if="column.key === 'document_type'">
            <div class="type-cell">
              <a-tag
                :color="getDocumentTypeMeta(order.document_type).color"
                class="type-tag"
              >
                <IconifyIcon
                  :icon="getDocumentTypeMeta(order.document_type).icon"
                  :height="14"
                  :width="14"
                />
              </a-tag>
              <span>{{ getDocumentTypeMeta(order.document_type).label }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'order'">
            <button class="order-title" type="button" @click="openDetail(order)">
              {{ order.title }}
            </button>
            <div class="order-number">{{ order.order_sn }}</div>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusMeta(order.status).color">
              {{ getStatusMeta(order.status).label }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'paid_points'">
            <span class="points-value">{{ order.paid_points }}</span>
            <span v-if="order.refunded_points" class="refund-value">
              已退 {{ order.refunded_points }}
            </span>
          </template>

          <template v-else-if="column.key === 'created_at'">
            {{ formatDate(order.created_at) }}
          </template>

          <template v-else-if="column.key === 'completed_at'">
            {{ formatDate(order.completed_at) }}
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space :size="2" class="action-group">
              <a-button type="link" size="small" @click="openDetail(order)">
                详情
              </a-button>
              <template v-if="order.status === 'completed' && order.has_file">
                <a-button
                  :loading="downloadingOrderSn === order.order_sn"
                  type="link"
                  size="small"
                  @click="downloadOrder(order)"
                >
                  <template #icon>
                    <IconifyIcon icon="lucide:download" :height="14" :width="14" />
                  </template>
                  下载
                </a-button>
                <a-tooltip title="复制下载链接">
                  <a-button
                    :loading="copyingOrderSn === order.order_sn"
                    type="text"
                    size="small"
                    class="copy-button"
                    @click="copyDownloadUrl(order)"
                  >
                    <template #icon>
                      <IconifyIcon icon="lucide:copy" :height="14" :width="14" />
                    </template>
                  </a-button>
                </a-tooltip>
              </template>
            </a-space>
          </template>
        </template>
      </a-table>
    </section>

    <a-drawer
      v-model:open="detailVisible"
      :title="detailTypeMeta ? `${detailTypeMeta.label}订单详情` : '订单详情'"
      :width="620"
    >
      <a-spin :spinning="detailLoading">
        <template v-if="detail">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="订单号">
              {{ detail.order_sn }}
            </a-descriptions-item>
            <a-descriptions-item label="文档类型">
              {{ detailTypeMeta?.label }}
            </a-descriptions-item>
            <a-descriptions-item label="标题">
              {{ detail.title }}
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-tag :color="getStatusMeta(detail.status).color">
                {{ getStatusMeta(detail.status).label }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="消耗积分">
              {{ detailPaidPoints }}
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">
              {{ formatDate(detail.created_at) }}
            </a-descriptions-item>
            <a-descriptions-item label="完成时间">
              {{ formatDate(detail.completed_at) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="isProcessing(detail.status)" label="生成进度">
              <a-progress :percent="detailProgress" size="small" />
              <span class="detail-stage">{{ detailStage }}</span>
            </a-descriptions-item>
          </a-descriptions>

          <a-alert
            v-if="detailError"
            :message="detailError"
            class="detail-alert"
            show-icon
            type="error"
          />

          <section v-if="thesisDetail?.outline_json" class="detail-section">
            <h4>大纲快照</h4>
            <pre>{{ JSON.stringify(thesisDetail.outline_json, null, 2) }}</pre>
          </section>

          <section v-if="materialDetail?.request" class="detail-section">
            <h4>生成配置</h4>
            <pre>{{ JSON.stringify(materialDetail.request, null, 2) }}</pre>
          </section>
        </template>
      </a-spin>
    </a-drawer>
  </Page>
</template>

<style scoped>
:deep(.orders-page) {
  min-height: 0;
  padding: 24px;
  overflow: hidden !important;
  background: #f4f7fa;
}

.orders-table-shell {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e7ebf0;
  border-radius: 14px;
  box-shadow: 0 6px 20px rgb(15 23 42 / 4%);
}

.orders-table :deep(.ant-table) {
  border-top: 0;
}

.orders-table :deep(.ant-table-body) {
  height: var(--orders-table-body-height);
  max-height: var(--orders-table-body-height) !important;
  overflow-y: auto !important;
}

.orders-table :deep(.ant-table-thead > tr > th) {
  padding-top: 15px;
  padding-bottom: 15px;
  font-weight: 600;
  vertical-align: middle;
  color: #344054;
  background: #f8fafc;
  border-bottom-color: #e9edf2;
}

.orders-table :deep(.ant-table-tbody > tr > td) {
  padding-top: 17px;
  padding-bottom: 17px;
  vertical-align: middle;
  color: #475467;
  border-bottom-color: #eef1f4;
}

.orders-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #f8fbff !important;
}

.orders-table :deep(.ant-pagination) {
  margin: 18px;
}

.type-cell {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  color: #344054;
  white-space: nowrap;
}

.type-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  margin: 0;
  border-radius: 6px;
}

.order-title {
  display: block;
  max-width: 100%;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: #1d2939;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.order-title:hover {
  color: #1677ff;
}

.order-number {
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: #98a2b3;
  white-space: nowrap;
}

.points-value,
.refund-value {
  display: block;
}

.points-value {
  color: #344054;
}

.refund-value {
  margin-top: 2px;
  font-size: 12px;
  color: #f79009;
}

.action-group :deep(.ant-btn) {
  padding-inline: 7px;
}

.copy-button {
  color: #667085;
}

.detail-stage {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #667085;
}

.detail-alert,
.detail-section {
  margin-top: 18px;
}

.detail-section h4 {
  margin-bottom: 10px;
  font-weight: 600;
  color: #344054;
}

.detail-section pre {
  max-height: 320px;
  padding: 14px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.65;
  color: #475467;
  white-space: pre-wrap;
  background: #f8fafc;
  border: 1px solid #eaecf0;
  border-radius: 8px;
}

@media (max-width: 768px) {
  :deep(.orders-page) {
    padding: 12px;
  }
}
</style>
