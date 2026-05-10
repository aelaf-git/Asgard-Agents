import type { Recipe, FollowUp } from '@/types/recipe';

function cleanJSONString(raw: string): string {
  let s = raw.trim();

  // Try to find the first '{' and last '}'
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }

  // Remove common LLM artifacts
  if (s.includes('```')) {
    s = s.replace(/```(?:json)?/g, '').trim();
  }

  // Fix trailing commas in arrays/objects
  s = s.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  return s;
}

export function parseRecipe(raw: string): Recipe | null {
  try {
    const cleaned = cleanJSONString(raw);
    console.log('[RecipeParser] Raw input length:', raw.length);
    console.log('[RecipeParser] Cleaned input length:', cleaned.length);
    
    const data = JSON.parse(cleaned);

    if (data.type === 'recipe' || (!data.type && data.title && data.steps)) {
      const recipe: Recipe = {
        type: 'recipe',
        title: data.title || 'Untitled Recipe',
        description: data.description || '',
        prep_time: data.prep_time || '',
        cook_time: data.cook_time || '',
        total_time: data.total_time || '',
        difficulty: ['Easy', 'Medium', 'Hard'].includes(data.difficulty)
          ? data.difficulty
          : 'Easy',
        servings: typeof data.servings === 'number' ? data.servings : 1,
        ingredients: Array.isArray(data.ingredients)
          ? data.ingredients.map((i: { item?: string; amount?: string }) => ({
              item: i.item || '',
              amount: i.amount || '',
            }))
          : [],
        tools: Array.isArray(data.tools) ? data.tools : [],
        steps: Array.isArray(data.steps)
          ? data.steps.map((s: { step?: number; title?: string; instruction?: string; duration?: string; temperature?: string; warning?: string; tips?: string[] }) => ({
              step: s.step || 1,
              title: s.title || '',
              instruction: s.instruction || '',
              duration: s.duration || '',
              temperature: s.temperature || '',
              warning: s.warning || '',
              tips: Array.isArray(s.tips) ? s.tips : [],
            }))
          : [],
        tips: Array.isArray(data.tips) ? data.tips : [],
      };
      return recipe;
    }

    return null;
  } catch (err) {
    console.error('[RecipeParser] Failed to parse JSON:', err);
    console.error('[RecipeParser] First 100 chars of cleaned:', cleaned.slice(0, 100));
    return null;
  }
}

export function parseFollowUp(raw: string): FollowUp | null {
  try {
    const cleaned = cleanJSONString(raw);
    const data = JSON.parse(cleaned);

    const type = data.type || 'answer';

    switch (type) {
      case 'substitution':
        return {
          type: 'substitution',
          ingredient: data.ingredient || '',
          alternative: data.alternative || '',
          ratio: data.ratio || '',
          notes: data.notes || '',
        };
      case 'tip':
        return {
          type: 'tip',
          title: data.title || '',
          content: data.content || '',
        };
      case 'technique':
        return {
          type: 'technique',
          title: data.title || '',
          steps: Array.isArray(data.steps) ? data.steps : [],
          notes: data.notes || '',
        };
      case 'pairing':
        return {
          type: 'pairing',
          dish: data.dish || '',
          wine: data.wine || '',
          beer: data.beer || '',
          notes: data.notes || '',
        };
      default:
        return {
          type: 'answer',
          content: data.content || data.answer || cleaned,
        };
    }
  } catch {
    return {
      type: 'answer',
      content: raw,
    };
  }
}

export function getStepIcon(title: string, instruction: string): string {
  const text = `${title} ${instruction}`.toLowerCase();
  if (/\b(fry|pan[- ]fry|stir[- ]fry|sauté|sear|brown)\b/.test(text)) return '\u{1F373}';
  if (/\b(bake|roast|oven)\b/.test(text)) return '\u{1F525}';
  if (/\b(chop|dice|slice|cut|mince|peel|grate)\b/.test(text)) return '\u{1F52A}';
  if (/\b(mix|stir|whisk|beat|combine|blend|fold|knead)\b/.test(text)) return '\u{1F973}';
  if (/\b(boil|simmer|steam|blanch|parboil|poach)\b/.test(text)) return '\u{1F4A7}';
  if (/\b(grill|broil|char|barbeque|bbq)\b/.test(text)) return '\u{2668}\u{FE0F}';
  if (/\b(pour|add|drizzle|sprinkle|season)\b/.test(text)) return '\u{1F944}';
  if (/\b(rest|cool|refrigerate|chill|freeze)\b/.test(text)) return '\u{2744}\u{FE0F}';
  if (/\b(plate|serve|garnish)\b/.test(text)) return '\u{1F372}';
  return '\u{1F468}\u200D\u{1F373}';
}
