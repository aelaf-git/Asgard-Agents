import { AgentProfile } from './types';

export const AI_AGENTS: AgentProfile[] = [
  {
    id: 'heimdall',
    name: 'HEIMDALL',
    role: 'Coding Agent',
    description: 'The all-seeing architect. Designs scalable systems, database schemas, and API contracts. Generates beautiful Mermaid.js architecture diagrams instantly.',
    specialties: ['System Design', 'API Architecture', 'Database Design', 'Microservices'],
    priceSOL: 0.001,
    avatar: 'H',
    status: 'online',
    category: 'coding',
    pubkey: 'G3Dj8Sb1ZdyShSy61xXDtRi11s6UvwY3EtCzqhU1bg6M',
  },
  {
    id: 'odin',
    name: 'ODIN',
    role: 'Studying Agent',
    description: 'The All-Father of knowledge. Upload a PDF and ask anything — Odin builds a vector index on the fly and answers strictly from your material.',
    specialties: ['Document Analysis', 'RAG', 'Summarization', 'Teaching'],
    priceSOL: 0.001,
    avatar: 'O',
    status: 'online',
    category: 'studying',
    pubkey: 'G3Dj8Sb1ZdyShSy61xXDtRi11s6UvwY3EtCzqhU1bg6M',
  },
  {
    id: 'idunn',
    name: 'IDUNN',
    role: 'Cooking Agent',
    description: 'Keeper of the golden apples. Get recipes, meal plans, cooking techniques, and ingredient substitutions tailored to your taste and dietary needs.',
    specialties: ['Recipe Creation', 'Meal Planning', 'Cooking Techniques', 'Dietary Adaptation'],
    priceSOL: 0.001,
    avatar: 'I',
    status: 'online',
    category: 'cooking',
    pubkey: 'G3Dj8Sb1ZdyShSy61xXDtRi11s6UvwY3EtCzqhU1bg6M',
  },
];

export function getAgentById(id: string): AgentProfile | undefined {
  return AI_AGENTS.find((a) => a.id === id);
}

export function getAgentsByCategory(category: AgentProfile['category']): AgentProfile[] {
  return AI_AGENTS.filter((a) => a.category === category);
}
