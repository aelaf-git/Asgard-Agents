export interface Architecture {
  project_name: string;
  summary: string;
  tech_stack: Array<{
    layer: 'Frontend' | 'Backend' | 'Database' | 'Infra';
    tech: string;
    reason: string;
  }>;
  components: {
    frontend: { framework: string; state: string; styling: string };
    backend: { runtime: string; api: string; auth: string };
    database: { primary: string; caching: string; search: string };
    infrastructure: { provider: string; ci_cd: string; monitoring: string };
  };
  diagram: string;
  security: string[];
  scalability: string[];
  roadmap: Array<{
    phase: string;
    tasks: string[];
  }>;
  trade_offs: string;
}
