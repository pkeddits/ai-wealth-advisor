import os
import json, sys
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL', 'http://localhost:4173')
ROUTES=['/','/login','/register','/dashboard','/portfolios','/financas','/ai-analysis','/analytics','/simulations','/alerts','/integracoes','/settings']
WIDTHS=[int(w) for w in (sys.argv[1] if len(sys.argv)>1 else '320,360,390,430,768').split(',')]
SHOT=sys.argv[2] if len(sys.argv)>2 else None
JS="""() => {
 const W = document.documentElement.clientWidth; const out=[];
 for (const el of document.querySelectorAll('body *')) {
   const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
   let a=el, decor=false; while(a&&a!==document.body){const s=getComputedStyle(a); if(s.position==='fixed'||s.pointerEvents==='none'||a.getAttribute('aria-hidden')==='true'){decor=true;break;} a=a.parentElement;} if(decor) continue;
   let p=el.parentElement, clipped=false;
   while(p){const s=getComputedStyle(p); if(['hidden','auto','scroll','clip'].includes(s.overflowX)&&p!==document.body&&p!==document.documentElement){const pr=p.getBoundingClientRect(); if(pr.right<=W+1){clipped=true;break;}} p=p.parentElement;}
   if (!clipped && r.right > W + 1) out.push({tag: el.tagName.toLowerCase(), cls: (el.className&&el.className.baseVal!==undefined?el.className.baseVal:el.className||'').toString().slice(0,70), right: Math.round(r.right), text:(el.innerText||'').slice(0,30)});
 }
 return {sw: document.documentElement.scrollWidth, W, items: out.sort((a,b)=>b.right-a.right).slice(0,6)};
}"""
with sync_playwright() as p:
    b=p.chromium.launch()
    for w in WIDTHS:
        ctx=b.new_context(viewport={'width':w,'height':800}, device_scale_factor=2, is_mobile=w<768, has_touch=w<768)
        pg=ctx.new_page()
        pg.goto(BASE+'/login'); pg.get_by_role('button', name='Entrar na demonstração').click(); pg.wait_for_url('**/dashboard')
        pg.evaluate("localStorage.setItem('aiwa.preferences.v2:demo', JSON.stringify({...JSON.parse(localStorage.getItem('aiwa.preferences.v2:demo')||'{}'), tutorialsAuto:false, tutorialsSeen:['dashboard','carteiras','financas','analise','analytics','simulacoes','integracoes','alertas']}))")
        pg.reload(); pg.wait_for_timeout(800)
        pg.get_by_role('button', name='Carregar carteira de exemplo').click(); pg.wait_for_timeout(800)
        pg.goto(BASE+'/financas'); pg.wait_for_timeout(800)
        pg.get_by_role('button', name='Carregar exemplos do mês').click(); pg.wait_for_timeout(800)
        for r in ROUTES:
            if r in ('/login','/register'):
                c2=b.new_context(viewport={'width':w,'height':800}, is_mobile=w<768, has_touch=w<768); q=c2.new_page(); q.goto(BASE+r)
            else:
                q=pg; c2=None; q.goto(BASE+r)
            q.wait_for_timeout(1300)
            if q.locator('[role=dialog]').count(): q.keyboard.press('Escape'); q.wait_for_timeout(300)
            res=q.evaluate(JS)
            flag='OVERFLOW' if res['sw']>res['W'] or res['items'] else 'ok'
            print(f"{w:4} {r:14} sw={res['sw']} {flag}", json.dumps(res['items'][:3],ensure_ascii=False) if res['items'] else '')
            if SHOT: q.screenshot(path=f"{SHOT}/{w}{r.replace('/','_') or '_home'}.png", full_page=True)
            if c2: c2.close()
        ctx.close()
    b.close()
