const STEPS = [
  { title: 'Crie sua conta', text: 'Cadastro com e-mail e senha. Seus dados ficam vinculados somente à sua conta.' },
  { title: 'Organize suas informações', text: 'Crie carteiras e registre operações. A conexão com bancos chega com o Open Finance.' },
  { title: 'Acompanhe e entenda', text: 'Veja patrimônio, rentabilidade e distribuição. As análises com IA virão depois.' },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="relative scroll-mt-24 border-y border-dark-200/70 bg-white/40">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <h2 className="text-display max-w-xl text-3xl sm:text-4xl">Como funciona</h2>
        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          <span className="absolute left-[19px] top-10 hidden h-px w-[calc(100%-38px)] bg-gradient-to-r from-primary-500/60 via-accent-500/40 to-transparent md:block" aria-hidden="true" />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-primary-500/50 bg-dark-50 font-display text-sm font-semibold text-primary-500">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 max-w-sm text-dark-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
