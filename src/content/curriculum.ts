import type { CurriculumModule, Topic } from '../types';
import { module1Topics } from './module1';
import { module2Topics } from './module2';
import { module3Topics } from './module3';
import { module4Topics } from './module4';
import { module5Topics } from './module5';
import { module6Topics } from './module6';
import { module7Topics } from './module7';
import { module8Topics } from './module8';

export const CURRICULUM: CurriculumModule[] = [
  {
    id: 'm1',
    number: 1,
    title: 'Cloud Infrastructure Foundations',
    short: 'Cloud Foundations',
    description:
      'Where your system physically and logically lives: public, private and hybrid cloud, and the private networking that stitches them together.',
    status: 'ready',
    topics: module1Topics,
    planned: [],
  },
  {
    id: 'm2',
    number: 2,
    title: 'Networking & Traffic Routing',
    short: 'Networking & Routing',
    description:
      'How a request finds your system and reaches the right server: DNS, Anycast, CDNs, load balancers, reverse proxies and API gateways.',
    status: 'ready',
    topics: module2Topics,
    planned: [],
  },
  {
    id: 'm3',
    number: 3,
    title: 'Compute & Scaling',
    short: 'Compute & Scaling',
    description: 'Vertical vs. horizontal scaling, auto-scaling groups, containers, Kubernetes and serverless.',
    status: 'ready',
    topics: module3Topics,
    planned: [],
  },
  {
    id: 'm4',
    number: 4,
    title: 'Databases & Storage',
    short: 'Databases & Storage',
    description: 'SQL vs. NoSQL, replicas, sharding with a 3D consistent-hashing ring, CAP, object vs. block storage.',
    status: 'ready',
    topics: module4Topics,
    planned: [],
  },
  {
    id: 'm5',
    number: 5,
    title: 'Caching & Performance',
    short: 'Caching',
    description: 'Cache-aside, write-through, write-behind, Redis Cluster, eviction policies and cache stampedes.',
    status: 'ready',
    topics: module5Topics,
    planned: [],
  },
  {
    id: 'm6',
    number: 6,
    title: 'Asynchronous Messaging & Event Streaming',
    short: 'Messaging & Streaming',
    description: 'Message queues, Kafka partitions and consumer groups, pub/sub and dead-letter queues.',
    status: 'ready',
    topics: module6Topics,
    planned: [],
  },
  {
    id: 'm7',
    number: 7,
    title: 'Reliability, Resilience & Observability',
    short: 'Reliability',
    description: 'Circuit breakers, token-bucket rate limiting in 3D, active-active vs. active-passive multi-region.',
    status: 'ready',
    topics: module7Topics,
    planned: [],
  },
  {
    id: 'm8',
    number: 8,
    title: 'End-to-End Real-World Architectures',
    short: 'Case Studies',
    description: 'URL shortener, Netflix-style video streaming, Uber-style ride matching and WhatsApp-style chat.',
    status: 'ready',
    topics: module8Topics,
    planned: [],
  },
];

export const DEFAULT_TOPIC_ID = module1Topics[0].id;

export function findTopic(topicId: string): { module: CurriculumModule; topic: Topic } | undefined {
  for (const module of CURRICULUM) {
    const topic = module.topics.find((t) => t.id === topicId);
    if (topic) return { module, topic };
  }
  return undefined;
}
