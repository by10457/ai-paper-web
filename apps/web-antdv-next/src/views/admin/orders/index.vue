<script lang="ts" setup>
import type { AdminOrder, AdminOrderDetail } from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { confirm, Page } from '@vben/common-ui';

import { message } from 'antdv-next';

import {
  attachAdminOrderFile,
  getAdminOrderDetail,
  listAdminOrders,
  markAdminOrderFailed,
  refundAdminOrder,
  retryAdminOrder,
} from '#/api';

const orders = ref<AdminOrder[]>([]);
const total = ref(0);
const page = ref(1);
const keyword = ref('');
const status = ref<string>();
const loading = ref(false);
const currentOrder = ref<AdminOrder>();
const orderDetail = ref<AdminOrderDetail>();
const detailOpen = ref(false);
const fileOpen = ref(false);
const failOpen = ref(false);
const refundOpen = ref(false);
const fileForm = reactive({ download_url: '', file_key: '', reason: '管理员人工补发' });
const failForm = reactive({ reason: '管理员手动标记失败' });
const refundForm = reactive({ reason: '管理员退回积分' });
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
const failedCount = computed(
  () => orders.value.filter((item) => item.status === 'failed').length,
);
const runningCount = computed(
  () => orders.value.filter((item) => ['generating', 'paid'].includes(item.status)).length,
);

