import { Link } from 'react-router-dom';
import { Logo } from '../brand';
import { isDemoMode } from '../../config/appMode';

export function SiteFooter() {
  return (
    <footer id="sobre" className="scroll-mt-24 border-t border-dark-200/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo size="sm" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-dark-500">
            Projeto acadêmico desenvolvido para a disciplina Análise e Desenvolvimento de Sistemas II, em 2026.
          </p>
        </div>
        <nav aria-label="Rodapé" className="text-sm">
          <p className="font-medium text-dark-800">Navegação</p>
          <ul className="mt-3 space-y-2 text-dark-500">
            <li><a href="#recursos" className="hover:text-dark-800">Recursos</a></li>
            <li><a href="#como-funciona" className="hover:text-dark-800">Como funciona</a></li>
            <li><Link to="/login" className="hover:text-dark-800">{isDemoMode ? 'Demonstração' : 'Entrar'}</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="font-medium text-dark-800">Avisos</p>
          <p className="mt-3 leading-relaxed text-dark-500">
            Não é uma instituição financeira e não oferece recomendação de investimento. Os valores exibidos nesta
            página são ilustrativos.
          </p>
        </div>
      </div>
    </footer>
  );
}
