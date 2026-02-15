
export enum InputType {
  TEXT = 'TEXT',
  VIDEO = 'VIDEO',
  SPLITTER = 'SPLITTER'
}

export type TextProcessingMode = 
  | 'AR_TO_EN' 
  | 'EN_TO_AR' 
  | 'SUMMARY_ONLY' 
  | 'TRANS_AND_SUM_AR_EN'
  | 'TRANS_AND_SUM_EN_AR';

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  message: string;
  error: string | null;
}

export interface QuotaInfo {
  used: number;
  lastReset: string;
}

export interface OutputData {
  srtContent: string | null;
  txtContent: string | null;
  summaryContent: string | null;
  translatedText: string | null;
  originalText: string | null;
  fileName: string;
}

export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const DAILY_QUOTA = 10;

export type Language = 'en' | 'sd'; // English | Sudanese
