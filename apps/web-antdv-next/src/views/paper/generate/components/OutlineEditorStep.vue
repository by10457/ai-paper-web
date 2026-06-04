<script lang="ts" setup>
import type { PaperOutlineChapter } from './types';

import { IconifyIcon } from '@vben/icons';

defineProps<{
  abstractText: string;
  chapterCount: number;
  keywords: string;
  loading: boolean;
  outline: PaperOutlineChapter[];
  outlineRecordId?: number;
  sectionCount: number;
}>();

defineEmits<{
  addChapter: [];
  addSection: [chapter: PaperOutlineChapter];
  back: [];
  generate: [];
  removeChapter: [index: number];
  removeSection: [chapter: PaperOutlineChapter, sectionIndex: number];
}>();
</script>

<template>
  <section class="outline-layout">
    <aside class="outline-aside">
      <div class="section-kicker">STEP 02</div>
      <h2>编辑大纲</h2>
      <div class="metric-list">
        <div>
          <span>大纲记录</span>
          <strong>{{ outlineRecordId || '-' }}</strong>
        </div>
        <div>
          <span>章节</span>
          <strong>{{ chapterCount }}</strong>
        </div>
        <div>
          <span>小节</span>
          <strong>{{ sectionCount }}</strong>
        </div>
      </div>
      <div v-if="keywords || abstractText" class="summary-panel">
        <span>{{ keywords ? `关键词：${keywords}` : '大纲摘要' }}</span>
        <p>{{ abstractText || '可继续调整大纲后生成论文。' }}</p>
      </div>
    </aside>

    <main class="outline-main">
      <div class="toolbar">
        <div>
          <h3>论文结构</h3>
          <span>确认章节层级和每节写作要点</span>
        </div>
        <a-space wrap>
          <a-button @click="$emit('back')">
            <template #icon>
              <IconifyIcon icon="lucide:arrow-left" />
            </template>
            返回配置
          </a-button>
          <a-button @click="$emit('addChapter')">
            <template #icon>
              <IconifyIcon icon="lucide:plus" />
            </template>
            添加章节
          </a-button>
          <a-button type="primary" :loading="loading" @click="$emit('generate')">
            <template #icon>
              <IconifyIcon icon="lucide:file-check-2" />
            </template>
            确认生成论文
          </a-button>
        </a-space>
      </div>

      <div class="outline-list">
        <div
          v-for="(chapter, chapterIndex) in outline"
          :key="chapterIndex"
          class="outline-item"
        >
          <div class="outline-item__header">
            <div class="chapter-index">{{ String(chapterIndex + 1).padStart(2, '0') }}</div>
            <a-input
              v-model:value="chapter.chapter"
              class="outline-title-input"
              :placeholder="`第 ${chapterIndex + 1} 章标题`"
            />
            <a-space>
              <a-button size="small" @click="$emit('addSection', chapter)">
                <template #icon>
                  <IconifyIcon icon="lucide:list-plus" />
                </template>
                小节
              </a-button>
              <a-button
                danger
                size="small"
                :disabled="outline.length <= 1"
                @click="$emit('removeChapter', chapterIndex)"
              >
                <template #icon>
                  <IconifyIcon icon="lucide:trash-2" />
                </template>
              </a-button>
            </a-space>
          </div>

          <div
            v-for="(section, sectionIndex) in chapter.sections"
            :key="sectionIndex"
            class="section-item"
          >
            <div class="section-item__title">
              <span>{{ chapterIndex + 1 }}.{{ sectionIndex + 1 }}</span>
              <a-input
                v-model:value="section.name"
                :placeholder="`${chapterIndex + 1}.${sectionIndex + 1} 小节标题`"
              />
              <a-button
                danger
                size="small"
                :disabled="chapter.sections.length <= 1"
                @click="$emit('removeSection', chapter, sectionIndex)"
              >
                <template #icon>
                  <IconifyIcon icon="lucide:x" />
                </template>
              </a-button>
            </div>
            <a-textarea
              v-model:value="section.abstract"
              :rows="2"
              placeholder="本节写作要点"
            />
          </div>
        </div>
      </div>
    </main>
  </section>
</template>

<style scoped>
.outline-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;
}

.outline-aside,
.outline-main {
  min-width: 0;
  background: rgb(255 255 255 / 92%);
  border: 1px solid rgb(174 211 224 / 62%);
  border-radius: 8px;
  box-shadow: 0 20px 52px rgb(38 102 138 / 9%);
}

.outline-aside {
  align-self: start;
  padding: 26px;
}

.section-kicker {
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 700;
  color: #0aa895;
  letter-spacing: 0;
}

h2,
h3,
p {
  margin: 0;
}

h2 {
  font-size: 26px;
  font-weight: 700;
  color: #13243a;
}

.metric-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 24px;
}

.metric-list > div {
  padding: 12px;
  background: #f6fbfd;
  border: 1px solid rgb(174 211 224 / 58%);
  border-radius: 8px;
}

.metric-list span,
.summary-panel span {
  display: block;
  font-size: 12px;
  color: #708497;
}

.metric-list strong {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 18px;
  color: #14324a;
  white-space: nowrap;
}

.summary-panel {
  padding: 16px;
  margin-top: 18px;
  background: linear-gradient(135deg, #f1fffc, #f5f9ff);
  border: 1px solid rgb(92 199 210 / 22%);
  border-radius: 8px;
}

.summary-panel p {
  margin-top: 8px;
  line-height: 1.8;
  color: #5f7388;
}

.outline-main {
  padding: 24px;
}

.toolbar {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 18px;
  border-bottom: 1px solid rgb(174 211 224 / 52%);
}

.toolbar h3 {
  font-size: 20px;
  font-weight: 700;
  color: #13243a;
}

.toolbar span {
  display: block;
  margin-top: 4px;
  color: #708497;
}

.outline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 18px;
}

.outline-item {
  padding: 16px;
  background: #f7fbfd;
  border: 1px solid rgb(174 211 224 / 58%);
  border-radius: 8px;
}

.outline-item__header {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.chapter-index {
  display: grid;
  place-items: center;
  width: 44px;
  height: 36px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #14b8a6, #4f7cff);
  border-radius: 8px;
}

.section-item {
  padding: 12px;
  margin-top: 10px;
  background: rgb(255 255 255 / 92%);
  border: 1px solid rgb(215 228 235 / 72%);
  border-radius: 8px;
}

.section-item__title {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.section-item__title > span {
  font-weight: 700;
  color: #52708b;
}

@media (max-width: 1180px) {
  .outline-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .outline-aside,
  .outline-main {
    padding: 18px;
  }

  .metric-list {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .outline-item__header {
    grid-template-columns: 1fr;
  }

  .toolbar {
    display: grid;
  }

  .section-item__title {
    grid-template-columns: 1fr;
  }
}
</style>
