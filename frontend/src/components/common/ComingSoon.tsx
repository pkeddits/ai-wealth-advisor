import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Card, CardBody } from './Card';
import { Button } from './Button';

interface ComingSoonProps {
  title: string;
  /** O que a funcionalidade fará quando estiver pronta, em linguagem do usuário */
  description: string;
}

/** Página honesta para módulos que ainda não funcionam. */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-900">{title}</h1>
        <p className="text-dark-600 mt-1">{description}</p>
      </div>
      <Card>
        <CardBody className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-dark-100 flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-dark-500" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-dark-900 mb-2">Em desenvolvimento</h2>
          <p className="text-dark-600 mb-6 max-w-md mx-auto">
            Este módulo ainda não está disponível nesta versão. Enquanto isso, você pode criar carteiras e registrar
            transações.
          </p>
          <Link to="/portfolios">
            <Button>Ir para carteiras</Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
