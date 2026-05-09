import React from 'react';
import { Grid3x3, BookOpen, ChefHat, Code } from 'lucide-react';
import { AgentProfile } from '@/lib/types';

type Category = AgentProfile['category'] | 'all';

const CATEGORIES: { value: Category; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All Agents', icon: Grid3x3 },
  { value: 'studying', label: 'Studying', icon: BookOpen },
  { value: 'cooking', label: 'Cooking', icon: ChefHat },
  { value: 'coding', label: 'Coding', icon: Code },
];

interface CategoryFilterProps {
  selected: Category;
  onChange: (category: Category) => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map(({ value, label, icon: Icon }) => {
        const isActive = selected === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[11px] tracking-wider uppercase transition-all border
              ${isActive
                ? 'bg-primary/10 text-primary border-primary/30 shadow-neon-sm'
                : 'bg-secondary text-muted-foreground border-border hover:border-primary/20 hover:text-foreground'
              }
            `}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
