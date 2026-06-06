<script lang="ts" setup>
import type { AuditLog, ModelCallLog } from '#/api';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { listAuditLogs, listModelCallLogs } from '#/api';

const modelLogs = ref<ModelCallLog[]>([]);
const auditLogs = ref<AuditLog[]>([]);
const modelLoading = ref(false);
const auditLoading = ref(false);
const modelPage = ref(1);
const modelTotal = ref(0);
const auditPage = ref(1);
const auditTotal = ref(0);

async function fetchModelLogs() {
  modelLoading.value = true;
  try {
    const res = await listModelCallLogs(modelPage.value, 10);
    modelLogs.value = res.items;
    modelTotal.value = res.total;
  } finally {
    modelLoading.value = false;
  }
}

async function fetchAuditLogs() {
  auditLoading.value = true;
  try {
    const res = await listAuditLogs(auditPage.value, 10);
    auditLogs.value = res.items;
    auditTotal.value = res.total;
  } finally {
    auditLoading.value = false;
  }
}

onMounted(() => {
  fetchModelLogs();
  fetchAuditLogs();
});
</script>

<template>
  <Page
    content-class="space-y-4"
    description="查看模型调用记录和管理员关键操作审计，便于追踪失败任务和敏感变更。"
    title="日志审计"
  >
    <a-row :gutter="[16, 16]">
      <a-col :lg="12" :xs="24">
        <a-card>
          <a-statistic title="模型调用日志" :value="modelTotal" />
        </a-card>
      </a-col>
      <a-col :lg="12" :xs="24">
        <a-card>
          <a-statistic title="审计日志" :value="auditTotal" />
        </a-card>
      </a-col>
    </a-row>

    <a-card>
      <a-tabs>
        <a-tab-pane key="model" tab="模型调用日志">
          <div class="mb-4 text-right">
            <a-button :loading="modelLoading" @click="fetchModelLogs">刷新</a-button>
          </div>
          <a-table
            row-key="id"
            :columns="[
              { title: 'ID', dataIndex: 'id', width: 80 },
              { title: '用途', dataIndex: 'config_type' },
              { title: '类型', dataIndex: 'call_type' },
              { title: '阶段', dataIndex: 'stage' },
              { title: '任务 ID', dataIndex: 'task_id' },
              { title: '供应商', dataIndex: 'provider' },
              { title: '模型', dataIndex: 'model_name' },
              { title: '用户 ID', dataIndex: 'user_id' },
              { title: '订单 ID', dataIndex: 'order_id' },
              { title: '任务记录 ID', dataIndex: 'generation_task_id' },
              { title: '输入字符', dataIndex: 'prompt_chars' },
              { title: '输出字符', dataIndex: 'response_chars' },
              { title: '输入 Token', dataIndex: 'input_tokens' },
              { title: '输出 Token', dataIndex: 'output_tokens' },
              { title: '耗时(ms)', dataIndex: 'latency_ms' },
              { title: '状态', dataIndex: 'status' },
              { title: '错误', dataIndex: 'error_message' },
              { title: '时间', dataIndex: 'created_at' },
            ]"
            :data-source="modelLogs"
            :loading="modelLoading"
            :pagination="{ current: modelPage, total: modelTotal, pageSize: 10 }"
            :scroll="{ x: 1320 }"
            @change="(pagination:any) => { modelPage = pagination.current; fetchModelLogs(); }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'status'">
                <a-tag :color="record.status === 'success' ? 'green' : 'red'">
                  {{ record.status }}
                </a-tag>
              </template>
              <template v-if="column.dataIndex === 'error_message'">
                <a-typography-text
                  :ellipsis="{ tooltip: record.error_message }"
                  style="max-width: 260px"
                >
                  {{ record.error_message || '-' }}
                </a-typography-text>
              </template>
            </template>
            <template #emptyText>
              <a-empty description="暂无模型调用日志" />
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="audit" tab="管理员审计日志">
          <div class="mb-4 text-right">
            <a-button :loading="auditLoading" @click="fetchAuditLogs">刷新</a-button>
          </div>
          <a-table
            row-key="id"
            :columns="[
              { title: 'ID', dataIndex: 'id', width: 80 },
              { title: '操作人 ID', dataIndex: 'operator_id' },
              { title: '动作', dataIndex: 'action' },
              { title: '目标类型', dataIndex: 'target_type' },
              { title: '目标 ID', dataIndex: 'target_id' },
              { title: '摘要', dataIndex: 'summary' },
              { title: 'IP', dataIndex: 'ip_address' },
              { title: '时间', dataIndex: 'created_at' },
            ]"
            :data-source="auditLogs"
            :loading="auditLoading"
            :pagination="{ current: auditPage, total: auditTotal, pageSize: 10 }"
            :scroll="{ x: 1120 }"
            @change="(pagination:any) => { auditPage = pagination.current; fetchAuditLogs(); }"
          >
            <template #emptyText>
              <a-empty description="暂无审计日志" />
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </Page>
</template>
