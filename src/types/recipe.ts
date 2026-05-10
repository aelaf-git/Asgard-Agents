export interface RecipeIngredient {
  item: string;
  amount: string;
}

export interface RecipeStep {
  step: number;
  title: string;
  instruction: string;
  duration: string;
  temperature: string;
  warning: string;
  tips: string[];
}

export interface Recipe {
  type: 'recipe';
  title: string;
  description: string;
  prep_time: string;
  cook_time: string;
  total_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  servings: number;
  ingredients: RecipeIngredient[];
  tools: string[];
  steps: RecipeStep[];
  tips: string[];
}

export interface FollowUpTip {
  type: 'tip';
  title: string;
  content: string;
}

export interface FollowUpSubstitution {
  type: 'substitution';
  ingredient: string;
  alternative: string;
  ratio: string;
  notes: string;
}

export interface FollowUpTechnique {
  type: 'technique';
  title: string;
  steps: string[];
  notes: string;
}

export interface FollowUpPairing {
  type: 'pairing';
  dish: string;
  wine: string;
  beer: string;
  notes: string;
}

export interface FollowUpAnswer {
  type: 'answer';
  content: string;
}

export type FollowUp = FollowUpTip | FollowUpSubstitution | FollowUpTechnique | FollowUpPairing | FollowUpAnswer;


