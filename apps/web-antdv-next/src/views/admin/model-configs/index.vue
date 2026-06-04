<script lang="ts" setup>
import type { ModelConfig } from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { confirm, Page } from '@vben/common-ui';

import { message } from 'antdv-next';

import {
  createModelConfig,
  deleteModelConfig,
  listModelConfigs,
  updateModelConfig,
} from '#/api';

const configs = ref<ModelConfig[]>([]);
const open = ref(false);
const editing = ref<ModelConfig>();
const loading = ref(false);
const usageOptions = [
  {
    description: '用于生成论文大纲、中英文摘要、致谢和参考文献检索关键词。',
    label: '论文大纲、摘要与检索词',
    value: 'outline',
  },
  {
    description: '用于根据大纲和参考文献生成论文正文，通常需要更大的上下文和输出长度。',
    label: '论文正文生成',
    value: 'fulltext',
  },
  {
    description: '用于生成论文插图、示意图等图片内容。',
    label: '论文插图生成',
    value: 'figure',
  },
  {
    description: '当某个文本用途没有单独配置时使用的兜底文本模型。',
    label: '默认文本模型',
    value: 'default',
  },
] as const;
const textProtocolOptions = [
  {
    description: '适用于支持 Chat Completions / OpenAI 兼容格式的文本模型。',
    label: 'OpenAI 兼容协议',
    value: 'openai-compatible',
  },
  {
    description: '适用于 Claude 系列文本模型。',
    label: 'Anthropic Claude 协议',
    value: 'anthropic',
  },
  {
    description: '适用于 Gemini generateContent 兼容的文本模型接口。',
    label: 'Gemini generateContent 协议',
    value: 'gemini-generate-content',
  },
] as const;
const imageProtocolOptions = [
  {
    description: '适用于 Gemini generateContent 兼容的图片生成接口。',
    label: 'Google generateContent 图片协议',
    value: 'google-generate-content',
  },
] as const;
const form = reactive<Record<string, any>>({
  api_base_url: '',
  api_key: '',
  config_type: 'outline',
  is_default: false,
  is_enabled: true,
  model_name: '',
  provider: 'openai-compatible',
  remark: '',
});
const currentUsage = computed(() =>
  usageOptions.find((item) => item.value === form.config_type),
);
const protocolOptions = computed(() =>
  {
    const options =
      form.config_type === 'figure'
        ? [...imageProtocolOptions]
        : [...textProtocolOptions];
    if (
      form.provider &&
      !options.some((item) => item.value === form.provider)
    ) {
      return [
        {
          description: '已有配置中的自定义协议或服务商标识。',
          label: `自定义协议：${form.provider}`,
          value: form.provider,
        },
        ...options,
      ];
    }
    return options;
  },
);

function getUsageOption(value: string) {
  return usageOptions.find((item) => item.value === value);
}

function getUsageLabel(value: string) {
  return getUsageOption(value)?.label ?? value;
}

function getUsageDescription(value: string) {
  return getUsageOption(value)?.description ?? '';
}

function getProtocolOption(value: string) {
  return [...textProtocolOptions, ...imageProtocolOptions].find(
    (item) => item.value === value,
  );
}

function getProtocolLabel(value: string) {
  return getProtocolOption(value)?.label ?? `自定义协议：${value}`;
}

function getProtocolDescription(value: string) {
  return getProtocolOption(value)?.description ?? '已有配置中的自定义协议或服务商标识。';
}

function resetForm() {
  Object.assign(form, {
    api_base_url: '',
    api_key: '',
    config_type: 'outline',
    is_default: false,
    is_enabled: true,
    model_name: '',
    provider: 'openai-compatible',
    remark: '',
  });
}

function handleUsageChange(value: string) {
  if (value === 'figure') {
    form.provider = 'google-generate-content';
    return;
  }
  if (!textProtocolOptions.some((item) => item.value === form.provider)) {
    form.provider = 'openai-compatible';
  }
}

async function fetchConfigs() {
  loading.value = true;
  try {
    configs.value = await listModelConfigs();
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = undefined;
  resetForm();
  open.value = true;
}

function openEdit(item: ModelConfig) {
  editing.value = item;
  Object.assign(form, item, { api_key: '' });
  open.value = true;
}

async function saveConfig() {
  if (!form.config_type || !form.provider || !form.model_name || !form.api_base_url) {
    message.warning('请填写用途、调用协议、模型名称和 Base URL');
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

onMounted(fetchConfigs);
</script>

<template>
  <Page
    content-class="space-y-4"
    description=""
    title=""
  >
    <a-card title="模型配置">
      <template #extra>
        <a-space>
          <a-button :loading="loading" @click="fetchConfigs">刷新</a-button>
          <a-button type="primary" @click="openCreate">新增配置</a-button>
        </a-space>
      </template>
      <a-alert
        class="mb-4"
        show-icon
        type="info"
        message="API Key 仅允许写入，查询时只展示脱敏值"
      />
      <a-table
        row-key="id"
        :columns="[
          { title: '用途', dataIndex: 'config_type' },
          { title: '调用协议', dataIndex: 'provider' },
          { title: '模型', dataIndex: 'model_name' },
          { title: 'Base URL', dataIndex: 'api_base_url' },
          { title: 'Key', dataIndex: 'masked_api_key' },
          { title: '启用', dataIndex: 'is_enabled' },
          { title: '默认', dataIndex: 'is_default' },
          { title: '操作', key: 'action', fixed: 'right', width: 150 },
        ]"
        :data-source="configs"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 1280 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'config_type'">
            <a-tooltip :title="getUsageDescription(record.config_type)">
              <a-tag color="blue">{{ getUsageLabel(record.config_type) }}</a-tag>
            </a-tooltip>
          </template>
          <template v-if="column.dataIndex === 'provider'">
            <a-tooltip :title="getProtocolDescription(record.provider)">
              <a-tag color="cyan">{{ getProtocolLabel(record.provider) }}</a-tag>
            </a-tooltip>
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
              <a-button size="small" @click="openEdit(record)">编辑</a-button>
              <a-button size="small" danger @click="removeConfig(record)">删除</a-button>
            </a-space>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="暂无模型配置，请先新增一个可用模型" />
        </template>
      </a-table>
    </a-card>

    <a-modal v-model:open="open" width="720px" title="模型配置" @ok="saveConfig">
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="用途">
              <a-select
                v-model:value="form.config_type"
                :options="usageOptions"
                @change="handleUsageChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="调用协议">
              <a-select
                v-model:value="form.provider"
                :options="protocolOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-alert
              :message="currentUsage?.description"
              show-icon
              type="info"
            />
          </a-col>
          <a-col :span="12"><a-form-item label="模型名称"><a-input v-model:value="form.model_name" placeholder="例如 gpt-4.1、claude-sonnet、gemini-3-pro-image-preview" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Base URL"><a-input v-model:value="form.api_base_url" placeholder="填写对应服务商的 API Base URL" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="API Key"><a-input-password v-model:value="form.api_key" placeholder="编辑时留空表示不修改" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="启用"><a-switch v-model:checked="form.is_enabled" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="默认"><a-switch v-model:checked="form.is_default" /></a-form-item></a-col>
          <a-col :span="24"><a-form-item label="备注"><a-textarea v-model:value="form.remark" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </Page>
</template>
