import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Reveal } from '../motion';

export function SectionHeading({ eyebrow, title, children, align = 'left', className }: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <Reveal className={clsx(align === 'center' && 'mx-auto text-center', 'max-w-2xl', className)}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-display mt-3 text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.04]">{title}</h2>
      {children && <div className="mt-5 text-lg leading-relaxed text-dark-600">{children}</div>}
    </Reveal>
  );
}
