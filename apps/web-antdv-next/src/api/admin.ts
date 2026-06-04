import type { PageResult, PointLedger } from './ai-paper';

import { requestClient } from '#/api/request';

export interface AdminOverview {
  api_token_call_count: number;
  completed_order_count: number;
  failed_order_count: number;
  generating_order_count: number;
  health: Record<string, string>;
  model_call_count: number;
  month_order_count: number;
  month_spent_points: number;
  month_user_count: number;
  today_order_count: number;
  today_spent_points: number;
  today_user_count: number;
  total_order_count: number;
  total_spent_points: number;
  total_user_count: number;
}

export interface AdminUser {
  avatar?: null | string;
  created_at: string;
  email: string;
  id: number;
  is_disabled: boolean;
  nickname?: null | string;
  points: number;
  role: string;
  username: string;
}

export interface AdminUserDetail {
  api_token: {
    call_count: number;
    created_at?: null | string;
    has_token: boolean;
    last_used_at?: null | string;
    masked_token?: null | string;
  };
  order_count: number;
  point_ledgers: PointLedger[];
  user: AdminUser;
}

export interface AdminOrder {
  completed_at?: null | string;
  cost_points: number;
  created_at: string;
  download_url?: null | string;
  file_key?: null | string;
  id: number;
  last_error?: null | string;
  order_sn: string;
  paid_at?: null | string;
  paid_points: number;
  refunded_points: number;
  status: string;
  task_id?: null | string;
  title: string;
  user_id: number;
  username: string;
}

export interface AdminOrderDetail {
  config_form?: null | Record<string, any>;
  order: AdminOrder;
  outline_json: Array<Record<string, any>>;
  point_ledgers: PointLedger[];
  request_payload?: null | Record<string, any>;
}

export interface ModelConfig {
  api_base_url: string;
  config_type: string;
  created_at: string;
  id: number;
  is_default: boolean;
  is_enabled: boolean;
  masked_api_key: string;
  model_name: string;
  provider: string;
  remark?: null | string;
  updated_at: string;
}

export interface ModelCallLog {
  config_type: string;
  created_at: string;
  error_message?: null | string;
  id: number;
  input_tokens: number;
  latency_ms: number;
  model_config_id?: null | number;
  model_name: string;
  order_id?: null | number;
  output_tokens: number;
  provider: string;
  status: string;
  user_id?: null | number;
}

export interface AuditLog {
  action: string;
  created_at: string;
  id: number;
  ip_address?: null | string;
  operator_id?: null | number;
  summary: string;
  target_id?: null | string;
  target_type: string;
}

export function getAdminOverview() {
  return requestClient.get<AdminOverview>('/admin/overview');
}

export function listAdminUsers(params: {
  keyword?: string;
  page?: number;
  page_size?: number;
}) {
  return requestClient.get<PageResult<AdminUser>>('/admin/users', { params });
}

export function getAdminUserDetail(userId: number) {
  return requestClient.get<AdminUserDetail>(`/admin/users/${userId}`);
}

export function createAdminUser(data: {
  email: string;
  initial_points: number;
  nickname?: string;
  password: string;
  role: 'admin' | 'user';
  username: string;
}) {
  return requestClient.post<AdminUser>('/admin/users', data);
}

export function updateAdminUser(
  userId: number,
  data: Partial<Pick<AdminUser, 'email' | 'is_disabled' | 'nickname'>>,
) {
  return requestClient.request<AdminUser>(`/admin/users/${userId}`, {
    data,
    method: 'PATCH',
  });
}

export function resetAdminUserPassword(userId: number, password: string) {
  return requestClient.post(`/admin/users/${userId}/password`, { password });
}

export function adjustUserPoints(
  userId: number,
  data: { delta: number; reason: string },
) {
  return requestClient.post<PointLedger>(`/admin/users/${userId}/points`, data);
}

export function listAdminOrders(params: {
  keyword?: string;
  page?: number;
  page_size?: number;
  status?: string;
  user_id?: number;
}) {
  return requestClient.get<PageResult<AdminOrder>>('/admin/orders', { params });
}

export function getAdminOrderDetail(orderId: number) {
  return requestClient.get<AdminOrderDetail>(`/admin/orders/${orderId}`);
}

export function retryAdminOrder(orderId: number) {
  return requestClient.post(`/admin/orders/${orderId}/retry`);
}

export function refundAdminOrder(orderId: number, reason: string) {
  return requestClient.post(`/admin/orders/${orderId}/refund`, { reason });
}

export function markAdminOrderFailed(orderId: number, reason: string) {
  return requestClient.post(`/admin/orders/${orderId}/fail`, { reason });
}

export function attachAdminOrderFile(
  orderId: number,
  data: { download_url: string; file_key?: string; reason: string },
) {
  return requestClient.post(`/admin/orders/${orderId}/file`, data);
}

export function listModelConfigs() {
  return requestClient.get<ModelConfig[]>('/admin/model-configs');
}

export function createModelConfig(data: Record<string, any>) {
  return requestClient.post<ModelConfig>('/admin/model-configs', data);
}

export function updateModelConfig(id: number, data: Record<string, any>) {
  return requestClient.request<ModelConfig>(`/admin/model-configs/${id}`, {
    data,
    method: 'PATCH',
  });
}

export function deleteModelConfig(id: number) {
  return requestClient.delete(`/admin/model-configs/${id}`);
}

export function testModelConfig(id: number) {
  return requestClient.post<{ message: string; status: string }>(
    `/admin/model-configs/${id}/test`,
  );
}

export function listModelCallLogs(page = 1, pageSize = 10) {
  return requestClient.get<PageResult<ModelCallLog>>('/admin/model-call-logs', {
    params: { page, page_size: pageSize },
  });
}

export function listAuditLogs(page = 1, pageSize = 10) {
  return requestClient.get<PageResult<AuditLog>>('/admin/audit-logs', {
    params: { page, page_size: pageSize },
  });
}
