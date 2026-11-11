import { Link } from 'react-router-dom';
import { Logo } from '../brand';
import { isDemoMode } from '../../config/appMode';

const LINKS = [
  { href: '#investimentos', label: 'Investimentos' },
  { href: '#financas', label: 'Finanças pessoais' },
  { href: '#recursos', label: 'Recursos' },
  { href: '#como-funciona', label: 'Como funciona' },
];

export function SiteFooter() {
  return (
    <footer id="sobre" className="scroll-mt-28 border-t border-dark-200/60 bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.5fr_1fr_1.2fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-dark-500">
            Projeto acadêmico desenvolvido para a disciplina Análise e Desenvolvimento de Sistemas II, em 2026.
          </p>
        </div>
        <nav aria-label="Rodapé" className="text-sm">
          <p className="font-medium text-dark-800">Produto</p>
          <ul className="mt-4 space-y-2.5 text-dark-500">
            {LINKS.map((l) => (
              <li key={l.href}><a href={l.href} className="link-underline hover:text-dark-800">{l.label}</a></li>
            ))}
            <li><Link to="/login" className="link-underline hover:text-dark-800">{isDemoMode ? 'Demonstração' : 'Entrar'}</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="font-medium text-dark-800">Avisos</p>
          <p className="mt-4 leading-relaxed text-dark-500">
            Não é uma instituição financeira e não oferece recomendação de investimento. Os valores exibidos nesta página são ilustrativos.
          </p>
        </div>
      </div>
    </footer>
  );
}
