<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { BasicOption } from '@vben/types';

import { computed, nextTick, onMounted, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

interface LoginAccountOption extends BasicOption {
  password: string;
  username: string;
}

const loginRef = ref<InstanceType<typeof AuthenticationLogin>>();

const LOGIN_ACCOUNT_OPTIONS: LoginAccountOption[] = [
  {
    label: 'admin',
    password: 'demo123456',
    username: 'admin',
    value: 'admin',
  },
  {
    label: 'by10457',
    password: 'demo123456',
    username: 'by10457',
    value: 'by10457',
  },
];

function getLoginAccount(value: string) {
  return (
    LOGIN_ACCOUNT_OPTIONS.find((item) => item.value === value) ??
    LOGIN_ACCOUNT_OPTIONS[0]!
  );
}

function fillAccount(value: string) {
  const account = getLoginAccount(value);
  loginRef.value?.getFormApi().setValues({
    password: account.password,
    selectAccount: account.value,
    username: account.username,
  });
}

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenSelect',
      componentProps: {
        options: LOGIN_ACCOUNT_OPTIONS.map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('authentication.selectAccount'),
      },
      fieldName: 'selectAccount',
      label: $t('authentication.selectAccount'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.selectAccount') })
        .optional()
        .default('admin'),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
        readonly: true,
      },
      dependencies: {
        trigger(values, form) {
          if (values.selectAccount) {
            const account = getLoginAccount(values.selectAccount);
            form.setValues({
              password: account.password,
              username: account.username,
            });
          }
        },
        triggerFields: ['selectAccount'],
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.usernameTip') })
        .default('admin'),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
        readonly: true,
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.passwordTip') })
        .default('demo123456'),
    },
  ];
});

onMounted(async () => {
  await nextTick();
  fillAccount('admin');
});
</script>

<template>
  <AuthenticationLogin
    ref="loginRef"
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-remember-me="false"
    :show-third-party-login="false"
    @submit="authStore.authLogin"
  />
</template>
