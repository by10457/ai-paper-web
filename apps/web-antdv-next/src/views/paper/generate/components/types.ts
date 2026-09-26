export interface GenerateFormState {
  about_msg: string;
  chinese_reference_count: number;
  english_reference_count: number;
  target_word_count: number;
  three_level: boolean;
  title: string;
}

export type WorkflowStep = 'config' | 'outline' | 'result' | 'type';

export {
  type PaperOrderCreateResult,
  type PaperOrderStatus,
  type PaperOutlineChapter,
  type PaperOutlineSection,
  type PaperOutlineSubsection,
  type PaperPrice,
} from '#/api';
