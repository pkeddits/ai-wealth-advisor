export type GoalKind = 'reserva' | 'viagem' | 'celular' | 'carro' | 'faculdade' | 'investimentos' | 'outra';

export interface GoalMovement {
  id: string;
  goalId: string;
  kind: 'inicial' | 'aporte' | 'retirada';
  amount: number;
  occurredOn: string;
  note: string | null;
}

export interface Goal {
  id: string;
  name: string;
  kind: GoalKind;
  targetAmount: number;
  targetDate: string | null;
  createdAt: string;
  movements: GoalMovement[];
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  alertThreshold: number;
}

export interface CustomCategory {
  id: string;
  kind: 'receita' | 'despesa';
  name: string;
  isActive: boolean;
}

export interface GoalInput {
  name: string;
  kind: GoalKind;
  targetAmount: number;
  targetDate: string | null;
  initialAmount?: number;
}

export interface PlanningService {
  goals(): Promise<Goal[]>;
  createGoal(input: GoalInput): Promise<void>;
  updateGoal(id: string, input: Omit<GoalInput, 'initialAmount'>): Promise<void>;
  deleteGoal(id: string): Promise<void>;
  addMovement(goalId: string, kind: 'aporte' | 'retirada', amount: number, occurredOn: string, note?: string): Promise<void>;
  deleteMovement(id: string): Promise<void>;
  budgets(): Promise<Budget[]>;
  saveBudget(category: string, monthlyLimit: number, alertThreshold: number): Promise<void>;
  deleteBudget(id: string): Promise<void>;
  categories(): Promise<CustomCategory[]>;
  createCategory(kind: 'receita' | 'despesa', name: string): Promise<void>;
  updateCategory(id: string, change: { name?: string; isActive?: boolean }): Promise<void>;
  readAlerts(): Promise<Set<string>>;
  markAlertRead(key: string): Promise<void>;
}

export const GOAL_KINDS: Record<GoalKind, string> = {
  reserva: 'Reserva de emergência',
  viagem: 'Viagem',
  celular: 'Celular',
  carro: 'Carro',
  faculdade: 'Faculdade',
  investimentos: 'Investimentos',
  outra: 'Outra meta',
};
