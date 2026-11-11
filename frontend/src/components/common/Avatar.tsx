import clsx from 'clsx';
import { usePreferences } from '../../store/preferencesStore';

export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, rgb(var(--indigo)), rgb(var(--violet)) 55%, rgb(var(--azure)))',
  'linear-gradient(135deg, #7c3aed, #db2777)',
  'linear-gradient(135deg, #0ea5e9, #22c55e)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #14b8a6, #6366f1)',
  'linear-gradient(135deg, #64748b, #1e293b)',
];

export function initialsOf(name?: string) {
  const parts = (name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const SIZES = { sm: 'h-8 w-8 text-xs rounded-lg', md: 'h-9 w-9 text-sm rounded-xl', lg: 'h-20 w-20 text-2xl rounded-3xl' };

export function Avatar({ name, size = 'md', className }: { name?: string; size?: keyof typeof SIZES; className?: string }) {
  const avatar = usePreferences((s) => s.avatar);
  const base = clsx('flex shrink-0 items-center justify-center overflow-hidden font-semibold text-on-brand', SIZES[size], className);
  if (avatar.kind === 'image') {
    return <img src={avatar.dataUrl} alt="" className={clsx(base, 'object-cover')} />;
  }
  return (
    <span className={base} style={{ background: AVATAR_GRADIENTS[avatar.index % AVATAR_GRADIENTS.length] }} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
