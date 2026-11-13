import os
from playwright.sync_api import sync_playwright
B=os.environ.get('BASE_URL', 'http://localhost:4173'); R=[]
def ok(n,c,d=''): R.append((n,bool(c),d))
with sync_playwright() as p:
    br=p.chromium.launch(); pg=br.new_page(viewport={'width':1366,'height':900}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B+'/login'); pg.get_by_role('button', name='Entrar na demonstração').click(); pg.wait_for_url('**/dashboard'); ok('Login (demo)', True)
    pg.evaluate("localStorage.setItem('aiwa.preferences.v2:demo', JSON.stringify({tutorialsAuto:false}))"); pg.reload(); pg.wait_for_timeout(900)
    # carteira + operação
    pg.goto(B+'/portfolios'); pg.wait_for_timeout(700); pg.get_by_role('button', name='Nova Carteira').click(); pg.wait_for_timeout(300)
    pg.get_by_label('Nome da carteira').fill('Teste E2E'); pg.get_by_role('dialog').get_by_role('button', name='Criar Carteira').click(); pg.wait_for_timeout(1000)
    ok('Carteira criada', pg.get_by_text('Teste E2E').count()>0)
    pg.get_by_text('Teste E2E').first.click(); pg.wait_for_timeout(1000)
    ok('Detalhe da carteira abre', '/portfolios/' in pg.url, pg.url)
    names=pg.evaluate("[...document.querySelectorAll('main button')].map(b=>b.innerText.trim()).filter(Boolean)")
    op=[n for n in names if 'opera' in n.lower() or 'compra' in n.lower() or 'transa' in n.lower()]
    ok('Ação de registrar operação presente', op, names[:10])
    if op:
        pg.get_by_role('button', name=op[0]).first.click(); pg.wait_for_timeout(500)
        d=pg.get_by_role('dialog')
        fields=pg.evaluate("[...document.querySelectorAll('[role=dialog] label')].map(l=>l.innerText.trim())")
        def fill(label, v):
            for f in fields:
                if label.lower() in f.lower():
                    loc=d.get_by_label(f, exact=True)
                    if loc.evaluate("e=>e.tagName")=='SELECT': loc.select_option(index=1)
                    else: loc.fill(v)
                    return True
        fill('Ativo','PETR4') or fill('Código','PETR4'); fill('Quantidade','10'); fill('Preço','30')
        d.locator('button[type=submit]').click(); pg.wait_for_timeout(1200)
        ok('Operação registrada (posição aparece)', pg.get_by_text('PETR4').count()>0 or pg.get_by_text('10').count()>0, fields)
    # finanças
    pg.goto(B+'/financas'); pg.wait_for_timeout(800)
    pg.get_by_role('button', name='Registrar primeira movimentação').click(); pg.wait_for_timeout(400)
    d=pg.get_by_role('dialog'); d.locator('input').first.fill('123,45'); d.get_by_label('Descrição').fill('Mercado E2E'); d.locator('button[type=submit]').click(); pg.wait_for_timeout(900)
    ok('Movimentação registrada', pg.get_by_text('Mercado E2E').count()>0)
    pg.get_by_role('tab', name='Metas').click(); pg.wait_for_timeout(300); pg.get_by_role('button', name='Nova meta').click(); pg.wait_for_timeout(300)
    d=pg.get_by_role('dialog'); d.get_by_label('Nome').fill('Reserva E2E'); d.get_by_label('Valor-alvo (R$)').fill('5000'); d.get_by_role('button', name='Salvar meta').click(); pg.wait_for_timeout(900)
    ok('Meta criada', pg.get_by_text('Reserva E2E').count()>0)
    pg.get_by_role('tab', name='Orçamentos').click(); pg.wait_for_timeout(300); pg.get_by_role('button', name='Definir orçamento').click(); pg.wait_for_timeout(300)
    d=pg.get_by_role('dialog'); d.get_by_label('Limite mensal (R$)').fill('100'); d.get_by_role('button', name='Salvar').click(); pg.wait_for_timeout(900)
    ok('Orçamento definido', pg.get_by_role('dialog').count()==0 and pg.get_by_text('100,00').count()>0)
    pg.get_by_role('tab', name='Categorias').click(); pg.wait_for_timeout(300)
    pg.get_by_label('Nome da nova categoria').fill('Pet E2E'); pg.get_by_role('button', name='Criar').click(); pg.wait_for_timeout(700)
    ok('Categoria criada', pg.get_by_text('Pet E2E').count()>0)
    # outras páginas
    for path, text in [('/analytics','Receitas'), ('/simulations','Cenário A'), ('/alerts','Verificar agora'), ('/integracoes','Central de Integrações'), ('/settings','Tutoriais e ajuda'), ('/dashboard','Visão geral')]:
        pg.goto(B+path); pg.wait_for_timeout(900); ok(f'Página {path} renderiza', pg.get_by_text(text).count()>0)
    pg.goto(B+'/alerts'); pg.wait_for_timeout(800); ok('Alertas calculados (orçamento estourado ou concentração)', pg.locator('main li').count()>0)
    # preferências e privacidade
    pg.goto(B+'/settings'); pg.wait_for_timeout(800)
    pg.get_by_role('radio', name='Cor 3').click(); pg.wait_for_timeout(300)
    ok('Avatar por gradiente salvo', '"index":2' in pg.evaluate("localStorage.getItem('aiwa.preferences.v2:demo')"))
    pg.locator('header').get_by_role('button', name='Ocultar valores').click(); pg.wait_for_timeout(300)
    ok('Ocultar valores aplica', pg.evaluate("document.documentElement.dataset.hideValues")=='on')
    pg.reload(); pg.wait_for_timeout(900); ok('Preferência persiste após F5', pg.evaluate("document.documentElement.dataset.hideValues")=='on')
    # logout
    pg.locator('header').get_by_role('button', name='Visitante').or_(pg.locator('header button[aria-haspopup=menu]')).first.click(); pg.wait_for_timeout(300)
    pg.get_by_role('menuitem', name='Sair').click(); pg.wait_for_url('**/login'); ok('Logout volta ao login', '/login' in pg.url)
    ok('Logout limpa preferências da memória', pg.evaluate("document.documentElement.dataset.hideValues")=='off')
    pg.goto(B+'/dashboard'); pg.wait_for_timeout(800); ok('Rota protegida redireciona após logout', '/login' in pg.url)
    pg.goto(B+'/settings?x=1'); pg.wait_for_timeout(500); pg.goto(B+'/rota-inexistente'); pg.wait_for_timeout(500); ok('Rota desconhecida não quebra (SPA fallback)', pg.locator('#root').inner_html()!='')
    ok('Sem erros de execução', not errs, errs[:3])
    br.close()
for n,c,d in R: print('OK   ' if c else 'FALHA', n, '' if c else d)
print(sum(c for _,c,_ in R),'de',len(R))
