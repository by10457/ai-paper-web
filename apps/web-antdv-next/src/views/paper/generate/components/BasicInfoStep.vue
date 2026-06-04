<script lang="ts" setup>
import type { GenerateFormState, SelectOption } from './types';

import { IconifyIcon } from '@vben/icons';

const props = defineProps<{
  codeTypeOptions: SelectOption[];
  form: GenerateFormState;
  loading: boolean;
  progress: number;
  quoteOptions: SelectOption[];
  yesNoOptions: SelectOption[];
}>();

const emit = defineEmits<{
  change: [patch: Partial<GenerateFormState>];
  generate: [];
}>();

function updateForm(patch: Partial<GenerateFormState>) {
  emit('change', patch);
}

function updateTitle(value: string) {
  updateForm({ title: value });
}

function updateTargetWordCount(value: null | number) {
  updateForm({ target_word_count: value ?? props.form.target_word_count });
}

function updateReferenceCount(value: null | number) {
  updateForm({ wxnum: value ?? props.form.wxnum });
}

function updateCodeType(value: string) {
  updateForm({ codetype: value });
}

function updateQuoteType(value: string) {
  updateForm({ wxquote: value });
}

function updateLanguage(value: string) {
  updateForm({ language: value });
}

function updateThreeLevel(checked: boolean) {
  updateForm({ three_level: checked });
}

function updateAboutMessage(value: string) {
  updateForm({ about_msg: value });
}
</script>

<template>
  <section class="step-grid">
    <div class="step-panel step-panel--primary">
      <div class="section-kicker">STEP 01</div>
      <h2>填写基本信息生成大纲</h2>
      <p>输入论文主题后，系统会先生成可编辑的大纲结构。</p>

      <div class="console-panel">
        <div class="console-head">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="console-line">
          <span>mode</span>
          <strong>outline_planning</strong>
        </div>
        <div class="console-line">
          <span>target</span>
          <strong>{{ form.target_word_count }} words</strong>
        </div>
        <div class="console-line">
          <span>references</span>
          <strong>{{ form.wxnum }}</strong>
        </div>
        <div class="console-flow">
          <i></i>
          <i></i>
          <i></i>
        </div>
      </div>
    </div>

    <div class="step-panel form-panel">
      <a-form layout="vertical">
        <a-form-item label="论文题目" required>
          <a-input
            :value="form.title"
            size="large"
            placeholder="例如：基于深度学习的图像识别技术研究"
            @update:value="updateTitle"
          />
        </a-form-item>

        <div class="form-grid">
          <a-form-item label="目标字数">
            <a-input-number
              :value="form.target_word_count"
              class="full-input"
              :min="3000"
              :step="1000"
              @update:value="updateTargetWordCount"
            />
          </a-form-item>
          <a-form-item label="参考文献数量">
            <a-input-number
              :value="form.wxnum"
              class="full-input"
              :max="80"
              :min="5"
              @update:value="updateReferenceCount"
            />
          </a-form-item>
          <a-form-item label="代码语言">
            <a-select
              :value="form.codetype"
              :options="codeTypeOptions"
              @update:value="updateCodeType"
            />
          </a-form-item>
          <a-form-item label="文献标注">
            <a-select
              :value="form.wxquote"
              :options="quoteOptions"
              @update:value="updateQuoteType"
            />
          </a-form-item>
          <a-form-item label="外文文献">
            <a-select
              :value="form.language"
              :options="yesNoOptions"
              @update:value="updateLanguage"
            />
          </a-form-item>
          <a-form-item label="三级大纲">
            <div class="switch-row">
              <a-switch
                :checked="form.three_level"
                @update:checked="updateThreeLevel"
              />
              <span>{{ form.three_level ? '开启' : '关闭' }}</span>
            </div>
          </a-form-item>
        </div>

        <a-form-item label="写作方向补充">
          <a-textarea
            :value="form.about_msg"
            :rows="5"
            placeholder="可填写研究对象、技术路线、学校格式要求等"
            @update:value="updateAboutMessage"
          />
        </a-form-item>

        <div v-if="loading" class="progress-block">
          <div class="progress-copy">
            <span>AI 正在规划论文结构</span>
            <strong>{{ progress }}%</strong>
          </div>
          <a-progress :percent="progress" :show-info="false" status="active" />
        </div>

        <div class="form-actions">
          <a-button size="large" type="primary" :loading="loading" @click="$emit('generate')">
            <template #icon>
              <IconifyIcon icon="lucide:sparkles" />
            </template>
            {{ loading ? '正在生成大纲' : '生成免费大纲' }}
          </a-button>
        </div>
      </a-form>
    </div>
  </section>
