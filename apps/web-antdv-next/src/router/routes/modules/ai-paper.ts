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
    meta: {
      hideInMenu: true,
      title: '论文材料生成兼容入口',
    },
    name: 'LegacyWritingGenerate',
    path: '/writing/generate',
    redirect: '/paper/generate',
  },
  {
    meta: {
      hideInMenu: true,
      title: '论文材料生成兼容入口',
    },
    name: 'LegacyPaperMaterialGenerate',
    path: '/paper-materials/generate',
    redirect: '/paper/generate',
  },
  {
    meta: {
      hideInMenu: true,
      title: '论文材料记录兼容入口',
    },
    name: 'LegacyWritingOrders',
    path: '/writing/orders',
    redirect: '/paper/orders',
  },
  {
    meta: {
      hideInMenu: true,
      title: '论文材料记录兼容入口',
    },
    name: 'LegacyPaperMaterialOrders',
    path: '/paper-materials/orders',
    redirect: '/paper/orders',
  },
  {
    meta: {
      hideInMenu: true,
      title: '论文材料管理兼容入口',
    },
    name: 'LegacyAdminWritingOrders',
    path: '/admin/writing-orders',
    redirect: '/admin/thesis-material-orders',
  },
  {
    meta: {
      hideInMenu: true,
      title: '论文材料管理兼容入口',
    },
    name: 'LegacyAdminPaperMaterialOrders',
    path: '/admin/paper-material-orders',
    redirect: '/admin/thesis-material-orders',
  },
  {
    component: () => import('#/views/paper/generate/index.vue'),
    meta: {
      affixTab: true,
      icon: 'lucide:sparkles',
      keepAlive: true,
      order: -13,
      title: 'AI 论文',
    },
    name: 'PaperGenerate',
    path: '/paper/generate',
  },
  {
    meta: {
      hideInMenu: true,
      title: '论文材料生成兼容入口',
    },
    name: 'ThesisMaterialGenerate',
    path: '/thesis-materials/generate',
    redirect: '/paper/generate',
  },
  {
    meta: {
      hideInMenu: true,
      title: '论文材料订单兼容入口',
    },
    name: 'ThesisMaterialOrders',
    path: '/thesis-materials/orders',
    redirect: '/paper/orders',
  },
  {
    component: () => import('#/views/paper/orders/index.vue'),
    meta: {
      icon: 'lucide:receipt-text',
      order: -12,
      title: '订单管理',
    },
    name: 'PaperOrders',
    path: '/paper/orders',
  },
  {
    component: () => import('#/views/paper/docs/index.vue'),
    meta: {
      icon: 'lucide:book-open',
      order: -9,
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
        component: () => import('#/views/admin/thesis-material-orders/index.vue'),
        meta: {
          authority: ['admin'],
          icon: 'lucide:file-stack',
          title: '论文材料任务',
        },
        name: 'AdminThesisMaterialOrders',
        path: '/admin/thesis-material-orders',
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
