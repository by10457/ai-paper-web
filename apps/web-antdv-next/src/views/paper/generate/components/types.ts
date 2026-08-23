export interface GenerateFormState {
  about_msg: string;
  codetype: string;
  language: string;
  target_word_count: number;
  three_level: boolean;
  title: string;
  wxnum: number;
  wxquote: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export type WorkflowStep = 'config' | 'outline' | 'result';

export {
  type PaperOrderCreateResult,
  type PaperOrderStatus,
  type PaperOutlineChapter,
  type PaperOutlineSection,
  type PaperOutlineSubsection,
  type PaperPrice,
} from '#/api';
