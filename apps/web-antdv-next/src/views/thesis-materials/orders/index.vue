<script lang="ts" setup>
import type { ThesisMaterialOrderDetail, ThesisMaterialOrderItem } from '#/api';

import { onBeforeUnmount, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import dayjs from 'dayjs';

import { getThesisMaterialOrder, listThesisMaterialOrders } from '#/api';

const orders = ref<ThesisMaterialOrderItem[]>([]);
const detail = ref<null | ThesisMaterialOrderDetail>(null);
const detailOpen = ref(false);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
let pollTimer: null | ReturnType<typeof setInterval> = null;

const typeText: Record<string, string> = {
  literature_review: '文献综述',
  proposal_report: '开题报告',
  task_book: '任务书',
};
const statusText: Record<string, string> = {
  completed: '已完成',
  failed: '生成失败',
  generating: '生成中',
  paid: '排队中',
};

async function fetchOrders() {
  loading.value = true;
  try {
    const result = await listThesisMaterialOrders(page.value, 10);
    orders.value = result.items;
    total.value = result.total;
    syncPolling();
  } finally {
    loading.value = false;
  }
}

function syncPolling() {
  const active = orders.value.some((item) => ['generating', 'paid'].includes(item.status));
  if (!active && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  } else if (active && !pollTimer) {
    pollTimer = setInterval(() => void fetchOrders(), 5000);
  }
}

async function openDetail(item: ThesisMaterialOrderItem) {
  detail.value = await getThesisMaterialOrder(item.order_sn);
  detailOpen.value = true;
}

function download(url?: null | string) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

onMounted(fetchOrders);
onBeforeUnmount(() => pollTimer && clearInterval(pollTimer));
</script>

<template>
  <Page content-class="space-y-4" title="材料记录">
    <a-card title="开题报告、文献综述与任务书">
      <template #extra><a-button :loading="loading" @click="fetchOrders">刷新</a-button></template>
      <a-table
        row-key="order_sn"
        :columns="[
          { title: '类型', dataIndex: 'document_type' },
          { title: '题目', dataIndex: 'title' },
          { title: '状态', dataIndex: 'status' },
          { title: '积分', dataIndex: 'cost_points' },
          { title: '创建时间', dataIndex: 'created_at' },
          { title: '操作', key: 'action' },
        ]"
        :data-source="orders"
        :loading="loading"
        :pagination="{ current: page, pageSize: 10, total }"
        :scroll="{ x: 900 }"
        @change="(pagination:any) => { page = pagination.current; fetchOrders(); }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'document_type'">{{ typeText[record.document_type] }}</template>
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="record.status === 'completed' ? 'green' : record.status === 'failed' ? 'red' : 'blue'">
              {{ statusText[record.status] || record.status }}
            </a-tag>
          </template>
          <template v-if="column.dataIndex === 'created_at'">{{ dayjs(record.created_at).format('YYYY-MM-DD HH:mm') }}</template>
          <template v-if="column.key === 'action'">
            <a-button size="small" @click="openDetail(record)">详情</a-button>
          </template>
        </template>
        <template #emptyText><a-empty description="暂无论文材料生成记录" /></template>
      </a-table>
    </a-card>
    <a-drawer v-model:open="detailOpen" title="材料详情" width="720">
      <a-descriptions v-if="detail" bordered :column="1" size="small">
        <a-descriptions-item label="订单号">{{ detail.order_sn }}</a-descriptions-item>
        <a-descriptions-item label="类型">{{ typeText[detail.document_type] }}</a-descriptions-item>
        <a-descriptions-item label="题目">{{ detail.title }}</a-descriptions-item>
        <a-descriptions-item label="进度">{{ detail.progress }}% · {{ detail.stage || '-' }}</a-descriptions-item>
        <a-descriptions-item label="错误">{{ detail.error_message || '-' }}</a-descriptions-item>
        <a-descriptions-item label="文件">
          <a-button v-if="detail.download_url" type="primary" @click="download(detail.download_url)">下载 Word</a-button>
          <span v-else>-</span>
        </a-descriptions-item>
      </a-descriptions>
      <a-divider>请求快照</a-divider>
      <pre class="max-h-80 overflow-auto rounded bg-gray-100 p-3 text-xs">{{ JSON.stringify(detail?.request, null, 2) }}</pre>
    </a-drawer>
  </Page>
</template>
