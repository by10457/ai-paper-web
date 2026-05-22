import { requestClient } from '#/api/request';

export interface PageResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface PaperOutlineSection {
  abstract: string;
  name: string;
}

export interface PaperOutlineChapter {
  chapter: string;
  sections: PaperOutlineSection[];
}

export interface PaperPrice {
  amount: number;
  points: number;
  user_points: number;
}

export interface PaperOutlineRecord {
  abstract: string;
  keywords: string;
  outline: PaperOutlineChapter[];
  record_id: number;
}

export interface PaperOrderCreateResult {
  amount: number;
  is_paid: number;
  order_sn: string;
  points: number;
}

export interface PaperOrderPayResult {
  cost_points: number;
  is_paid: number;
  order_sn: string;
  points: number;
}

export interface PaperOrderStatus {
  download_url?: null | string;
  error_msg?: null | string;
  file_key?: null | string;
  has_file: number;
  is_paid: number;
  order_sn: string;
  status: string;
  task_id?: null | string;
}

export interface PaperOrderItem {
  completed_at?: null | string;
  cost_points: number;
  created_at: string;
  download_url?: null | string;
  error_msg?: null | string;
  has_file: number;
  id: number;
  order_sn: string;
  paid_at?: null | string;
  paid_points: number;
  refunded_points: number;
  status: string;
  title: string;
}

export interface PaperOrderDetail extends PaperOrderItem {
  config_form?: null | Record<string, any>;
  file_key?: null | string;
  outline_json: any[];
  task_id?: null | string;
}

export interface PointLedger {
  balance_after: number;
  change_type: string;
  created_at: string;
  delta: number;
  id: number;
  order_id?: null | number;
  reason: string;
}

export interface ApiTokenInfo {
  call_count: number;
  created_at?: null | string;
  has_token: boolean;
  last_used_at?: null | string;
  masked_token?: null | string;
}

export interface ApiTokenResult extends ApiTokenInfo {
  points: number;
  token: string;
  token_type: string;
  username: string;
}

export interface RechargeOrder {
  admin_remark?: null | string;
  amount: number;
  created_at: string;
  id: number;
  order_sn: string;
  pay_channel: string;
  points: number;
  remark?: null | string;
  reviewed_at?: null | string;
  status: string;
  status_text: string;
}

const AI_OUTLINE_TIMEOUT = 180_000;

export function getPaperPrice() {
  return requestClient.get<PaperPrice>('/thesis/price');
}

export function createPaperOutline(data: {
  about_msg?: string;
  form_params: Record<string, any>;
  three_level?: boolean;
  title: string;
}) {
  return requestClient.post<PaperOutlineRecord>('/thesis/outlines', data, {
    timeout: AI_OUTLINE_TIMEOUT,
  });
}

export function createPaperOrder(data: {
  outline: any[];
  record_id: number;
  selftemp?: number;
  service_ids?: number[];
  template_id?: number;
}) {
  return requestClient.post<PaperOrderCreateResult>('/thesis/orders', data);
}

export function payPaperOrder(order_sn: string) {
  return requestClient.post<PaperOrderPayResult>('/thesis/orders/pay', {
    order_sn,
  });
}

export function getPaperOrderStatus(order_sn: string) {
  return requestClient.get<PaperOrderStatus>('/thesis/orders/status', {
    params: { order_sn },
  });
}

export function listMyPaperOrders(page = 1, pageSize = 10) {
  return requestClient.get<PageResult<PaperOrderItem>>('/thesis/orders', {
    params: { page, page_size: pageSize },
  });
}

export function getMyPaperOrderDetail(order_sn: string) {
  return requestClient.get<PaperOrderDetail>('/thesis/orders/detail', {
    params: { order_sn },
  });
}

export function listPointLedgers(page = 1, pageSize = 10) {
  return requestClient.get<PageResult<PointLedger>>('/users/points/ledger', {
    params: { page, page_size: pageSize },
  });
}

export function getApiTokenInfo() {
  return requestClient.get<ApiTokenInfo>('/users/apiToken');
}

export function resetApiToken() {
  return requestClient.post<ApiTokenResult>('/users/apiToken/reset');
}

export function createRechargeOrder(data: {
  pay_channel: 'alipay' | 'bank' | 'manual' | 'wechat';
  points: number;
  remark?: string;
}) {
  return requestClient.post<RechargeOrder>('/users/points/recharge', data);
}

export function listRechargeOrders(page = 1, pageSize = 10) {
  return requestClient.get<PageResult<RechargeOrder>>('/users/points/recharge', {
    params: { page, page_size: pageSize },
  });
}
