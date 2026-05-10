import { Architecture } from '@/types/architecture';

function cleanJSONString(raw: string): string {
  let s = raw.trim();

  const start = s.indexOf('{');
  if (start === -1) {
    const start2 = s.indexOf('[');
    if (start2 === -1) return raw;
    return s.slice(start2);
  }
  s = s.slice(start);

  const end = s.lastIndexOf('}');
  if (end !== -1) s = s.slice(0, end + 1);

  if (s.startsWith('```')) s = s.replace(/```(?:json)?\s*/, '').trim();
  if (s.endsWith('```')) s = s.slice(0, -3).trim();

  s = s.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  return s;
}

function tryParse(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getStr(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function getArr(obj: Record<string, unknown>, ...keys: string[]): unknown[] | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (Array.isArray(v) && v.length > 0) return v;
  }
  return undefined;
}

function getObj(obj: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  }
  return undefined;
}

export function parseArchitecture(raw: string): Architecture | null {
  const cleaned = cleanJSONString(raw);

  // Try direct parse
  let data = tryParse(cleaned);
  if (!data) {
    // Try replacing literal newlines in strings with \n
    const fixed = cleaned.replace(/\n/g, '\\n');
    data = tryParse(fixed);
  }
  if (!data) {
    // Try wrapping \n as real newlines
    const fixed2 = cleaned.replace(/\\n/g, '\n');
    data = tryParse(fixed2);
  }
  if (!data) {
    console.error('[ArchitectureParser] Could not parse JSON at all. Raw:', raw.slice(0, 500));
    return null;
  }

  // Handle wrapped responses: { "architecture": {...} }, { "data": {...} }, { "response": {...} }
  for (const wrapper of ['architecture', 'data', 'response', 'result', 'blueprint', 'design']) {
    const inner = getObj(data, wrapper);
    if (inner && (getStr(inner, 'project_name', 'title', 'name', 'project') || getArr(inner, 'tech_stack', 'technologies', 'stack', 'tech'))) {
      data = inner;
      break;
    }
  }

  // Extract fields with flexible naming
  const project_name = getStr(data, 'project_name', 'title', 'name', 'project', 'projectName', 'system_name', 'systemName')
    || 'Untitled System';

  const summary = getStr(data, 'summary', 'description', 'overview', 'abstract', 'introduction') || '';

  // Tech stack
  const rawTechStack = getArr(data, 'tech_stack', 'technologies', 'tech_stack', 'techStack', 'stack', 'tech', 'technology_stack');
  const tech_stack = Array.isArray(rawTechStack)
    ? rawTechStack.map((t: unknown) => {
        if (typeof t === 'string') return { layer: 'Backend' as const, tech: t, reason: '' };
        const to = (t || {}) as Record<string, unknown>;
        return {
          layer: (['Frontend', 'Backend', 'Database', 'Infra'].includes(to.layer as string)
            ? to.layer as 'Frontend' | 'Backend' | 'Database' | 'Infra'
            : 'Backend'),
          tech: getStr(to, 'tech', 'name', 'technology', 'tool') || '',
          reason: getStr(to, 'reason', 'purpose', 'why', 'rationale') || '',
        };
      })
    : [];

  // Components
  const rawComponents = getObj(data, 'components', 'component', 'architecture', 'system');
  const frontend = (getObj(rawComponents || {}, 'frontend', 'front_end', 'frontEnd', 'client', 'ui'))
    || {};
  const backend = (getObj(rawComponents || {}, 'backend', 'back_end', 'backEnd', 'server', 'api'))
    || {};
  const database = (getObj(rawComponents || {}, 'database', 'db', 'data', 'storage', 'persistence'))
    || {};
  const infrastructure = (getObj(rawComponents || {}, 'infrastructure', 'infra', 'infrastructure', 'devops', 'deploy'))
    || {};

  const components = {
    frontend: {
      framework: getStr(frontend, 'framework', 'tech', 'technology', 'name') || 'Not specified',
      state: getStr(frontend, 'state', 'state_management', 'stateManagement', 'store') || 'Not specified',
      styling: getStr(frontend, 'styling', 'css', 'ui_library', 'uiLibrary', 'styling_framework') || 'Not specified',
    },
    backend: {
      runtime: getStr(backend, 'runtime', 'language', 'tech', 'framework', 'name') || 'Not specified',
      api: getStr(backend, 'api', 'api_style', 'apiStyle', 'protocol', 'type') || 'Not specified',
      auth: getStr(backend, 'auth', 'authentication', 'auth_method', 'authMethod') || 'Not specified',
    },
    database: {
      primary: getStr(database, 'primary', 'main', 'db', 'database', 'tech', 'name') || 'Not specified',
      caching: getStr(database, 'caching', 'cache', 'cache_layer', 'cacheLayer') || 'Not specified',
      search: getStr(database, 'search', 'search_engine', 'searchEngine', 'full_text_search') || 'Not specified',
    },
    infrastructure: {
      provider: getStr(infrastructure, 'provider', 'cloud', 'host', 'platform', 'name') || 'Not specified',
      ci_cd: getStr(infrastructure, 'ci_cd', 'cicd', 'ci', 'cd', 'deployment') || 'Not specified',
      monitoring: getStr(infrastructure, 'monitoring', 'observability', 'logging', 'monitor') || 'Not specified',
    },
  };

  // Diagram
  let diagram = getStr(data, 'diagram', 'mermaid', 'chart', 'flowchart', 'architecture_diagram', 'diagram_code') || '';
  if (diagram) {
    diagram = diagram.replace(/\\n/g, '\n');
  }

  // Security
  const security = (getArr(data, 'security', 'security_measures', 'securityMeasures', 'security_controls') || [])
    .map((s: unknown) => typeof s === 'string' ? s : String(s));

  // Scalability
  const scalability = (getArr(data, 'scalability', 'scaling', 'scaling_strategies', 'performance') || [])
    .map((s: unknown) => typeof s === 'string' ? s : String(s));

  // Roadmap
  const rawRoadmap = getArr(data, 'roadmap', 'road_map', 'phases', 'implementation_plan', 'plan');
  const roadmap = Array.isArray(rawRoadmap)
    ? rawRoadmap.map((p: unknown) => {
        if (typeof p === 'string') return { phase: p, tasks: [] };
        const po = (p || {}) as Record<string, unknown>;
        const phase = getStr(po, 'phase', 'name', 'title', 'step', 'stage') || '';
        const rawTasks = getArr(po, 'tasks', 'items', 'steps', 'task_list', 'action_items');
        return {
          phase,
          tasks: Array.isArray(rawTasks) ? rawTasks.map((t: unknown) => String(t)) : [],
        };
      })
    : [];

  const trade_offs = getStr(data, 'trade_offs', 'tradeoffs', 'trade_offs', 'compromises', 'trade_off', 'trade_off_notes') || '';

  // Only require project_name and at least some content to consider valid
  if (project_name) {
    return {
      project_name,
      summary,
      tech_stack,
      components,
      diagram,
      security,
      scalability,
      roadmap,
      trade_offs,
    };
  }

  return null;
}
