export interface PlaybookStep {
  id: string;
  index: number;
  text: string;
  completed: boolean;
  snippets: string[];
  section?: string;
  note?: string;
}

export type PlaybookStatus = 'not_started' | 'in_progress' | 'completed';

export interface NotepadPlaybook {
  id: string;
  title: string;
  fileName: string;
  category: string;
  description?: string;
  steps: PlaybookStep[];
  runCount: number;
  updatedAt: string;
  lastRunCompletedAt?: string;
}

export type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed';
