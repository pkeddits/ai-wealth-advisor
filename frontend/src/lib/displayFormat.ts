import { useMemo } from 'react';
import { usePreferences } from '../store/preferencesStore';

const full = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rounded = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** Formatação de valores, datas e resultados de acordo com as preferências do usuário. */
export function useDisplayFormat() {
  const { valueDisplay, dateFormat, returnDisplay } = usePreferences();

  return useMemo(() => {
    const money = (v: number) => (valueDisplay === 'rounded' ? rounded : full).format(v);
    const signedMoney = (v: number) => `${v >= 0 ? '+' : '-'}${money(Math.abs(v))}`;
    const percent = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2).replace('.', ',')}%`;
    const date = (iso: string) => {
      const d = iso.slice(0, 10);
      if (dateFormat === 'aaaa-mm-dd') return d;
      if (dateFormat === 'extenso') return new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
    };
    const result = (absolute: number, pct: number) =>
      returnDisplay === 'percent' ? percent(pct) : returnDisplay === 'absolute' ? signedMoney(absolute) : `${signedMoney(absolute)} (${percent(pct)})`;
    return { money, signedMoney, percent, date, result, rounded: valueDisplay === 'rounded', returnDisplay };
  }, [valueDisplay, dateFormat, returnDisplay]);
}
