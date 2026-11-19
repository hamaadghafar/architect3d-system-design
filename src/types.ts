import type { ComponentType } from 'react';

export type Vec3 = [number, number, number];

export type Difficulty = 'Junior/Mid' | 'Senior' | 'Staff';
export type TabId = 'fundamentals' | 'cloud' | 'examples' | 'interview';
export type LinkMode = 'vpn' | 'dx';

export type SceneId =
  | 'public-cloud'
  | 'private-cloud'
  | 'hybrid-cloud'
  | 'vpn-dx'
  | 'transit-gateway'
  | 'dns'
  | 'anycast'
  | 'cdn'
  | 'load-balancer'
  | 'api-gateway'
  | 'scaling'
  | 'asg'
  | 'kubernetes'
  | 'serverless'
  | 'sql-nosql'
  | 'read-replicas'
  | 'hash-ring'
  | 'cap'
  | 'storage'
  | 'cache-aside'
  | 'write-policies'
  | 'redis-cluster'
  | 'stampede'
  | 'queue'
  | 'kafka'
  | 'pubsub'
  | 'dlq'
  | 'circuit-breaker'
  | 'token-bucket'
  | 'multi-region'
  | 'url-shortener'
  | 'video-streaming'
  | 'ride-matching'
  | 'chat';

export interface FollowUp {
  q: string;
  a: string;
}

export interface InterviewQuestion {
  question: string;
  difficulty: Difficulty;
  /** Paragraphs. Supports **bold** and `code`. */
  answer: string[];
  followUps: FollowUp[];
  redFlags: string[];
}

export interface CloudModel {
  summary: string;
  stack: string[];
  points: string[];
}

export interface RealWorldExample {
  company: string;
  headline: string;
  scale: string;
  detail: string;
  lesson: string;
}

export interface Fundamentals {
  what: string;
  why: string;
  where: string;
  /** Ordered request lifecycle / mechanics. */
  how: string[];
  bottlenecks: { problem: string; solution: string }[];
  tradeoffs: { aspect: string; gain: string; cost: string }[];
  keyNumbers: { label: string; value: string }[];
}

export interface ControlConfig {
  traffic: boolean;
  /** When set, the failure toggle is shown with this label. */
  failureLabel?: string;
  /** Toggle state text, default ['FAILED', 'healthy']. */
  failureStates?: [string, string];
  cache?: boolean;
  /** Re-label the cache toggle for topics where it means something else (e.g. warm/cold start). */
  cacheLabels?: { label: string; on: string; off: string };
  link?: boolean;
  variants?: { id: string; label: string }[];
  hint: string;
}

export interface Topic {
  id: string;
  title: string;
  tagline: string;
  sceneId: SceneId;
  camera: { position: Vec3; target: Vec3 };
  controls: ControlConfig;
  fundamentals: Fundamentals;
  cloud: { public: CloudModel; private: CloudModel; hybrid: CloudModel };
  examples: RealWorldExample[];
  interview: InterviewQuestion[];
}

export interface CurriculumModule {
  id: string;
  number: number;
  title: string;
  short: string;
  description: string;
  status: 'ready' | 'planned';
  topics: Topic[];
  planned: string[];
}

export interface SimSnapshot {
  trafficRate: number;
  failure: boolean;
  cacheHit: boolean;
  linkMode: LinkMode;
  variant: string;
}

export interface Metric {
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'bad' | 'info';
}

export interface LegendItem {
  color: string;
  label: string;
}

export interface SceneEntry {
  Component: ComponentType;
  legend: LegendItem[];
  metrics: (s: SimSnapshot) => Metric[];
  narrate: (s: SimSnapshot) => string;
  /** Horizontal spacing multiplier in the 3D lab (default 1.4). Use 1 for scenes with fixed custom geometry. */
  spread?: number;
}

export const rps = (rate: number, scale = 200) => `${Math.round(rate * scale).toLocaleString()} req/s`;
