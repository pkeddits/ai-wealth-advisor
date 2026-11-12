import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EXPENSE_COLOR, INCOME_COLOR } from './palette';

export interface DailyPoint {
  day: string;
  income: number;
  expenses: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: DailyPoint }[];
}

export function DailyBars({ data, formatValue, formatDay, height = 220 }: { data: DailyPoint[]; formatValue: (v: number) => string; formatDay: (d: string) => string; height?: number }) {
  const renderTooltip = ({ active, payload }: TooltipProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="rounded-xl border border-dark-200 bg-surface-raised/95 px-3.5 py-2.5 shadow-float backdrop-blur">
        <p className="text-xs text-dark-500">{formatDay(p.day)}</p>
        {p.income > 0 && <p className="mt-0.5 text-sm font-medium text-green-600">+{formatValue(p.income)}</p>}
        {p.expenses > 0 && <p className="mt-0.5 text-sm font-medium text-red-600">-{formatValue(p.expenses)}</p>}
      </div>
    );
  };

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={3}>
          <CartesianGrid vertical={false} stroke="rgb(var(--dark-200))" strokeDasharray="3 6" />
          <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(8, 10)} tick={{ fill: 'rgb(var(--dark-500))', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={(props) => renderTooltip(props as unknown as TooltipProps)} cursor={{ fill: 'rgb(var(--dark-100) / 0.6)' }} />
          <Bar dataKey="income" fill={INCOME_COLOR} radius={[6, 6, 2, 2]} maxBarSize={16} animationDuration={900} />
          <Bar dataKey="expenses" fill={EXPENSE_COLOR} radius={[6, 6, 2, 2]} maxBarSize={16} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
