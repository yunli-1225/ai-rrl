export type ExperimentGroup = 'control' | 'experiment';
export type ExperimentModel = 'deepseek';

export interface ExperimentConfig {
  group: ExperimentGroup;
  model: ExperimentModel;
}

export interface ExperimentRecord {
  id: number;
  group: ExperimentGroup;
  model: ExperimentModel;
  round: number;
  title: string;
  raw_output: string;
  score_total: number;
  score_skill: number;
  score_experience: number;
  has_error: boolean;
  error_type: string;
  latency_ms: number;
  token_count: number;
  rag_keyword_hits: number;
  created_at: string;
}

export interface ExperimentRound {
  control: ExperimentRecord | null;
  experiment: ExperimentRecord | null;
  round: number;
}

export interface ExperimentMetrics {
  group: ExperimentGroup;
  model: ExperimentModel;
  n: number;
  error_rate: number;
  score_mean: number;
  score_variance: number;
  score_std: number;
  latency_mean: number;
  token_mean: number;
  rag_hit_mean: number;
  scores: number[];
  errors: string[];
}

export interface ExperimentSummary {
  totalRounds: number;
  metrics: ExperimentMetrics[];
  conclusion: string;
}

export interface ExperimentStoreData {
  version: number;
  records: ExperimentRecord[];
  nextId: number;
  updatedAt: string;
}
