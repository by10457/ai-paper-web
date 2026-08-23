<script lang="ts" setup>
import type { AdminThesisMaterialOrder, AdminThesisMaterialOrderDetail } from '#/api';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  getAdminThesisMaterialOrderDetail,
  listAdminThesisMaterialOrders,
} from '#/api';

const orders = ref<AdminThesisMaterialOrder[]>([]);
const total = ref(0);
const page = ref(1);
const keyword = ref('');
const status = ref<string>();
const documentType = ref<string>();
const loading = ref(false);
const detailOpen = ref(false);
const detail = ref<AdminThesisMaterialOrderDetail>();

const typeText: Record<string, string> = {
  literature_review: '文献综述',
  proposal_report: '开题报告',
  task_book: '任务书',
};
const statusColor: Record<string, string> = {
  completed: 'green',
  failed: 'red',
  generating: 'blue',
  paid: 'cyan',
  queued: 'cyan',
  refunded: 'orange',
};

async function fetchOrders() {
  loading.value = true;
  try {
    const result = await listAdminThesisMaterialOrders({
      document_type: documentType.value || undefined,
      keyword: keyword.value || undefined,
      page: page.value,
      page_size: 10,
      status: status.value || undefined,
    });
    orders.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

async function openDetail(order: AdminThesisMaterialOrder) {
  detail.value = await getAdminThesisMaterialOrderDetail(order.id);
  detailOpen.value = true;
}

onMounted(fetchOrders);
</script>

<template>
  <Page content-class="space-y-4" description="" title="">
    <a-card title="论文材料任务">
      <template #extra>
        <a-space wrap>
          <a-input-search
            v-model:value="keyword"
            placeholder="订单号/标题"
            @search="() => { page = 1; fetchOrders(); }"
          />
          <a-select
            v-model:value="documentType"
            allow-clear
            placeholder="文档类型"
            style="width: 140px"
            @change="() => { page = 1; fetchOrders(); }"
          >
            <a-select-option value="proposal_report">开题报告</a-select-option>
            <a-select-option value="literature_review">文献综述</a-select-option>
            <a-select-option value="task_book">任务书</a-select-option>
          </a-select>
          <a-select
            v-model:value="status"
            allow-clear
            placeholder="状态"
            style="width: 120px"
            @change="() => { page = 1; fetchOrders(); }"
          >
            <a-select-option value="queued">排队中</a-select-option>
            <a-select-option value="generating">生成中</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
            <a-select-option value="failed">失败</a-select-option>
            <a-select-option value="refunded">已退款</a-select-option>
          </a-select>
          <a-button :loading="loading" @click="fetchOrders">刷新</a-button>
        </a-space>
      </template>

      <a-table
        row-key="id"
        :columns="[
          { title: '订单号', dataIndex: 'order_sn', width: 210 },
          { title: '类型', dataIndex: 'document_type', width: 110 },
          { title: '用户', dataIndex: 'username', width: 110 },
          { title: '标题', dataIndex: 'title' },
          { title: '状态', dataIndex: 'status', width: 100 },
          { title: '进度', dataIndex: 'progress', width: 120 },
          { title: '扣费', dataIndex: 'paid_points', width: 80 },
          { title: '操作', key: 'action', width: 90 },
        ]"
        :data-source="orders"
        :loading="loading"
        :pagination="{ current: page, total, pageSize: 10 }"
        :scroll="{ x: 1100 }"
        @change="(pagination:any) => { page = pagination.current; fetchOrders(); }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'document_type'">
            {{ typeText[record.document_type] || record.document_type }}
          </template>
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">
              {{ record.status }}
            </a-tag>
          </template>
          <template v-if="column.dataIndex === 'progress'">
            <a-progress :percent="record.progress" size="small" />
          </template>
          <template v-if="column.key === 'action'">
            <a-button size="small" @click="openDetail(record)">详情</a-button>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="暂无论文材料任务" />
        </template>
      </a-table>
    </a-card>

    <a-drawer v-model:open="detailOpen" title="论文材料任务详情" width="720">
      <template v-if="detail">
        <a-descriptions bordered :column="1" size="small">
          <a-descriptions-item label="订单号">{{ detail.order.order_sn }}</a-descriptions-item>
          <a-descriptions-item label="文档类型">
            {{ typeText[detail.order.document_type] || detail.order.document_type }}
          </a-descriptions-item>
          <a-descriptions-item label="标题">{{ detail.order.title }}</a-descriptions-item>
          <a-descriptions-item label="用户">{{ detail.order.username }}</a-descriptions-item>
          <a-descriptions-item label="状态/阶段">
            {{ detail.order.status }} / {{ detail.order.stage || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="文件">
            <a :href="detail.download_url || undefined" target="_blank">
              {{ detail.download_url || detail.local_file_key || '-' }}
            </a>
          </a-descriptions-item>
          <a-descriptions-item label="错误">
            {{ detail.order.last_error || '-' }}
          </a-descriptions-item>
        </a-descriptions>
        <a-divider>请求参数</a-divider>
        <pre class="max-h-64 overflow-auto rounded bg-muted p-3">{{ JSON.stringify(detail.request_payload, null, 2) }}</pre>
        <a-divider>结构化结果</a-divider>
        <pre class="max-h-96 overflow-auto rounded bg-muted p-3">{{ JSON.stringify(detail.result_data, null, 2) }}</pre>
      </template>
    </a-drawer>
  </Page>
</template>
