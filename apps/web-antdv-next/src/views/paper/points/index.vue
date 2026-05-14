<script lang="ts" setup>
import type { PointLedger, RechargeOrder } from '#/api';

import { onMounted, ref } from 'vue';

import { confirm, Page } from '@vben/common-ui';

import { message } from 'antdv-next';

import {
  createRechargeOrder,
  getApiTokenInfo,
  listPointLedgers,
  listRechargeOrders,
  resetApiToken,
} from '#/api';

const ledgers = ref<PointLedger[]>([]);
const rechargeOrders = ref<RechargeOrder[]>([]);
const tokenInfo = ref<any>(null);
const total = ref(0);
const rechargeTotal = ref(0);
const page = ref(1);
const rechargePage = ref(1);
const latestToken = ref('');
const loading = ref(false);
const rechargeLoading = ref(false);
const rechargeForm = ref({
  pay_channel: 'manual' as 'alipay' | 'bank' | 'manual' | 'wechat',
  points: 200,
  remark: '',
});

const rechargeStatusColorMap: Record<string, string> = {
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

async function fetchData() {
  loading.value = true;
  try {
    const [ledgerRes, tokenRes, rechargeRes] = await Promise.all([
      listPointLedgers(page.value, 10),
      getApiTokenInfo(),
      listRechargeOrders(rechargePage.value, 10),
    ]);
    ledgers.value = ledgerRes.items;
    total.value = ledgerRes.total;
    tokenInfo.value = tokenRes;
    rechargeOrders.value = rechargeRes.items;
    rechargeTotal.value = rechargeRes.total;
  } finally {
    loading.value = false;
  }
}

async function submitRecharge() {
  if (!rechargeForm.value.points || rechargeForm.value.points <= 0) {
    message.warning('请输入有效的充值积分');
    return;
  }
  rechargeLoading.value = true;
  try {
    await createRechargeOrder({
      pay_channel: rechargeForm.value.pay_channel,
      points: rechargeForm.value.points,
      remark: rechargeForm.value.remark,
    });
    message.success('充值申请已提交，等待管理员审核');
    rechargeForm.value.remark = '';
    rechargePage.value = 1;
    await fetchData();
  } finally {
    rechargeLoading.value = false;
  }
}

async function handleResetToken() {
  try {
    await confirm({
      content: '重置后旧 Token 会立即失效，外部系统需要替换为新 Token。',
      icon: 'warning',
      title: '确认重置调用 Token',
    });
  } catch {
    return;
  }
  const res = await resetApiToken();
  latestToken.value = res.token;
  tokenInfo.value = res;
  message.success('调用 Token 已重置，请妥善保存');
}

function copyToken() {
  if (!latestToken.value) return;
  navigator.clipboard?.writeText(latestToken.value);
  message.success('Token 已复制');
}

onMounted(fetchData);
</script>

<template>
  <Page
    content-class="space-y-4"
    description="查看积分流水、长期调用 Token 和外部 API 接入信息。"
    title="积分与 Token"
  >
    <a-row :gutter="[16, 16]" class="mb-4">
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic
            title="当前 Token 状态"
            :value="tokenInfo?.has_token ? '已生成' : '未生成'"
          />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="Token 调用次数" :value="tokenInfo?.call_count ?? 0" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="流水记录" :value="total" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="充值申请" :value="rechargeTotal" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :lg="9" :xs="24">
        <a-card title="调用 Token">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="当前 Token">{{ tokenInfo?.masked_token || '未生成' }}</a-descriptions-item>
            <a-descriptions-item label="调用次数">{{ tokenInfo?.call_count ?? 0 }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ tokenInfo?.created_at || '-' }}</a-descriptions-item>
            <a-descriptions-item label="最近使用">{{ tokenInfo?.last_used_at || '-' }}</a-descriptions-item>
          </a-descriptions>
          <a-alert
            v-if="latestToken"
            class="mt-4"
            show-icon
            type="success"
            message="新 Token 仅本次展示，请复制后妥善保存"
          >
            <template #description>
              <a-typography-text copyable>{{ latestToken }}</a-typography-text>
            </template>
          </a-alert>
          <a-alert
            v-else
            class="mt-4"
            show-icon
            type="info"
            message="Token 用于外部系统调用论文生成 API"
            description="重置 Token 后，旧 Token 会立即失效。"
          />
          <a-space class="mt-4">
            <a-button type="primary" @click="handleResetToken">生成/重置 Token</a-button>
            <a-button :disabled="!latestToken" @click="copyToken">复制明文 Token</a-button>
          </a-space>
        </a-card>

        <a-card class="mt-4" title="积分充值">
          <a-form layout="vertical">
            <a-form-item label="充值积分">
              <a-input-number
                v-model:value="rechargeForm.points"
                class="w-full"
                :min="1"
                :step="100"
              />
            </a-form-item>
            <a-form-item label="折算金额">
              <a-input :value="`${(rechargeForm.points / 10).toFixed(2)} 元`" disabled />
            </a-form-item>
            <a-form-item label="支付/沟通渠道">
              <a-select
                v-model:value="rechargeForm.pay_channel"
                :options="[
                  { value: 'manual', label: '人工沟通' },
                  { value: 'wechat', label: '微信' },
                  { value: 'alipay', label: '支付宝' },
                  { value: 'bank', label: '银行转账' },
                ]"
              />
            </a-form-item>
            <a-form-item label="备注">
              <a-textarea
                v-model:value="rechargeForm.remark"
                :rows="3"
                placeholder="可填写付款凭证、联系方式或开票信息"
              />
            </a-form-item>
            <a-button type="primary" block :loading="rechargeLoading" @click="submitRecharge">
              提交充值申请
            </a-button>
          </a-form>
        </a-card>
      </a-col>
      <a-col :lg="15" :xs="24">
        <a-card title="积分流水">
          <a-table
            row-key="id"
            :columns="[
              { title: '类型', dataIndex: 'change_type' },
              { title: '变化', dataIndex: 'delta' },
              { title: '余额', dataIndex: 'balance_after' },
              { title: '原因', dataIndex: 'reason' },
              { title: '时间', dataIndex: 'created_at' },
            ]"
            :data-source="ledgers"
            :loading="loading"
            :pagination="{ current: page, total, pageSize: 10 }"
            :scroll="{ x: 820 }"
            @change="(pagination:any) => { page = pagination.current; fetchData(); }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'delta'">
                <a-tag :color="record.delta >= 0 ? 'green' : 'red'">
                  {{ record.delta >= 0 ? '+' : '' }}{{ record.delta }}
                </a-tag>
              </template>
            </template>
            <template #emptyText>
              <a-empty description="暂无积分流水" />
            </template>
          </a-table>
        </a-card>

        <a-card class="mt-4" title="充值记录">
          <a-table
            row-key="id"
            :columns="[
              { title: '申请单号', dataIndex: 'order_sn' },
              { title: '积分', dataIndex: 'points' },
              { title: '金额', dataIndex: 'amount' },
              { title: '渠道', dataIndex: 'pay_channel' },
              { title: '状态', dataIndex: 'status' },
              { title: '备注', dataIndex: 'remark' },
              { title: '管理员备注', dataIndex: 'admin_remark' },
              { title: '提交时间', dataIndex: 'created_at' },
            ]"
            :data-source="rechargeOrders"
            :loading="loading"
            :pagination="{ current: rechargePage, total: rechargeTotal, pageSize: 10 }"
            :scroll="{ x: 1100 }"
            @change="(pagination:any) => { rechargePage = pagination.current; fetchData(); }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'status'">
                <a-tag :color="rechargeStatusColorMap[record.status] || 'default'">
                  {{ record.status_text || record.status }}
                </a-tag>
              </template>
              <template v-if="column.dataIndex === 'pay_channel'">
                {{ payChannelTextMap[record.pay_channel] || record.pay_channel }}
              </template>
              <template v-if="column.dataIndex === 'amount'">
                {{ record.amount.toFixed(2) }}
              </template>
            </template>
            <template #emptyText>
              <a-empty description="暂无充值申请" />
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </Page>
</template>
