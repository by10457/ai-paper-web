<script lang="ts" setup>
import type { AdminUser, AdminUserDetail } from '#/api';

import { onMounted, reactive, ref } from 'vue';

import { confirm, Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { message } from 'antdv-next';
import dayjs from 'dayjs';

import {
  adjustUserPoints,
  createAdminUser,
  getAdminUserDetail,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '#/api';

const users = ref<AdminUser[]>([]);
const total = ref(0);
const page = ref(1);
const keyword = ref('');
const loading = ref(false);
const createOpen = ref(false);
const createPasswordVisible = ref(false);
const detailOpen = ref(false);
const editOpen = ref(false);
const resetPasswordVisible = ref(false);
const passwordOpen = ref(false);
const pointOpen = ref(false);
const currentUser = ref<AdminUser>();
const userDetail = ref<AdminUserDetail>();
const form = reactive({
  initial_points: 0,
  nickname: '',
  password: '',
  role: 'user' as 'admin' | 'user',
  username: '',
});
const editForm = reactive({
  email: '',
  is_disabled: false,
  nickname: '',
});
const passwordForm = reactive({ password: '' });
const pointForm = reactive({ delta: 0, reason: '' });
const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s@]*\.[^\s@]+$/;
const AUTO_EMAIL_SUFFIX = '@auto.ai-paper.local';

function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

function isAutoEmail(value?: null | string) {
  return Boolean(value?.endsWith(AUTO_EMAIL_SUFFIX));
}

function formatUserEmail(value?: null | string) {
  if (!value || isAutoEmail(value)) return '未填写';
  return value;
}

function formatMinuteTime(value?: null | string) {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

async function fetchUsers() {
  loading.value = true;
  try {
    const res = await listAdminUsers({
      keyword: keyword.value || undefined,
      page: page.value,
      page_size: 10,
    });
    users.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  const username = form.username.trim();
  const nickname = form.nickname.trim();
  if (username.length < 2) {
    message.warning('用户名至少 2 个字符');
    return;
  }
  if (form.password.length < 8) {
    message.warning('密码至少 8 位');
    return;
  }

  await createAdminUser({
    initial_points: form.initial_points,
    nickname,
    password: form.password,
    role: form.role,
    username,
  });
  message.success('用户已创建');
  createOpen.value = false;
  Object.assign(form, {
    initial_points: 0,
    nickname: '',
    password: '',
    role: 'user',
    username: '',
  });
  createPasswordVisible.value = false;
  await fetchUsers();
}

async function toggleDisabled(user: AdminUser) {
  try {
    await confirm({
      content: `确认${user.is_disabled ? '启用' : '禁用'}用户 ${user.username}？`,
      icon: 'question',
      title: '更新账号状态',
    });
  } catch {
    return;
  }
  await updateAdminUser(user.id, { is_disabled: !user.is_disabled });
  message.success('状态已更新');
  await fetchUsers();
}

function openPoint(user: AdminUser) {
  currentUser.value = user;
  pointForm.delta = 0;
  pointForm.reason = '';
  pointOpen.value = true;
}

async function openDetail(user: AdminUser) {
  currentUser.value = user;
  userDetail.value = await getAdminUserDetail(user.id);
  detailOpen.value = true;
}

function openEdit(user: AdminUser) {
  currentUser.value = user;
  Object.assign(editForm, {
    email: isAutoEmail(user.email) ? '' : user.email,
    is_disabled: user.is_disabled,
    nickname: user.nickname || '',
  });
  editOpen.value = true;
}

async function handleEdit() {
  if (!currentUser.value) return;
  const email = editForm.email.trim();
  if (email && !isValidEmail(email)) {
    message.warning('请输入有效的邮箱地址');
    return;
  }
  const updateData: Partial<Pick<AdminUser, 'email' | 'is_disabled' | 'nickname'>> = {
    is_disabled: editForm.is_disabled,
    nickname: editForm.nickname.trim(),
  };
  if (email) {
    updateData.email = email;
  }
  await updateAdminUser(currentUser.value.id, updateData);
  message.success('用户资料已更新');
  editOpen.value = false;
  await fetchUsers();
  if (detailOpen.value && currentUser.value) {
    userDetail.value = await getAdminUserDetail(currentUser.value.id);
  }
}

function openResetPassword(user: AdminUser) {
  currentUser.value = user;
  passwordForm.password = '';
  resetPasswordVisible.value = false;
  passwordOpen.value = true;
}

async function handleResetPassword() {
  if (!currentUser.value) return;
  if (passwordForm.password.length < 8) {
    message.warning('密码至少 8 位');
    return;
  }
  await resetAdminUserPassword(currentUser.value.id, passwordForm.password);
  message.success('密码已重置');
  passwordOpen.value = false;
}

async function handleAdjustPoints() {
  if (!currentUser.value) return;
  if (pointForm.delta <= 0 || !pointForm.reason.trim()) {
    message.warning('请填写积分增加数量和原因');
    return;
  }
  await adjustUserPoints(currentUser.value.id, pointForm);
  message.success('积分已增加');
  pointOpen.value = false;
  await fetchUsers();
}

onMounted(fetchUsers);
</script>

<template>
  <Page
    content-class="space-y-4"
    description=""
    title=""
  >
    <a-card title="用户管理">
      <template #extra>
        <a-space wrap>
          <a-input-search v-model:value="keyword" placeholder="用户名/邮箱/昵称" @search="() => { page = 1; fetchUsers(); }" />
          <a-button :loading="loading" @click="fetchUsers">刷新</a-button>
          <a-button type="primary" @click="createOpen = true">创建用户</a-button>
        </a-space>
      </template>
      <a-table
        row-key="id"
        :columns="[
          { title: 'ID', dataIndex: 'id' },
          { title: '用户名', dataIndex: 'username' },
          { title: '邮箱', dataIndex: 'email' },
          { title: '积分', dataIndex: 'points' },
          { title: '角色', dataIndex: 'role' },
          { title: '状态', dataIndex: 'is_disabled' },
          { title: '操作', key: 'action' },
        ]"
        :data-source="users"
        :loading="loading"
        :pagination="{ current: page, total, pageSize: 10 }"
        :scroll="{ x: 980 }"
        @change="(pagination:any) => { page = pagination.current; fetchUsers(); }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'role'">
            <a-tag :color="record.role === 'admin' ? 'blue' : 'default'">
              {{ record.role === 'admin' ? '管理员' : '普通用户' }}
            </a-tag>
          </template>
          <template v-if="column.dataIndex === 'email'">
            {{ formatUserEmail(record.email) }}
          </template>
          <template v-if="column.dataIndex === 'is_disabled'">
            <a-tag :color="record.is_disabled ? 'red' : 'green'">{{ record.is_disabled ? '禁用' : '正常' }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space wrap>
              <a-button size="small" @click="openDetail(record)">详情</a-button>
              <a-button size="small" @click="openEdit(record)">编辑</a-button>
              <a-button size="small" @click="openResetPassword(record)">重置密码</a-button>
              <a-button size="small" @click="openPoint(record)">增加积分</a-button>
              <a-button size="small" danger @click="toggleDisabled(record)">{{ record.is_disabled ? '启用' : '禁用' }}</a-button>
            </a-space>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="暂无用户数据" />
        </template>
      </a-table>
    </a-card>

    <a-modal v-model:open="createOpen" title="创建用户" @ok="handleCreate">
      <a-form autocomplete="off" layout="vertical">
        <a-form-item label="用户名">
          <a-input
            v-model:value="form.username"
            autocomplete="off"
            name="admin-created-account-name"
          />
        </a-form-item>
        <a-form-item label="密码">
          <a-input
            v-model:value="form.password"
            autocomplete="off"
            name="admin-created-temporary-secret"
            :type="createPasswordVisible ? 'text' : 'password'"
          >
            <template #suffix>
              <a-button
                type="text"
                size="small"
                tabindex="-1"
                @click="createPasswordVisible = !createPasswordVisible"
              >
                <template #icon>
                  <IconifyIcon :icon="createPasswordVisible ? 'lucide:eye-off' : 'lucide:eye'" />
                </template>
              </a-button>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item label="昵称"><a-input v-model:value="form.nickname" /></a-form-item>
        <a-form-item label="初始积分"><a-input-number v-model:value="form.initial_points" class="w-full" :min="0" /></a-form-item>
        <a-form-item label="角色"><a-select v-model:value="form.role" :options="[{value:'user',label:'普通用户'},{value:'admin',label:'管理员'}]" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="editOpen" title="编辑用户" @ok="handleEdit">
      <a-form layout="vertical">
        <a-form-item label="昵称"><a-input v-model:value="editForm.nickname" /></a-form-item>
        <a-form-item label="邮箱"><a-input v-model:value="editForm.email" placeholder="可选" /></a-form-item>
        <a-form-item label="账号状态">
          <a-switch
            v-model:checked="editForm.is_disabled"
            checked-children="禁用"
            un-checked-children="正常"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="passwordOpen" title="重置密码" @ok="handleResetPassword">
      <a-form autocomplete="off" layout="vertical">
        <a-alert
          v-if="currentUser"
          class="mb-4"
          show-icon
          type="warning"
          :message="`将重置用户 ${currentUser.username} 的登录密码`"
        />
        <a-form-item label="新密码">
          <a-input
            v-model:value="passwordForm.password"
            autocomplete="off"
            name="admin-reset-temporary-password"
            :type="resetPasswordVisible ? 'text' : 'password'"
            placeholder="至少 8 位"
          >
            <template #suffix>
              <a-button
                type="text"
                size="small"
                tabindex="-1"
                @click="resetPasswordVisible = !resetPasswordVisible"
              >
                <template #icon>
                  <IconifyIcon :icon="resetPasswordVisible ? 'lucide:eye-off' : 'lucide:eye'" />
                </template>
              </a-button>
            </template>
          </a-input>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="pointOpen" title="增加积分" @ok="handleAdjustPoints">
      <a-form layout="vertical">
        <a-alert
          v-if="currentUser"
          class="mb-4"
          show-icon
          type="info"
          :message="`当前用户：${currentUser.username}，当前积分：${currentUser.points}`"
        />
        <a-form-item label="积分增加">
          <a-input-number v-model:value="pointForm.delta" class="w-full" :min="1" :precision="0" />
        </a-form-item>
        <a-form-item label="原因"><a-textarea v-model:value="pointForm.reason" /></a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:open="detailOpen"
      width="760"
      title="用户详情"
      @close="userDetail = undefined"
    >
      <template v-if="userDetail">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="用户 ID">{{ userDetail.user.id }}</a-descriptions-item>
          <a-descriptions-item label="用户名">{{ userDetail.user.username }}</a-descriptions-item>
          <a-descriptions-item label="昵称">{{ userDetail.user.nickname || '-' }}</a-descriptions-item>
          <a-descriptions-item label="邮箱">{{ formatUserEmail(userDetail.user.email) }}</a-descriptions-item>
          <a-descriptions-item label="角色">
            <a-tag :color="userDetail.user.role === 'admin' ? 'blue' : 'default'">
              {{ userDetail.user.role === 'admin' ? '管理员' : '普通用户' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="userDetail.user.is_disabled ? 'red' : 'green'">
              {{ userDetail.user.is_disabled ? '禁用' : '正常' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="积分">{{ userDetail.user.points }}</a-descriptions-item>
          <a-descriptions-item label="订单数">{{ userDetail.order_count }}</a-descriptions-item>
          <a-descriptions-item label="注册时间">{{ userDetail.user.created_at }}</a-descriptions-item>
          <a-descriptions-item label="Token 调用">{{ userDetail.api_token.call_count }}</a-descriptions-item>
          <a-descriptions-item label="Token">
            {{ userDetail.api_token.masked_token || '未生成' }}
          </a-descriptions-item>
          <a-descriptions-item label="最近调用">
            {{ userDetail.api_token.last_used_at || '-' }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider>最近积分流水</a-divider>
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
          :data-source="userDetail.point_ledgers"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'delta'">
              <a-tag :color="record.delta >= 0 ? 'green' : 'red'">
                {{ record.delta >= 0 ? '+' : '' }}{{ record.delta }}
              </a-tag>
            </template>
            <template v-if="column.dataIndex === 'created_at'">
              {{ formatMinuteTime(record.created_at) }}
            </template>
          </template>
          <template #emptyText>
            <a-empty description="暂无积分流水" />
          </template>
        </a-table>
      </template>
    </a-drawer>
  </Page>
</template>
