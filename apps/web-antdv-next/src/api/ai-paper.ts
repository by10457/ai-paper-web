import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

import { requestClient } from '#/api/request';

export interface PageResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface PaperOutlineSubsection {
  abstract: string;
  name: string;
}

export interface PaperOutlineSection extends PaperOutlineSubsection {
  subsections: PaperOutlineSubsection[];
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
  events?: Array<Record<string, any>>;
  file_key?: null | string;
  has_file: number;
  is_paid: number;
  message?: null | string;
  order_sn: string;
  progress?: number;
  stage?: null | string;
  status: string;
  task_id?: null | string;
}

export interface PaperOrderDownloadUrl {
  download_url: string;
  file_key?: null | string;
  order_sn: string;
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
  outline_json: PaperOutlineChapter[];
  process_events?: Array<Record<string, any>>;
  process_metadata?: null | Record<string, any>;
  result_summary?: null | Record<string, any>;
  task_progress?: number;
  task_stage?: null | string;
  task_id?: null | string;
}

export type UnifiedOrderDocumentType =
  | 'literature_review'
  | 'proposal_report'
  | 'task_book'
  | 'thesis';

export interface UnifiedOrderItem {
  completed_at?: null | string;
  created_at: string;
  document_type: UnifiedOrderDocumentType;
  error_message?: null | string;
  has_file: number;
  order_sn: string;
  paid_points: number;
  refunded_points: number;
  status: string;
  title: string;
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

export type ThesisMaterialDocumentType =
  | 'literature_review'
  | 'proposal_report'
  | 'task_book';

export interface ThesisMaterialProduct {
  default_reference_count?: null | number;
  default_word_count?: null | number;
  document_type: ThesisMaterialDocumentType;
  minimum_reference_count?: null | number;
  name: string;
  points: number;
}

export interface ThesisMaterialProducts {
  products: ThesisMaterialProduct[];
  user_points: number;
}

export interface ThesisMaterialSubmitResult {
  charged_points: number;
  document_type: ThesisMaterialDocumentType;
  order_sn: string;
  status: 'queued';
  task_id: string;
}

export interface ThesisMaterialTask {
  charged_points: number;
  completed_at?: null | string;
  created_at: string;
  document_type: ThesisMaterialDocumentType;
  download_url?: null | string;
  message: string;
  order_sn: string;
  progress: number;
  refunded_points: number;
  request: Record<string, any>;
  result?: null | Record<string, any>;
  stage: string;
  status: 'completed' | 'failed' | 'generating' | 'queued';
  task_id: string;
  title: string;
}

export interface ThesisMaterialOrderItem {
  completed_at?: null | string;
  cost_points: number;
  created_at: string;
  document_type: ThesisMaterialDocumentType;
  order_sn: string;
  refunded_points: number;
  status: string;
  task_id?: null | string;
  title: string;
}

export interface ThesisMaterialOrderDetail extends ThesisMaterialOrderItem {
  download_url?: null | string;
  error_message?: null | string;
  progress: number;
  request: Record<string, any>;
  result?: null | Record<string, any>;
  stage?: null | string;
}

const AI_OUTLINE_TIMEOUT = 180_000;
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

export function getPaperPrice() {
  return requestClient.get<PaperPrice>('/thesis/price');
}

export function recommendPaperTitles(content: string) {
  return requestClient.post<string[]>(
    '/thesis/titles/recommend',
    { content },
    {
      timeout: AI_OUTLINE_TIMEOUT,
    },
  );
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
  outline: PaperOutlineChapter[];
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

export async function streamPaperOrderStatus(
  orderSn: string,
  onStatus: (status: PaperOrderStatus) => void,
  signal?: AbortSignal,
) {
  const accessStore = useAccessStore();
  const response = await fetch(
    `${apiURL}/thesis/orders/events?order_sn=${encodeURIComponent(orderSn)}`,
    {
      headers: {
        Authorization: accessStore.accessToken
          ? `Bearer ${accessStore.accessToken}`
          : '',
      },
      signal,
    },
  );
  if (!response.ok || !response.body) {
    throw new Error(`论文生成状态连接失败：${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';
    for (const chunk of chunks) {
      const dataLine = chunk
        .split('\n')
        .find((line) => line.startsWith('data:'));
      if (!dataLine) continue;
      const payload = dataLine.slice(5).trim();
      if (!payload) continue;
      onStatus(JSON.parse(payload) as PaperOrderStatus);
    }
  }
}

export function listMyPaperOrders(page = 1, pageSize = 10) {
  return requestClient.get<PageResult<PaperOrderItem>>('/thesis/orders', {
    params: { page, page_size: pageSize },
  });
}

export function listUnifiedOrders(page = 1, pageSize = 10) {
  return requestClient.get<PageResult<UnifiedOrderItem>>(
    '/thesis/orders/unified',
    {
      params: { page, page_size: pageSize },
    },
  );
}

export function getMyPaperOrderDetail(order_sn: string) {
  return requestClient.get<PaperOrderDetail>('/thesis/orders/detail', {
    params: { order_sn },
  });
}

export function getPaperOrderDownloadUrl(order_sn: string) {
  return requestClient.get<PaperOrderDownloadUrl>(
    '/thesis/orders/download-url',
    {
      params: { order_sn },
    },
  );
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

export function getThesisMaterialProducts() {
  return requestClient.get<ThesisMaterialProducts>('/thesis-materials/products');
}

export function submitThesisMaterialDocument(
  documentType: ThesisMaterialDocumentType,
  data: Record<string, any>,
) {
  const endpointMap: Record<ThesisMaterialDocumentType, string> = {
    literature_review: '/thesis-materials/literature-reviews',
    proposal_report: '/thesis-materials/proposal-reports',
    task_book: '/thesis-materials/task-books',
  };
  return requestClient.post<ThesisMaterialSubmitResult>(endpointMap[documentType], data, {
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
}

export function getThesisMaterialTask(taskId: string) {
  return requestClient.get<ThesisMaterialTask>(`/thesis-materials/tasks/${taskId}`);
}

export function listThesisMaterialOrders(page = 1, pageSize = 10) {
  return requestClient.get<PageResult<ThesisMaterialOrderItem>>('/thesis-materials/orders', {
    params: { page, page_size: pageSize },
  });
}

export function getThesisMaterialOrder(orderSn: string) {
  return requestClient.get<ThesisMaterialOrderDetail>(`/thesis-materials/orders/${orderSn}`);
}

export async function streamThesisMaterialTask(
  taskId: string,
  onStatus: (status: ThesisMaterialTask) => void,
  signal?: AbortSignal,
) {
  const accessStore = useAccessStore();
  const response = await fetch(`${apiURL}/thesis-materials/tasks/${encodeURIComponent(taskId)}/events`, {
    headers: {
      Authorization: accessStore.accessToken
        ? `Bearer ${accessStore.accessToken}`
        : '',
    },
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`论文材料生成状态连接失败：${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';
    for (const chunk of chunks) {
      const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'));
      const payload = dataLine?.slice(5).trim();
      if (payload) onStatus(JSON.parse(payload) as ThesisMaterialTask);
    }
  }
}
