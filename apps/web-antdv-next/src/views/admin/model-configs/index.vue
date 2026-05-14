<script lang="ts" setup>
import type { AuditLog, ModelCallLog, ModelConfig } from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { confirm, Page } from '@vben/common-ui';

import { message } from 'antdv-next';

import {
  createModelConfig,
  deleteModelConfig,
  listAuditLogs,
  listModelConfigs,
  listModelCallLogs,
  testModelConfig,
  updateModelConfig,
} from '#/api';

const configs = ref<ModelConfig[]>([]);
const modelLogs = ref<ModelCallLog[]>([]);
const auditLogs = ref<AuditLog[]>([]);
const open = ref(false);
const editing = ref<ModelConfig>();
const loading = ref(false);
const logLoading = ref(false);
const auditLoading = ref(false);
const modelLogPage = ref(1);
const modelLogTotal = ref(0);
const auditPage = ref(1);
const auditTotal = ref(0);
const form = reactive<Record<string, any>>({
  api_base_url: 'https://api.deepseek.com',
  api_key: '',
  config_type: 'outline',
  is_default: false,
  is_enabled: true,
  max_tokens: 4096,
  model_name: 'deepseek-chat',
  provider: 'deepseek',
  remark: '',
  temperature: 0.7,
  timeout_seconds: 120,
});
const enabledCount = computed(
  () => configs.value.filter((item) => item.is_enabled).length,
);
const defaultCount = computed(
  () => configs.value.filter((item) => item.is_default).length,
);

async function fetchConfigs() {
  loading.value = true;
  try {
    configs.value = await listModelConfigs();
  } finally {
    loading.value = false;
  }
}

