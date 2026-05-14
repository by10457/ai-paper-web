import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const user = await requestClient.get<{
    avatar?: null | string;
    email: string;
    id: number;
    is_disabled: boolean;
    nickname?: null | string;
    points: number;
    role: string;
    username: string;
  }>('/users/userInfo');

  return {
    avatar: user.avatar || undefined,
    desc: user.email,
    homePath: user.role === 'admin' ? '/admin/overview' : '/paper/generate',
    realName: user.nickname || user.username,
    roles: [user.role],
    userId: String(user.id),
    username: user.username,
  } as UserInfo;
}
