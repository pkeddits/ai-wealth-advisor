import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface TimelinePoint {
  date: string;
  value: number;
}

interface TimelineAreaProps {
  data: TimelinePoint[];
  formatValue: (value: number) => string;
  formatDate: (date: string) => string;
  label: string;
  height?: number;
}

interface TooltipPayload {
  active?: boolean;
  payload?: { value: number; payload: TimelinePoint }[];
}

export function TimelineArea({ data, formatValue, formatDate, label, height = 260 }: TimelineAreaProps) {
  const id = useId().replace(/:/g, '');

  const renderTooltip = ({ active, payload }: TooltipPayload) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
      <div className="rounded-xl border border-primary-500/30 bg-surface-raised/95 px-3.5 py-2.5 shadow-float backdrop-blur">
        <p className="text-xs text-dark-500">{formatDate(point.date)}</p>
        <p className="mt-0.5 text-sm font-semibold text-dark-900">{formatValue(point.value)}</p>
        <p className="text-[11px] text-dark-500">{label}</p>
      </div>
    );
  };

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 6, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--violet))" stopOpacity={0.45} />
              <stop offset="60%" stopColor="rgb(var(--indigo))" stopOpacity={0.12} />
              <stop offset="100%" stopColor="rgb(var(--indigo))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgb(var(--azure))" />
              <stop offset="100%" stopColor="rgb(var(--primary-700))" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(var(--dark-200))" strokeDasharray="3 6" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: 'rgb(var(--dark-500))', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis hide domain={['dataMin * 0.9', 'dataMax * 1.05']} />
          <Tooltip content={(props) => renderTooltip(props as unknown as TooltipPayload)} cursor={{ stroke: 'rgb(var(--primary-700))', strokeOpacity: 0.5, strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={`url(#${id}-line)`}
            strokeWidth={2.5}
            fill={`url(#${id}-fill)`}
            dot={false}
            activeDot={{ r: 5, fill: 'rgb(var(--primary-700))', stroke: 'rgb(var(--surface))', strokeWidth: 2 }}
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
