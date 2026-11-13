# Testes de navegador (Fase 9)

Rodam contra o modo demonstração, de preferência no build de produção:

```sh
VITE_APP_MODE=demo npx vite build --outDir /tmp/dist-demo
npx vite preview --outDir /tmp/dist-demo --port 4173
pip install playwright && python -m playwright install chromium
```

| Script | O que verifica |
|---|---|
| `e2e.py` | Fluxos das fases anteriores: carteira, operação, movimentação, meta, orçamento, categoria, páginas, preferências, logout e rotas |
| `audit.py 320,360,390,430,768 [pasta]` | Rolagem horizontal e elementos fora da tela em cada rota e largura; com `pasta`, salva capturas |
| `interact.py` | Mobile: guia, barra inferior, menu, assistente, teclado virtual simulado e paisagem |
| `motion.py` | Quadros por segundo, sinal de mudança de valor, luz por área e respeito às animações reduzidas |

Para outro endereço (por exemplo, a URL da Vercel com uma conta de demonstração), use `BASE_URL=https://... python scripts/browser/e2e.py`.
Os números de quadros por segundo dependem da máquina: em ambiente sem GPU a landing fica bem abaixo de 60 fps.
