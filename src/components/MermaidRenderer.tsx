import { useEffect, useRef } from 'react';

export function MermaidRenderer({ chart, className }: { chart: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !chart) return;
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#00d2ff',
          primaryTextColor: '#fff',
          primaryBorderColor: '#00d2ff',
          lineColor: '#00d2ff',
          secondaryColor: '#3a7bd5',
          tertiaryColor: '#10b981',
        },
        securityLevel: 'loose',
      });
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      mermaid.default.render(id, chart).then((result) => {
        if (ref.current) ref.current.innerHTML = result.svg;
      }).catch((e: Error) => {
        if (ref.current) ref.current.innerHTML = `<pre class="text-destructive text-xs font-mono p-4">Diagram Error: ${e.message}</pre>`;
      });
    });
  }, [chart]);

  return <div ref={ref} className={className ?? "overflow-x-auto bg-void/50 p-6 rounded-3xl border border-primary/20"} />;
}
