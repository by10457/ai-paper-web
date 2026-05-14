<script lang="ts" setup>
import type { AdminRechargeOrder } from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { confirm, Page } from '@vben/common-ui';

import { message } from 'antdv-next';

import { listAdminRechargeOrders, reviewAdminRechargeOrder } from '#/api';

const loading = ref(false);
const reviewing = ref(false);
const orders = ref<AdminRechargeOrder[]>([]);
const total = ref(0);
const page = ref(1);
const keyword = ref('');
const status = ref<string>();
const reviewOpen = ref(false);
const currentOrder = ref<AdminRechargeOrder>();
const reviewForm = reactive({
  admin_remark: '',
  status: 'approved' as 'approved' | 'rejected',
});

const pendingCount = computed(
  () => orders.value.filter((item) => item.status === 'pending').length,
);
const approvedCount = computed(
  () => orders.value.filter((item) => item.status === 'approved').length,
);
const currentPagePoints = computed(() =>
  orders.value
    .filter((item) => item.status === 'approved')
    .reduce((sum, item) => sum + item.points, 0),
);

const statusColorMap: Record<string, string> = {
  approved: 'green',
  pending: 'gold',
  rejected: 'red',
};
const payChannelTextMap: Record<string, string> = {
  alipay: '支付宝',
  bank: '银行转账',
  manual: '人工沟通',
  wechat: '微信',
};

async function fetchOrders() {
  loading.value = true;
  try {
    const res = await listAdminRechargeOrders({
      keyword: keyword.value || undefined,
      page: page.value,
      page_size: 10,
      status: status.value,
    });
    orders.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function openReview(order: AdminRechargeOrder, nextStatus: 'approved' | 'rejected') {
  currentOrder.value = order;
  reviewForm.status = nextStatus;
  reviewForm.admin_remark =
    nextStatus === 'approved' ? '确认到账，积分已入账' : '付款信息未确认';
  reviewOpen.value = true;
}

async function handleReview() {
  if (!currentOrder.value) return;
  if (!reviewForm.admin_remark.trim()) {
    message.warning('请填写审核备注');
    return;
  }
  try {
    await confirm({
      content:
        reviewForm.status === 'approved'
          ? `确认给 ${currentOrder.value.username} 入账 ${currentOrder.value.points} 积分？`
          : `确认驳回申请 ${currentOrder.value.order_sn}？`,
      icon: reviewForm.status === 'approved' ? 'question' : 'warning',
      title: reviewForm.status === 'approved' ? '确认入账' : '确认驳回',
    });
  } catch {
    return;
  }
  reviewing.value = true;
  try {
    await reviewAdminRechargeOrder(currentOrder.value.id, {
      admin_remark: reviewForm.admin_remark,
      status: reviewForm.status,
    });
    message.success(reviewForm.status === 'approved' ? '充值已入账' : '申请已驳回');
    reviewOpen.value = false;
    await fetchOrders();
  } finally {
    reviewing.value = false;
  }
}

onMounted(fetchOrders);
</script>

<template>
  <Page
    content-class="space-y-4"
    description="审核用户积分充值申请，审核通过后自动写入积分流水。"
    title="充值审核"
  >
    <a-row :gutter="[16, 16]" class="mb-4">
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="申请总数" :value="total" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="当前页待审核" :value="pendingCount" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="当前页已入账" :value="approvedCount" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="当前页入账积分" :value="currentPagePoints" />
        </a-card>
      </a-col>
    </a-row>

    <a-card title="充值申请列表">
      <template #extra>
        <a-space wrap>
          <a-input-search
            v-model:value="keyword"
            placeholder="申请单号/用户名"
            @search="() => { page = 1; fetchOrders(); }"
          />
          <a-select
            v-model:value="status"
            allow-clear
            placeholder="状态"
            style="width: 140px"
            @change="() => { page = 1; fetchOrders(); }"
          >
            <a-select-option value="pending">待审核</a-select-option>
            <a-select-option value="approved">已入账</a-select-option>
            <a-select-option value="rejected">已驳回</a-select-option>
          </a-select>
          <a-button :loading="loading" @click="fetchOrders">刷新</a-button>
        </a-space>
      </template>

      <a-table
        row-key="id"
        :columns="[
          { title: '申请单号', dataIndex: 'order_sn', width: 190 },
          { title: '用户', dataIndex: 'username' },
          { title: '积分', dataIndex: 'points' },
          { title: '金额', dataIndex: 'amount' },
          { title: '渠道', dataIndex: 'pay_channel' },
          { title: '状态', dataIndex: 'status' },
          { title: '用户备注', dataIndex: 'remark' },
          { title: '管理员备注', dataIndex: 'admin_remark' },
          { title: '提交时间', dataIndex: 'created_at' },
          { title: '审核时间', dataIndex: 'reviewed_at' },
          { title: '操作', key: 'action', fixed: 'right', width: 160 },
        ]"
        :data-source="orders"
        :loading="loading"
        :pagination="{ current: page, total, pageSize: 10 }"
        :scroll="{ x: 1400 }"
        @change="(pagination:any) => { page = pagination.current; fetchOrders(); }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="statusColorMap[record.status] || 'default'">
              {{ record.status_text || record.status }}
            </a-tag>
          </template>
          <template v-if="column.dataIndex === 'pay_channel'">
            {{ payChannelTextMap[record.pay_channel] || record.pay_channel }}
          </template>
          <template v-if="column.dataIndex === 'amount'">
            {{ record.amount.toFixed(2) }}
          </template>
          <template v-if="column.key === 'action'">
            <a-space v-if="record.status === 'pending'">
              <a-button size="small" type="primary" @click="openReview(record, 'approved')">
                入账
              </a-button>
              <a-button danger size="small" @click="openReview(record, 'rejected')">
                驳回
              </a-button>
            </a-space>
            <span v-else>-</span>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="暂无充值申请" />
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="reviewOpen"
      :confirm-loading="reviewing"
      :title="reviewForm.status === 'approved' ? '确认充值入账' : '驳回充值申请'"
      @ok="handleReview"
    >
      <a-alert
        v-if="currentOrder"
        class="mb-4"
        show-icon
        :type="reviewForm.status === 'approved' ? 'success' : 'warning'"
        :message="`${currentOrder.username} · ${currentOrder.order_sn}`"
        :description="`申请 ${currentOrder.points} 积分，折算 ${currentOrder.amount.toFixed(2)} 元`"
      />
      <a-form layout="vertical">
        <a-form-item label="审核备注" required>
          <a-textarea v-model:value="reviewForm.admin_remark" :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>
  </Page>
</template>
