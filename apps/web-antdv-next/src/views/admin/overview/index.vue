<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { getAdminOverview } from '#/api';

const data = ref<any>(null);
const loading = ref(false);

type OverviewMetricKey =
  | 'failed_order_count'
  | 'generating_order_count'
  | 'month_order_count'
  | 'month_user_count'
  | 'today_order_count'
  | 'today_user_count'
  | 'total_order_count'
  | 'total_user_count';

const metricGroups: [string, OverviewMetricKey, string][] = [
  ['今日用户', 'today_user_count', '人'],
  ['本月用户', 'month_user_count', '人'],
  ['总用户', 'total_user_count', '人'],
  ['今日订单', 'today_order_count', '单'],
  ['本月订单', 'month_order_count', '单'],
  ['总订单', 'total_order_count', '单'],
  ['生成中', 'generating_order_count', '单'],
  ['失败订单', 'failed_order_count', '单'],
];

async function fetchOverview() {
  loading.value = true;
  try {
    data.value = await getAdminOverview();
  } finally {
    loading.value = false;
  }
}

onMounted(fetchOverview);
</script>

<template>
  <Page
    content-class="space-y-4"
    description="查看用户、订单、积分消耗、任务状态和基础服务健康度。"
    title="运营总览"
  >
    <template #extra>
      <a-button :loading="loading" @click="fetchOverview">刷新</a-button>
    </template>

    <a-row :gutter="[16, 16]">
      <a-col
        v-for="item in metricGroups"
        :key="item[0]"
        :lg="6"
        :md="8"
        :xs="24"
      >
        <a-card :loading="loading">
          <a-statistic
            :title="item[0]"
            :value="data?.[item[1]] ?? 0"
            :suffix="item[2]"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]" class="mt-4">
      <a-col :lg="8" :xs="24">
        <a-card :loading="loading">
          <a-statistic title="今日消耗积分" :value="data?.today_spent_points ?? 0" />
        </a-card>
      </a-col>
      <a-col :lg="8" :xs="24">
        <a-card :loading="loading">
          <a-statistic title="本月消耗积分" :value="data?.month_spent_points ?? 0" />
        </a-card>
      </a-col>
      <a-col :lg="8" :xs="24">
        <a-card :loading="loading">
          <a-statistic title="模型调用量" :value="data?.model_call_count ?? 0" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]" class="mt-4">
      <a-col :lg="8" :xs="24">
        <a-card :loading="loading">
          <a-statistic title="累计消耗积分" :value="data?.total_spent_points ?? 0" />
        </a-card>
      </a-col>
      <a-col :lg="8" :xs="24">
        <a-card :loading="loading">
          <a-statistic title="Token 调用量" :value="data?.api_token_call_count ?? 0" />
        </a-card>
      </a-col>
      <a-col :lg="8" :xs="24">
        <a-card :loading="loading">
          <a-statistic title="生成完成数" :value="data?.completed_order_count ?? 0" />
        </a-card>
      </a-col>
    </a-row>

    <a-card class="mt-4" title="系统健康">
      <a-empty v-if="!data?.health || Object.keys(data.health).length === 0" description="暂无健康检查数据" />
      <a-descriptions :column="2" bordered>
        <a-descriptions-item
          v-for="(value, key) in data?.health || {}"
          :key="key"
          :label="key"
        >
          <a-tag :color="value === 'ok' ? 'green' : 'orange'">
            {{ value }}
          </a-tag>
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-card class="mt-4" title="运维提示">
      <a-alert
        show-icon
        type="info"
        message="首版重点关注任务失败率、积分扣费和模型配置状态"
        description="生成失败后可在“订单任务”里重试、补发下载链接或退回积分。模型 Key 不会在查询接口明文返回。"
      />
    </a-card>
  </Page>
</template>
