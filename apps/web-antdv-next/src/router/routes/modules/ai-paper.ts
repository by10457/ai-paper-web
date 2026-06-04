import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      hideInMenu: true,
      title: '论文工作台',
    },
    name: 'PaperWorkspace',
    path: '/paper',
    redirect: '/paper/generate',
  },
  {
    component: () => import('#/views/paper/generate/index.vue'),
    meta: {
      affixTab: true,
      icon: 'lucide:sparkles',
      order: -13,
      title: 'AI 论文',
    },
    name: 'PaperGenerate',
    path: '/paper/generate',
  },
  {
    component: () => import('#/views/paper/orders/index.vue'),
    meta: {
      icon: 'lucide:receipt-text',
      order: -12,
      title: '我的订单',
    },
    name: 'PaperOrders',
    path: '/paper/orders',
  },
  {
    component: () => import('#/views/paper/docs/index.vue'),
    meta: {
      icon: 'lucide:book-open',
      order: -11,
      title: '使用文档',
    },
    name: 'PaperDocs',
    path: '/paper/docs',
  },
  {
    meta: {
      authority: ['admin'],
      icon: 'lucide:shield-check',
      order: -9,
      title: '管理后台',
    },
    name: 'Admin',
    path: '/admin',
    children: [
      {
        component: () => import('#/views/admin/overview/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:gauge',
          title: '运营总览',
        },
        name: 'AdminOverview',
        path: '/admin/overview',
      },
      {
        component: () => import('#/views/admin/users/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:users',
          title: '用户管理',
        },
        name: 'AdminUsers',
        path: '/admin/users',
      },
      {
        component: () => import('#/views/admin/orders/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:list-checks',
          title: '订单任务',
        },
        name: 'AdminOrders',
        path: '/admin/orders',
      },
      {
        component: () => import('#/views/admin/model-configs/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:brain-circuit',
          title: '模型配置',
        },
        name: 'AdminModelConfigs',
        path: '/admin/model-configs',
      },
      {
        component: () => import('#/views/admin/logs/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:scroll-text',
          title: '日志审计',
        },
        name: 'AdminLogs',
        path: '/admin/logs',
      },
    ],
  },
];

export default routes;
