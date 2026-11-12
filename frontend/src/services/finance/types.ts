import type { FinanceEntry, FinanceEntryInput } from '../../types';

export interface FinanceService {
  /** Lançamentos do mês (YYYY-MM), do mais recente ao mais antigo. */
  list(month: string): Promise<FinanceEntry[]>;
  create(input: FinanceEntryInput): Promise<FinanceEntry>;
  update(id: string, input: FinanceEntryInput): Promise<FinanceEntry>;
  delete(id: string): Promise<void>;
}
