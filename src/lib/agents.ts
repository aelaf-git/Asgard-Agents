import { AgentProfile } from './types';

export const AI_AGENTS: AgentProfile[] = [
  {
    id: 'nexus',
    name: 'NEXUS',
    role: 'Coding Agent',
    description: 'Designs scalable system architectures, database schemas, and API contracts. Generates beautiful Mermaid.js architecture diagrams instantly.',
    specialties: ['System Design', 'API Architecture', 'Database Design', 'Microservices'],
    priceSOL: 0.001,
    avatar: 'N',
    status: 'online',
    category: 'coding',
    pubkey: 'G3Dj8Sb1ZdyShSy61xXDtRi11s6UvwY3EtCzqhU1bg6M',
  },
  {
    id: 'teacher',
    name: 'TEACHER',
    role: 'Studying Agent',
    description: 'Upload a PDF and ask questions! Teacher builds a local vector database on the fly and answers questions strictly based on the provided material.',
    specialties: ['Document Analysis', 'RAG', 'Summarization', 'Teaching'],
    priceSOL: 0.001,
    avatar: 'T',
    status: 'online',
    category: 'studying',
    pubkey: 'G3Dj8Sb1ZdyShSy61xXDtRi11s6UvwY3EtCzqhU1bg6M',
  },
  {
    id: 'cook',
    name: 'CHEF',
    role: 'Cooking Agent',
    description: 'Your personal AI chef. Get recipes, meal plans, cooking techniques, and ingredient substitutions tailored to your taste and dietary needs.',
    specialties: ['Recipe Creation', 'Meal Planning', 'Cooking Techniques', 'Dietary Adaptation'],
    priceSOL: 0.001,
    avatar: 'C',
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
