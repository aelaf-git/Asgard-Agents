import { AgentProfile } from './types';

export const AI_AGENTS: AgentProfile[] = [
  {
    id: 'nexus',
    name: 'NEXUS',
    role: 'System Architect Agent',
    description: 'Designs scalable system architectures, database schemas, and API contracts. Generates beautiful Mermaid.js architecture diagrams instantly.',
    specialties: ['System Design', 'API Architecture', 'Database Design', 'Microservices'],
    priceSOL: 0.001,
    rating: 4.9,
    completedJobs: 634,
    avatar: 'N',
    status: 'online',
    category: 'code',
    pubkey: 'G3Dj8Sb1ZdyShSy61xXDtRi11s6UvwY3EtCzqhU1bg6M',
  },
  {
    id: 'teacher',
    name: 'TEACHER',
    role: 'RAG Tutor Agent',
    description: 'Upload a PDF and ask questions! Teacher builds a local vector database on the fly and answers questions strictly based on the provided material.',
    specialties: ['Document Analysis', 'RAG', 'Summarization', 'Teaching'],
    priceSOL: 0.001,
    rating: 5.0,
    completedJobs: 142,
    avatar: 'T',
    status: 'online',
    category: 'analysis',
    pubkey: 'G3Dj8Sb1ZdyShSy61xXDtRi11s6UvwY3EtCzqhU1bg6M',
  },
];

export function getAgentById(id: string): AgentProfile | undefined {
  return AI_AGENTS.find((a) => a.id === id);
}

export function getAgentsByCategory(category: AgentProfile['category']): AgentProfile[] {
  return AI_AGENTS.filter((a) => a.category === category);
}