async function fetchModelLogs() {
  logLoading.value = true;
  try {
    const res = await listModelCallLogs(modelLogPage.value, 10);
    modelLogs.value = res.items;
    modelLogTotal.value = res.total;
  } finally {
    logLoading.value = false;
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

function openCreate() {
  editing.value = undefined;
  Object.assign(form, {
    api_base_url: 'https://api.deepseek.com',
    api_key: '',
    config_type: 'outline',
    is_default: false,
    is_enabled: true,
    max_tokens: 4096,
    model_name: 'deepseek-chat',
    provider: 'deepseek',
    remark: '',
    temperature: 0.7,
    timeout_seconds: 120,
  });
  open.value = true;
}

function openEdit(item: ModelConfig) {
  editing.value = item;
  Object.assign(form, item, { api_key: '' });
  open.value = true;
}

async function saveConfig() {
  if (!form.provider || !form.model_name || !form.api_base_url) {
    message.warning('请填写供应商、模型名称和 Base URL');
    return;
  }
  if (!editing.value && !form.api_key) {
    message.warning('新增模型配置需要填写 API Key');
    return;
  }
  if (editing.value) {
    const data = { ...form };
    if (!data.api_key) delete data.api_key;
    await updateModelConfig(editing.value.id, data);
  } else {
    await createModelConfig(form);
  }
  message.success('模型配置已保存');
  open.value = false;
  await fetchConfigs();
}

async function removeConfig(item: ModelConfig) {
  try {
    await confirm({
      content: `确认删除 ${item.provider} / ${item.model_name}？删除后相关历史日志仍会保留。`,
      icon: 'warning',
      title: '删除模型配置',
    });
  } catch {
    return;
  }
  await deleteModelConfig(item.id);
  message.success('模型配置已删除');
  await fetchConfigs();
}

async function handleTestConfig(item: ModelConfig) {
  const res = await testModelConfig(item.id);
  message[res.status === 'ok' ? 'success' : 'warning'](res.message);
}

onMounted(() => {
  fetchConfigs();
  fetchModelLogs();
  fetchAuditLogs();
});
</script>

<template>
  <Page
    content-class="space-y-4"
    description="维护大纲、全文、图表等场景使用的大模型供应商和参数。"
    title="大模型配置"
  >
    <a-row :gutter="[16, 16]" class="mb-4">
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="配置总数" :value="configs.length" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="启用配置" :value="enabledCount" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic title="默认配置" :value="defaultCount" />
        </a-card>
      </a-col>
      <a-col :lg="6" :sm="12" :xs="24">
        <a-card>
          <a-statistic
            title="配置用途"
            :value="new Set(configs.map((item) => item.config_type)).size"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-card>
      <a-tabs>
        <a-tab-pane key="configs" tab="模型配置">
          <div class="mb-4 flex justify-between gap-3">
            <a-alert
              class="flex-1"
              show-icon
              type="info"
              message="API Key 仅允许写入，查询时只展示脱敏值"
            />
            <a-space>
              <a-button :loading="loading" @click="fetchConfigs">刷新</a-button>
              <a-button type="primary" @click="openCreate">新增配置</a-button>
            </a-space>
          </div>
          <a-table
            row-key="id"
            :columns="[
              { title: '用途', dataIndex: 'config_type' },
              { title: '供应商', dataIndex: 'provider' },
              { title: '模型', dataIndex: 'model_name' },
              { title: 'Base URL', dataIndex: 'api_base_url' },
              { title: 'Key', dataIndex: 'masked_api_key' },
              { title: '温度', dataIndex: 'temperature' },
              { title: '最大 Token', dataIndex: 'max_tokens' },
              { title: '启用', dataIndex: 'is_enabled' },
              { title: '默认', dataIndex: 'is_default' },
              { title: '操作', key: 'action', fixed: 'right', width: 220 },
            ]"
            :data-source="configs"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 1280 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'config_type'">
                <a-tag color="blue">{{ record.config_type }}</a-tag>
              </template>
              <template v-if="column.dataIndex === 'is_enabled'">
                <a-tag :color="record.is_enabled ? 'green' : 'default'">{{ record.is_enabled ? '启用' : '停用' }}</a-tag>
              </template>
              <template v-if="column.dataIndex === 'is_default'">
                <a-tag v-if="record.is_default" color="blue">默认</a-tag>
                <span v-else>-</span>
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button size="small" @click="handleTestConfig(record)">测试</a-button>
                  <a-button size="small" @click="openEdit(record)">编辑</a-button>
                  <a-button size="small" danger @click="removeConfig(record)">删除</a-button>
                </a-space>
              </template>
            </template>
            <template #emptyText>
              <a-empty description="暂无模型配置，请先新增一个可用模型" />
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="modelLogs" tab="模型调用日志">
          <div class="mb-4 text-right">
            <a-button :loading="logLoading" @click="fetchModelLogs">刷新</a-button>
          </div>
          <a-table
            row-key="id"
            :columns="[
              { title: 'ID', dataIndex: 'id', width: 80 },
              { title: '用途', dataIndex: 'config_type' },
              { title: '供应商', dataIndex: 'provider' },
              { title: '模型', dataIndex: 'model_name' },
              { title: '用户', dataIndex: 'user_id' },
              { title: '订单', dataIndex: 'order_id' },
              { title: '输入', dataIndex: 'input_tokens' },
              { title: '输出', dataIndex: 'output_tokens' },
              { title: '耗时(ms)', dataIndex: 'latency_ms' },
              { title: '状态', dataIndex: 'status' },
              { title: '错误', dataIndex: 'error_message' },
              { title: '时间', dataIndex: 'created_at' },
            ]"
            :data-source="modelLogs"
            :loading="logLoading"
            :pagination="{ current: modelLogPage, total: modelLogTotal, pageSize: 10 }"
            :scroll="{ x: 1300 }"
            @change="(pagination:any) => { modelLogPage = pagination.current; fetchModelLogs(); }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'status'">
                <a-tag :color="record.status === 'success' ? 'green' : 'red'">
                  {{ record.status }}
                </a-tag>
              </template>
            </template>
            <template #emptyText>
              <a-empty description="暂无模型调用日志" />
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="audit" tab="审计日志">
          <div class="mb-4 text-right">
            <a-button :loading="auditLoading" @click="fetchAuditLogs">刷新</a-button>
          </div>
          <a-table
            row-key="id"
            :columns="[
              { title: 'ID', dataIndex: 'id', width: 80 },
              { title: '操作人', dataIndex: 'operator_id' },
              { title: '动作', dataIndex: 'action' },
              { title: '对象', dataIndex: 'target_type' },
              { title: '对象 ID', dataIndex: 'target_id' },
              { title: '摘要', dataIndex: 'summary' },
              { title: 'IP', dataIndex: 'ip_address' },
              { title: '时间', dataIndex: 'created_at' },
            ]"
            :data-source="auditLogs"
            :loading="auditLoading"
            :pagination="{ current: auditPage, total: auditTotal, pageSize: 10 }"
            :scroll="{ x: 1100 }"
            @change="(pagination:any) => { auditPage = pagination.current; fetchAuditLogs(); }"
          >
            <template #emptyText>
              <a-empty description="暂无审计日志" />
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal v-model:open="open" width="720px" title="模型配置" @ok="saveConfig">
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12"><a-form-item label="用途"><a-select v-model:value="form.config_type" :options="['outline','fulltext','figure','default'].map(value => ({value}))" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="供应商"><a-input v-model:value="form.provider" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="模型名称"><a-input v-model:value="form.model_name" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Base URL"><a-input v-model:value="form.api_base_url" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="API Key"><a-input-password v-model:value="form.api_key" placeholder="编辑时留空表示不修改" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="温度"><a-input-number v-model:value="form.temperature" class="w-full" :min="0" :max="2" :step="0.1" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="最大 Token"><a-input-number v-model:value="form.max_tokens" class="w-full" :min="1" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="超时秒数"><a-input-number v-model:value="form.timeout_seconds" class="w-full" :min="1" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="启用"><a-switch v-model:checked="form.is_enabled" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="默认"><a-switch v-model:checked="form.is_default" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="备注"><a-textarea v-model:value="form.remark" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </Page>
</template>
