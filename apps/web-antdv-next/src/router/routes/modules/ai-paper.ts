import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:file-text',
      order: -10,
      title: '论文工作台',
    },
    name: 'PaperWorkspace',
    path: '/paper',
    children: [
      {
        component: () => import('#/views/paper/generate/index.vue'),
        meta: {
          affixTab: true,
          icon: 'lucide:sparkles',
          title: 'AI 论文生成',
        },
        name: 'PaperGenerate',
        path: '/paper/generate',
      },
      {
        component: () => import('#/views/paper/orders/index.vue'),
        meta: {
          icon: 'lucide:receipt-text',
          title: '我的订单',
        },
        name: 'PaperOrders',
        path: '/paper/orders',
      },
      {
        component: () => import('#/views/paper/points/index.vue'),
        meta: {
          icon: 'lucide:coins',
          title: '积分与 Token',
        },
        name: 'PaperPoints',
        path: '/paper/points',
      },
      {
        component: () => import('#/views/paper/docs/index.vue'),
        meta: {
          icon: 'lucide:book-open',
          title: '使用文档',
        },
        name: 'PaperDocs',
        path: '/paper/docs',
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:shield-check',
      order: -9,
      roles: ['admin'],
      title: '管理后台',
    },
    name: 'Admin',
    path: '/admin',
    children: [
      {
        component: () => import('#/views/admin/overview/index.vue'),
        meta: {
          icon: 'lucide:gauge',
          roles: ['admin'],
          title: '运营总览',
        },
        name: 'AdminOverview',
        path: '/admin/overview',
      },
      {
        component: () => import('#/views/admin/users/index.vue'),
        meta: {
          icon: 'lucide:users',
          roles: ['admin'],
          title: '用户管理',
        },
        name: 'AdminUsers',
        path: '/admin/users',
      },
      {
        component: () => import('#/views/admin/orders/index.vue'),
        meta: {
          icon: 'lucide:list-checks',
          roles: ['admin'],
          title: '订单任务',
        },
        name: 'AdminOrders',
        path: '/admin/orders',
      },
      {
        component: () => import('#/views/admin/recharges/index.vue'),
        meta: {
          icon: 'lucide:badge-dollar-sign',
          roles: ['admin'],
          title: '充值审核',
        },
        name: 'AdminRecharges',
        path: '/admin/recharges',
      },
      {
        component: () => import('#/views/admin/model-configs/index.vue'),
        meta: {
          icon: 'lucide:brain-circuit',
          roles: ['admin'],
          title: '模型配置',
        },
        name: 'AdminModelConfigs',
        path: '/admin/model-configs',
      },
      {
        component: () => import('#/views/admin/logs/index.vue'),
        meta: {
          icon: 'lucide:scroll-text',
          roles: ['admin'],
          title: '日志审计',
        },
        name: 'AdminLogs',
        path: '/admin/logs',
      },
    ],
  },
];

export default routes;