async function fetchOrders() {
  loading.value = true;
  try {
    const res = await listAdminOrders({
      keyword: keyword.value || undefined,
      page: page.value,
      page_size: 10,
      status: status.value || undefined,
    });
    orders.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function simpleAction(action: () => Promise<any>, tip: string, content: string) {
  try {
    await confirm({
      content,
      icon: 'question',
      title: '确认操作',
    });
  } catch {
    return;
  }
  await action();
  message.success(tip);
  await fetchOrders();
}

async function openDetail(order: AdminOrder) {
  currentOrder.value = order;
  orderDetail.value = await getAdminOrderDetail(order.id);
  detailOpen.value = true;
}

function openAttachFile(order: AdminOrder) {
  currentOrder.value = order;
  Object.assign(fileForm, {
    download_url: order.download_url || '',
    file_key: order.file_key || '',
    reason: '管理员人工补发',
  });
  fileOpen.value = true;
}

async function handleAttachFile() {
  if (!currentOrder.value) return;
  if (!fileForm.download_url.trim() || !fileForm.reason.trim()) {
    message.warning('请填写下载链接和原因');
    return;
  }
  await attachAdminOrderFile(currentOrder.value.id, {
    download_url: fileForm.download_url,
    file_key: fileForm.file_key || undefined,
    reason: fileForm.reason,
  });
  message.success('下载链接已补发');
  fileOpen.value = false;
  await fetchOrders();
}

function openFail(order: AdminOrder) {
  currentOrder.value = order;
  failForm.reason = order.last_error || '管理员手动标记失败';
  failOpen.value = true;
}

async function handleFail() {
  if (!currentOrder.value) return;
  if (!failForm.reason.trim()) {
    message.warning('请填写失败原因');
    return;
  }
  await markAdminOrderFailed(currentOrder.value.id, failForm.reason);
  message.success('已标记失败');
  failOpen.value = false;
  await fetchOrders();
}

function openRefund(order: AdminOrder) {
  currentOrder.value = order;
  refundForm.reason = '管理员退回积分';
  refundOpen.value = true;
}

async function handleRefund() {
  if (!currentOrder.value) return;
  if (!refundForm.reason.trim()) {
    message.warning('请填写退款原因');
    return;
  }
  await refundAdminOrder(currentOrder.value.id, refundForm.reason);
  message.success('已退积分');
  refundOpen.value = false;
  await fetchOrders();
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
          <a-statistic title="订单总数" :value="total" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="当前页生成中" :value="runningCount" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="当前页失败" :value="failedCount" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic
            title="当前页扣费"
            :value="orders.reduce((sum, item) => sum + item.paid_points, 0)"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-card title="订单任务">
      <template #extra>
        <a-space wrap>
          <a-input-search v-model:value="keyword" placeholder="订单号/标题" @search="() => { page = 1; fetchOrders(); }" />
          <a-select v-model:value="status" allow-clear placeholder="状态" style="width: 140px" @change="fetchOrders">
            <a-select-option value="created">created</a-select-option>
            <a-select-option value="paid">paid</a-select-option>
            <a-select-option value="generating">generating</a-select-option>
            <a-select-option value="completed">completed</a-select-option>
            <a-select-option value="failed">failed</a-select-option>
            <a-select-option value="refunded">refunded</a-select-option>
          </a-select>
          <a-button :loading="loading" @click="fetchOrders">刷新</a-button>
        </a-space>
      </template>
      <a-table
        row-key="id"
        :columns="[
          { title: '订单号', dataIndex: 'order_sn' },
          { title: '用户', dataIndex: 'username' },
          { title: '标题', dataIndex: 'title' },
          { title: '状态', dataIndex: 'status' },
          { title: '扣费', dataIndex: 'paid_points' },
          { title: '退款', dataIndex: 'refunded_points' },
          { title: '错误', dataIndex: 'last_error' },
          { title: '操作', key: 'action' },
        ]"
        :data-source="orders"
        :loading="loading"
        :pagination="{ current: page, total, pageSize: 10 }"
        :scroll="{ x: 1160 }"
        @change="(pagination:any) => { page = pagination.current; fetchOrders(); }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="statusColorMap[record.status] || 'default'">
              {{ statusTextMap[record.status] || record.status }}
            </a-tag>
          </template>
          <template v-if="column.dataIndex === 'last_error'">
            <a-typography-text
              :ellipsis="{ tooltip: record.last_error }"
              style="max-width: 220px"
            >
              {{ record.last_error || '-' }}
            </a-typography-text>
          </template>
          <template v-if="column.key === 'action'">
            <a-space wrap>
              <a-button size="small" @click="openDetail(record)">详情</a-button>
              <a-button
                size="small"
                @click="simpleAction(() => retryAdminOrder(record.id), '已提交重试', `确认重试订单 ${record.order_sn}？`)"
              >
                重试
              </a-button>
              <a-button size="small" @click="openAttachFile(record)">补链接</a-button>
              <a-button
                danger
                size="small"
                @click="openFail(record)"
              >
                标失败
              </a-button>
              <a-button
                danger
                size="small"
                @click="openRefund(record)"
              >
                退积分
              </a-button>
            </a-space>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="暂无订单任务" />
        </template>
      </a-table>
    </a-card>

    <a-modal v-model:open="fileOpen" title="人工补发下载链接" @ok="handleAttachFile">
      <a-form layout="vertical">
        <a-alert
          v-if="currentOrder"
          class="mb-4"
          show-icon
          type="info"
          :message="`订单：${currentOrder.order_sn}`"
        />
        <a-form-item label="下载链接" required>
          <a-input v-model:value="fileForm.download_url" />
        </a-form-item>
        <a-form-item label="文件 Key">
          <a-input v-model:value="fileForm.file_key" />
        </a-form-item>
        <a-form-item label="处理原因" required>
          <a-textarea v-model:value="fileForm.reason" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="failOpen" title="标记订单失败" @ok="handleFail">
      <a-form layout="vertical">
        <a-alert
          v-if="currentOrder"
          class="mb-4"
          show-icon
          type="warning"
          :message="`订单：${currentOrder.order_sn}`"
        />
        <a-form-item label="失败原因" required>
          <a-textarea v-model:value="failForm.reason" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="refundOpen" title="退回订单积分" @ok="handleRefund">
      <a-form layout="vertical">
        <a-alert
          v-if="currentOrder"
          class="mb-4"
          show-icon
          type="warning"
          :message="`将退回订单 ${currentOrder.order_sn} 的可退积分`"
        />
        <a-form-item label="退款原因" required>
          <a-textarea v-model:value="refundForm.reason" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:open="detailOpen"
      width="820"
      title="订单详情"
      @close="orderDetail = undefined"
    >
      <template v-if="orderDetail">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="订单号">{{ orderDetail.order.order_sn }}</a-descriptions-item>
          <a-descriptions-item label="用户">{{ orderDetail.order.username }}</a-descriptions-item>
          <a-descriptions-item label="标题">{{ orderDetail.order.title }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="statusColorMap[orderDetail.order.status] || 'default'">
              {{ statusTextMap[orderDetail.order.status] || orderDetail.order.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="应扣积分">{{ orderDetail.order.cost_points }}</a-descriptions-item>
          <a-descriptions-item label="已扣积分">{{ orderDetail.order.paid_points }}</a-descriptions-item>
          <a-descriptions-item label="已退积分">{{ orderDetail.order.refunded_points }}</a-descriptions-item>
          <a-descriptions-item label="任务 ID">{{ orderDetail.order.task_id || '-' }}</a-descriptions-item>
          <a-descriptions-item label="文件 Key">{{ orderDetail.order.file_key || '-' }}</a-descriptions-item>
          <a-descriptions-item label="下载链接">
            <a-typography-text v-if="orderDetail.order.download_url" copyable>
              {{ orderDetail.order.download_url }}
            </a-typography-text>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="错误信息" :span="2">
            {{ orderDetail.order.last_error || '-' }}
          </a-descriptions-item>
        </a-descriptions>

        <a-tabs class="mt-4">
          <a-tab-pane key="config" tab="请求参数">
            <pre class="max-h-96 overflow-auto rounded bg-muted p-3 text-xs">{{ JSON.stringify(orderDetail.config_form || orderDetail.request_payload || {}, null, 2) }}</pre>
          </a-tab-pane>
          <a-tab-pane key="outline" tab="大纲快照">
            <pre class="max-h-96 overflow-auto rounded bg-muted p-3 text-xs">{{ JSON.stringify(orderDetail.outline_json, null, 2) }}</pre>
          </a-tab-pane>
          <a-tab-pane key="ledger" tab="积分流水">
            <a-table
              row-key="id"
              size="small"
              :columns="[
                { title: '类型', dataIndex: 'change_type' },
                { title: '变化', dataIndex: 'delta' },
                { title: '余额', dataIndex: 'balance_after' },
                { title: '原因', dataIndex: 'reason' },
                { title: '时间', dataIndex: 'created_at' },
              ]"
              :data-source="orderDetail.point_ledgers"
              :pagination="false"
            />
          </a-tab-pane>
        </a-tabs>
      </template>
    </a-drawer>
  </Page>
</template>
