<script lang="ts" setup>
import type { PaperOrderItem } from '#/api';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { message } from 'antdv-next';
import dayjs from 'dayjs';

import {
  getMyPaperOrderDetail,
  getPaperOrderDownloadUrl,
  getPaperPrice,
  listMyPaperOrders,
} from '#/api';

const loading = ref(false);
const orders = ref<PaperOrderItem[]>([]);
const total = ref(0);
const page = ref(1);
const detail = ref<any>(null);
const detailOpen = ref(false);
const userPoints = ref(0);
const downloadLoadingKey = ref('');
const copyLoadingKey = ref('');
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

async function fetchOrders() {
  loading.value = true;
  try {
    const [res, price] = await Promise.all([
      listMyPaperOrders(page.value, 10),
      getPaperPrice(),
    ]);
    orders.value = res.items;
    total.value = res.total;
    userPoints.value = price.user_points;
  } finally {
    loading.value = false;
  }
}

async function openDetail(order: PaperOrderItem) {
  detail.value = await getMyPaperOrderDetail(order.order_sn);
  detailOpen.value = true;
}

function formatMinuteTime(value?: null | string) {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

async function resolveDownloadUrl(orderSn: string) {
  const result = await getPaperOrderDownloadUrl(orderSn);
  return result.download_url;
}

async function copyDownloadUrl(orderSn: string) {
  copyLoadingKey.value = orderSn;
  try {
    const url = await resolveDownloadUrl(orderSn);
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    message.success('下载链接已复制');
  } finally {
    copyLoadingKey.value = '';
  }
}

async function downloadPaper(orderSn: string) {
  downloadLoadingKey.value = orderSn;
  try {
    const url = await resolveDownloadUrl(orderSn);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  } finally {
    downloadLoadingKey.value = '';
  }
}

function hasDownloadFile(order: PaperOrderItem) {
  return order.status === 'completed' && order.has_file === 1;
}

async function copyDetailDownloadUrl() {
  if (!detail.value?.order_sn) return;
  await copyDownloadUrl(detail.value.order_sn);
}

async function downloadDetailPaper() {
  if (!detail.value?.order_sn) return;
  await downloadPaper(detail.value.order_sn);
}

function hasDetailDownloadFile() {
  return detail.value?.status === 'completed' && detail.value?.has_file === 1;
}

onMounted(fetchOrders);
</script>

<template>
  <Page
    content-class="space-y-4"
    description=""
    title=""
  >
    <a-row :gutter="[16, 16]" class="mb-4">
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="当前积分" :value="userPoints" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="订单总数" :value="total" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic
            title="当前页已扣"
            :value="orders.reduce((sum, item) => sum + item.paid_points, 0)"
          />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic
            title="当前页退回"
            :value="orders.reduce((sum, item) => sum + item.refunded_points, 0)"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-card title="订单列表">
      <template #extra>
        <a-button :loading="loading" @click="fetchOrders">刷新</a-button>
      </template>
      <a-table
        row-key="id"
        :columns="[
          { title: '订单号', dataIndex: 'order_sn' },
          { title: '标题', dataIndex: 'title' },
          { title: '状态', dataIndex: 'status' },
          { title: '消耗积分', dataIndex: 'paid_points' },
          { title: '创建时间', dataIndex: 'created_at' },
          { title: '完成时间', dataIndex: 'completed_at' },
          { title: '操作', key: 'action' },
        ]"
        :data-source="orders"
        :loading="loading"
        :pagination="{ current: page, total, pageSize: 10 }"
        :scroll="{ x: 1000 }"
        @change="(pagination:any) => { page = pagination.current; fetchOrders(); }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="statusColorMap[record.status] || 'default'">
              {{ statusTextMap[record.status] || record.status }}
            </a-tag>
          </template>
          <template v-if="column.dataIndex === 'created_at'">
            {{ formatMinuteTime(record.created_at) }}
          </template>
          <template v-if="column.dataIndex === 'completed_at'">
            {{ formatMinuteTime(record.completed_at) }}
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="openDetail(record)">详情</a-button>
              <a-button
                v-if="hasDownloadFile(record)"
                size="small"
                type="primary"
                :loading="downloadLoadingKey === record.order_sn"
                @click="downloadPaper(record.order_sn)"
              >
                下载
              </a-button>
              <a-button
                v-if="hasDownloadFile(record)"
                size="small"
                :loading="copyLoadingKey === record.order_sn"
                @click="copyDownloadUrl(record.order_sn)"
              >
                复制
              </a-button>
            </a-space>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="暂无论文订单，先去生成一个免费大纲" />
        </template>
      </a-table>
    </a-card>

    <a-drawer v-model:open="detailOpen" width="720" title="订单详情" @close="detail = null">
      <a-descriptions v-if="detail" :column="1" bordered size="small">
        <a-descriptions-item label="订单号">{{ detail.order_sn }}</a-descriptions-item>
        <a-descriptions-item label="标题">{{ detail.title }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="statusColorMap[detail.status] || 'default'">
            {{ statusTextMap[detail.status] || detail.status }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="扣费积分">{{ detail.paid_points }}</a-descriptions-item>
        <a-descriptions-item label="退回积分">{{ detail.refunded_points }}</a-descriptions-item>
        <a-descriptions-item label="任务 ID">{{ detail.task_id || '-' }}</a-descriptions-item>
        <a-descriptions-item label="下载链接">
          <a-space v-if="hasDetailDownloadFile()">
            <a-button
              size="small"
              type="primary"
              :loading="downloadLoadingKey === detail.order_sn"
              @click="downloadDetailPaper"
            >
              下载
            </a-button>
            <a-button
              size="small"
              :loading="copyLoadingKey === detail.order_sn"
              @click="copyDetailDownloadUrl"
            >
              复制
            </a-button>
          </a-space>
          <span v-else>-</span>
        </a-descriptions-item>
        <a-descriptions-item label="错误信息">{{ detail.error_msg || '-' }}</a-descriptions-item>
      </a-descriptions>
      <a-divider>大纲快照</a-divider>
      <pre class="max-h-96 overflow-auto rounded bg-gray-100 p-3 text-xs">{{ JSON.stringify(detail?.outline_json, null, 2) }}</pre>
    </a-drawer>
  </Page>
</template>
