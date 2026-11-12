import { useEffect, useState } from 'react';
import type { FinanceCategory, FinanceEntry, FinanceEntryInput, FinanceFlow, FinanceKind } from '../../types';
import { Button, Input, Modal, Select } from '../../components/common';
import { Segmented } from '../../components/settings';
import { CATEGORIES, categoriesFor } from '../../services/finance';
import { errorMessage } from '../../lib/errorMessage';

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface EntryModalProps {
  isOpen: boolean;
  entry: FinanceEntry | null;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (input: FinanceEntryInput) => Promise<void>;
  onReclassify: (entry: FinanceEntry, change: { category: FinanceCategory; flow: FinanceFlow }) => Promise<void>;
}

export const FLOW_LABELS: Record<FinanceFlow, string> = {
  regular: 'Receita ou despesa',
  transfer: 'Transferência entre contas próprias',
  investment: 'Aplicação ou resgate de investimento',
  card_payment: 'Pagamento de fatura do cartão',
  refund: 'Estorno',
};

const ALL_CATEGORIES = Object.keys(CATEGORIES) as FinanceCategory[];

export function EntryModal({ isOpen, entry, defaultDate, onClose, onSubmit, onReclassify }: EntryModalProps) {
  const imported = !!entry && entry.source !== 'manual';
  const [flow, setFlow] = useState<FinanceFlow>('regular');
  const [kind, setKind] = useState<FinanceKind>('despesa');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<FinanceCategory>('alimentacao');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setKind(entry?.kind ?? 'despesa');
    setAmount(entry ? String(entry.amount) : '');
    setCategory(entry?.category ?? 'alimentacao');
    setDescription(entry?.description ?? '');
    setDate(entry?.occurredOn ?? defaultDate);
    setFlow(entry?.flow ?? 'regular');
    setError('');
  }, [isOpen, entry, defaultDate]);

  const changeKind = (next: FinanceKind) => {
    setKind(next);
    if (!CATEGORIES[category].kinds.includes(next)) setCategory(categoriesFor(next)[0]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (imported && entry) await onReclassify(entry, { category, flow });
      else await onSubmit({ kind, amount: Number(amount.replace(',', '.')), category, description, occurredOn: date });
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar a movimentação.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={imported ? 'Classificar movimentação' : entry ? 'Editar movimentação' : 'Nova movimentação'}>
      {imported && entry ? (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-dark-200/70 bg-dark-50/40 p-4 text-sm">
            <div><dt className="text-dark-500">Valor</dt><dd className="font-medium text-dark-900">{entry.kind === 'receita' ? '+' : '-'}R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</dd></div>
            <div><dt className="text-dark-500">Data</dt><dd className="font-medium text-dark-900">{entry.occurredOn.split('-').reverse().join('/')}</dd></div>
            <div className="col-span-2"><dt className="text-dark-500">Origem</dt><dd className="text-dark-900">{entry.origin ? `${entry.origin.institution}, ${entry.origin.account}` : 'Importado'}</dd></div>
            <div className="col-span-2"><dt className="text-dark-500">Descrição na instituição</dt><dd className="text-dark-900">{entry.description}</dd></div>
          </dl>
          <p className="text-xs text-dark-500">Valor, data e origem vêm da instituição e não podem ser alterados. Sua classificação é mantida nas próximas sincronizações.</p>
          <Select id="entry-flow" label="Natureza" value={flow} onChange={(e) => setFlow(e.target.value as FinanceFlow)} options={(Object.keys(FLOW_LABELS) as FinanceFlow[]).map((f) => ({ value: f, label: FLOW_LABELS[f] }))} />
          <Select id="entry-category" label="Categoria" value={category} onChange={(e) => setCategory(e.target.value as FinanceCategory)} options={ALL_CATEGORIES.map((c) => ({ value: c, label: CATEGORIES[c].label }))} />
          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700" role="alert">{error}</div>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>Salvar classificação</Button>
          </div>
        </form>
      ) : (
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Segmented label="Tipo" value={kind} onChange={changeKind} options={[{ value: 'despesa', label: 'Despesa' }, { value: 'receita', label: 'Receita' }]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="entry-amount" label="Valor (R$)" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          <Input id="entry-date" label="Data" type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Select
          id="entry-category"
          label="Categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value as FinanceCategory)}
          options={categoriesFor(kind).map((c) => ({ value: c, label: CATEGORIES[c].label }))}
        />
        <Input id="entry-description" label="Descrição" placeholder={kind === 'despesa' ? 'Ex.: Mercado do mês' : 'Ex.: Salário'} value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} />
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700" role="alert">{error}</div>}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={saving}>{entry ? 'Salvar alterações' : 'Salvar movimentação'}</Button>
        </div>
      </form>
      )}
    </Modal>
  );
}
