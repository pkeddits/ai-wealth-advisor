import type { FinanceCategory, FinanceEntry, FinanceEntryInput, FinanceFlow } from '../../types';

export interface FinanceService {
  /** Lançamentos do mês (YYYY-MM), do mais recente ao mais antigo. */
  list(month: string): Promise<FinanceEntry[]>;
  create(input: FinanceEntryInput): Promise<FinanceEntry>;
  update(id: string, input: FinanceEntryInput): Promise<FinanceEntry>;
  /** Corrige categoria e natureza de um lançamento importado (valor e data são preservados). */
  reclassify(id: string, change: { category: FinanceCategory; flow: FinanceFlow; note?: string | null }): Promise<FinanceEntry>;
  delete(id: string): Promise<void>;
}
