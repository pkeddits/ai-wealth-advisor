import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { portfolioService } from '../../services';
import type { Position, Transaction } from '../../types';
import type { TimelinePoint } from '../../components/charts';
import { buildInvestedTimeline } from './investedTimeline';

function listOf<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  const data = (response as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

export interface AggregatedHolding {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: string;
  /** null quando algum ativo não tem cotação. */
  currentValue: number | null;
  investedValue: number;
}

export function useDashboardData() {
  const { portfolios, fetchPortfolios, isLoading, error } = usePortfolioStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const portfolioIds = portfolios.map((p) => p.id).join(',');

  useEffect(() => {
    if (!portfolioIds) {
      setTransactions([]);
      return;
    }
    let cancelled = false;
    setLoadingActivity(true);
    Promise.all(portfolioIds.split(',').map((id) => portfolioService.getByPortfolio(id).then(listOf<Transaction>).catch(() => [])))
      .then((lists) => !cancelled && setTransactions(lists.flat()))
      .finally(() => !cancelled && setLoadingActivity(false));
    return () => {
      cancelled = true;
    };
  }, [portfolioIds, portfolios]);

  const totals = useMemo(() => {
    const totalInvested = portfolios.reduce((s, p) => s + (p.totalInvested || 0), 0);
    const marketAvailable = portfolios.every((p) => p.totalValue !== null);
    if (!marketAvailable) return { totalValue: null, totalInvested, totalReturn: null, totalReturnPct: null, marketAvailable };
    const totalValue = portfolios.reduce((s, p) => s + (p.totalValue as number), 0);
    const totalReturn = totalValue - totalInvested;
    return { totalValue, totalInvested, totalReturn, totalReturnPct: totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0, marketAvailable };
  }, [portfolios]);

  const holdings = useMemo<AggregatedHolding[]>(() => {
    const map = new Map<string, AggregatedHolding>();
    for (const p of portfolios) {
      for (const pos of (p.positions ?? []) as Position[]) {
        const current = map.get(pos.assetId) ?? {
          assetId: pos.assetId,
          symbol: pos.asset?.symbol ?? pos.assetId,
          name: pos.asset?.name ?? '',
          assetClass: pos.asset?.class ?? 'outros',
          currentValue: pos.currentValue === null ? null : 0,
          investedValue: 0,
        };
        current.currentValue = current.currentValue === null || pos.currentValue === null ? null : current.currentValue + pos.currentValue;
        current.investedValue += pos.investedValue || 0;
        map.set(pos.assetId, current);
      }
    }
    return [...map.values()].sort((a, b) => (b.currentValue ?? b.investedValue) - (a.currentValue ?? a.investedValue));
  }, [portfolios]);

  const timeline = useMemo<TimelinePoint[]>(() => {
    try {
      return buildInvestedTimeline(transactions);
    } catch {
      return [];
    }
  }, [transactions]);

  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 6),
    [transactions],
  );

  const refresh = useCallback(() => fetchPortfolios(), [fetchPortfolios]);

  return { portfolios, isLoading, error, totals, holdings, timeline, recent, transactionCount: transactions.length, loadingActivity, refresh };
}