</template>

<style scoped>
.step-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(520px, 1.4fr);
  gap: 24px;
}

.step-panel {
  min-width: 0;
  padding: 28px;
  background: rgb(255 255 255 / 88%);
  border: 1px solid rgb(174 211 224 / 58%);
  border-radius: 8px;
  box-shadow: 0 20px 52px rgb(38 102 138 / 10%);
}

.step-panel--primary {
  position: relative;
  overflow: hidden;
  color: #13243a;
  background:
    radial-gradient(circle at 82% 0%, rgb(91 123 255 / 16%), transparent 34%),
    linear-gradient(135deg, rgb(236 255 251 / 96%), rgb(242 248 255 / 92%)),
    linear-gradient(90deg, rgb(18 159 178 / 10%) 1px, transparent 1px),
    linear-gradient(0deg, rgb(18 159 178 / 7%) 1px, transparent 1px);
  background-size:
    auto,
    auto,
    30px 30px,
    30px 30px;
  border-color: rgb(51 185 200 / 24%);
}

.form-panel {
  background: rgb(255 255 255 / 94%);
  border-color: rgb(174 211 224 / 66%);
}

.form-panel :deep(.ant-form-item-label > label) {
  color: #314458;
}

.form-panel :deep(.ant-input),
.form-panel :deep(.ant-input-number),
.form-panel :deep(.ant-select-selector),
.form-panel :deep(.ant-input-affix-wrapper),
.form-panel :deep(textarea.ant-input) {
  color: #1f2d3d;
  background: #fff !important;
  border-color: rgb(183 207 220 / 92%) !important;
  box-shadow: none !important;
}

.form-panel :deep(.ant-input::placeholder),
.form-panel :deep(textarea.ant-input::placeholder) {
  color: #94a3b4;
}

.form-panel :deep(.ant-select-selection-item),
.form-panel :deep(.ant-input-number-input) {
  color: #1f2d3d;
}

.form-panel :deep(.ant-select-arrow),
.form-panel :deep(.ant-input-number-handler-wrap) {
  color: #74889c;
  background: transparent;
}

.form-panel :deep(.ant-switch) {
  background: #c5d1dc;
}

.form-panel :deep(.ant-switch-checked) {
  background: #13c2c2;
}

.section-kicker {
  margin-bottom: 18px;
  font-size: 12px;
  font-weight: 700;
  color: #0aa895;
  letter-spacing: 0;
}

h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.25;
}

p {
  margin: 14px 0 0;
  line-height: 1.8;
  color: #5f7388;
}

.console-panel {
  padding: 16px;
  margin-top: 34px;
  background: rgb(255 255 255 / 78%);
  border: 1px solid rgb(92 199 210 / 24%);
  border-radius: 8px;
  box-shadow: 0 18px 44px rgb(32 118 145 / 10%);
}

.console-head {
  display: flex;
  gap: 7px;
  margin-bottom: 18px;
}

.console-head span {
  width: 8px;
  height: 8px;
  background: #58efd4;
  border-radius: 50%;
}

.console-head span:nth-child(2) {
  background: #9f8cff;
}

.console-head span:nth-child(3) {
  background: #f5c16c;
}

.console-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgb(156 191 207 / 22%);
}

.console-line span {
  color: #708497;
}

.console-line strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  color: #15344a;
}

.console-flow {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-top: 16px;
}

.console-flow i {
  display: block;
  height: 6px;
  background: linear-gradient(90deg, #54f0d2, #7f73ff);
  border-radius: 999px;
}

.console-flow i:nth-child(2) {
  opacity: 0.72;
}

.console-flow i:nth-child(3) {
  opacity: 0.48;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 16px;
}

.full-input {
  width: 100%;
}

.switch-row {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 32px;
  color: #4f6478;
}

.progress-block {
  padding: 14px 16px;
  margin-top: 8px;
  background: #f4fcff;
  border: 1px solid rgb(92 199 210 / 22%);
  border-radius: 8px;
}

.progress-copy {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #315469;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

@media (max-width: 1180px) {
  .step-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .step-panel {
    padding: 18px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  h2 {
    font-size: 24px;
  }

  .form-actions :deep(.ant-btn) {
    width: 100%;
  }
}
</style>
