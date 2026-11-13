import os
import json
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL', 'http://localhost:4173'); R=[]
def ok(n,c,d=''): R.append((n,bool(c),d))
FPS="""async (ms) => { const t=[]; let last=performance.now(); return await new Promise(res=>{ const end=last+ms; function f(now){ t.push(now-last); last=now; if(now<end) requestAnimationFrame(f); else { t.shift(); t.sort((a,b)=>a-b); const avg=t.reduce((a,b)=>a+b,0)/t.length; res({fps: Math.round(1000/avg), p95: Math.round(t[Math.floor(t.length*0.95)]*10)/10, long: t.filter(x=>x>34).length, frames:t.length}); } } requestAnimationFrame(f); }); }"""
SCROLL="""(dist) => { let y=0; const id=setInterval(()=>{ y+=dist; window.scrollTo(0,y); if(y>document.body.scrollHeight) y=0; }, 16); setTimeout(()=>clearInterval(id), 2600); }"""
with sync_playwright() as p:
    br=p.chromium.launch(args=['--enable-gpu-rasterization'])
    ctx=br.new_context(viewport={'width':1366,'height':860}); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE+'/'); pg.wait_for_timeout(2500)
    pg.screenshot(path='/tmp/motion/landing-0.png')
    pg.evaluate(SCROLL, 22); m=pg.evaluate(FPS, 2500); ok('Landing: medição registrada (CPU, sem GPU)', True, m); print('landing scroll', m)
    for f in (0.35,0.7):
        pg.evaluate(f"window.scrollTo(0, document.body.scrollHeight*{f})"); pg.wait_for_timeout(1400); pg.screenshot(path=f'/tmp/motion/landing-{int(f*100)}.png')
    n=pg.locator('[data-seam]').count()
    for i in range(n):
        pg.locator('[data-seam]').nth(i).scroll_into_view_if_needed(); pg.wait_for_timeout(1400)
    seams=pg.evaluate("[...document.querySelectorAll('[data-seam] > div:first-child')].map(e=>getComputedStyle(e).transform)")
    print('perf após rolagem:', pg.evaluate("document.documentElement.dataset.perf"))
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(600); pg.evaluate(SCROLL, 22); m=pg.evaluate(FPS, 2500); print('landing 2ª rolagem (após detector)', m)
    ok('Landing: costuras desenhadas ao entrar', len(seams)==3 and all(s in ('none','matrix(1, 0, 0, 1, 0, 0)') for s in seams), seams)
    # app
    pg.goto(BASE+'/login'); pg.get_by_role('button', name='Entrar na demonstração').click(); pg.wait_for_url('**/dashboard')
    pg.evaluate("localStorage.setItem('aiwa.preferences.v2:demo', JSON.stringify({tutorialsAuto:false}))"); pg.reload(); pg.wait_for_timeout(900)
    pg.get_by_role('button', name='Carregar carteira de exemplo').click(); pg.wait_for_timeout(900); pg.goto(BASE+'/dashboard'); pg.wait_for_timeout(1500)
    print('area', pg.evaluate("document.documentElement.dataset.area"))
    pg.evaluate(SCROLL, 14); m=pg.evaluate(FPS, 2500); ok('Dashboard: rolagem contínua', m['fps']>=50, m); print('dashboard scroll', m)
    m=pg.evaluate(FPS, 2000); ok('Dashboard ocioso', m['fps']>=55, m); print('dashboard idle', m)
    pg.get_by_role('tab', name='Finanças').or_(pg.get_by_role('button', name='Finanças', exact=True)).first.click(); pg.wait_for_timeout(200)
    pg.screenshot(path='/tmp/motion/dash-switch.png'); pg.wait_for_timeout(800)
    ok('Luz de fundo muda para Finanças', pg.evaluate("document.documentElement.dataset.area")=='financas')
    # finanças: troca de período gera sinal
    pg.goto(BASE+'/financas'); pg.wait_for_timeout(900)
    pg.get_by_role('button', name='Carregar exemplos do mês').click(); pg.wait_for_timeout(1500)
    pg.get_by_role('button', name='Nova movimentação').click(); pg.wait_for_timeout(600)
    pg.locator('[role=dialog] input').first.fill('250')
    pg.locator('[role=dialog] input[type=text], [role=dialog] input:not([type])').last.fill('Teste de movimento')
    pg.locator('[role=dialog] button[type=submit]').first.click(); pg.wait_for_timeout(400)
    cues=pg.evaluate("[...document.querySelectorAll('.value-cue')].map(e=>e.dataset.cue)")
    ok('Finanças: valores sinalizam a mudança ao trocar o período', len(cues)>0 and 'down' in cues, cues)
    pg.screenshot(path='/tmp/motion/finance-cue.png')
    # simulações
    pg.goto(BASE+'/simulations'); pg.wait_for_timeout(1800)
    inp=pg.get_by_label('Aporte mensal (R$)').first; inp.fill('900'); pg.wait_for_timeout(120)
    cues=pg.evaluate("[...document.querySelectorAll('.value-cue')].map(e=>e.dataset.cue)")
    ok('Simulações: resultado sobe e sinaliza', 'up' in cues, cues)
    pg.wait_for_timeout(700); pg.screenshot(path='/tmp/motion/sim.png')
    # motion desligado
    pg.evaluate("localStorage.setItem('aiwa.preferences.v2:demo', JSON.stringify({...JSON.parse(localStorage.getItem('aiwa.preferences.v2:demo')), motion:'off'}))"); pg.reload(); pg.wait_for_timeout(1200)
    inp=pg.get_by_label('Aporte mensal (R$)').first; inp.fill('100'); pg.wait_for_timeout(60)
    txt=pg.locator('dd').nth(1).inner_text()
    disp=pg.evaluate("(()=>{const e=document.querySelector('.value-cue'); return e?getComputedStyle(e,'::after').display:'none'})()")
    ok('Animações desligadas: valor final imediato e sem marca', disp=='none', disp)
    ok('Sem erros de execução', not errs, errs[:3])
    ctx.close()
    # reduced motion do sistema
    ctx=br.new_context(viewport={'width':1366,'height':860}, reduced_motion='reduce'); pg=ctx.new_page(); pg.goto(BASE+'/'); pg.wait_for_timeout(1500)
    t1=pg.evaluate("[...document.querySelectorAll('.fx-decor > div')].map(e=>getComputedStyle(e).transform).join('|')")
    pg.evaluate("window.scrollTo(0, 3000)"); pg.wait_for_timeout(1200)
    t2=pg.evaluate("[...document.querySelectorAll('.fx-decor > div')].map(e=>getComputedStyle(e).transform).join('|')")
    ok('prefers-reduced-motion: atmosfera parada na rolagem', t1==t2, (t1[:80],t2[:80]))
    ctx.close()
    # mobile
    ctx=br.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True); pg=ctx.new_page(); pg.goto(BASE+'/'); pg.wait_for_timeout(1500)
    pg.evaluate(SCROLL, 18); m=pg.evaluate(FPS, 2500); ok('Landing no celular: rolagem ≥ 45 fps', m['fps']>=45, m); print('mobile landing', m)
    br.close()
for n,c,d in R: print('OK   ' if c else 'FALHA', n, '' if c else d)
print(sum(c for _,c,_ in R),'de',len(R))
