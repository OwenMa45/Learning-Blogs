(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const base = document.body.dataset.base || '';
  $('.theme-toggle')?.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('ruiqi-theme', theme); } catch {}
  });
  const dialog = $('#search-dialog'), input = $('#search-input'), status = $('#search-status'), results = $('#search-results');
  let index = null, request = null;
  function renderResults() {
    if (!index) return;
    const q = input.value.trim().toLocaleLowerCase();
    results.replaceChildren();
    if (!q) { status.textContent = '按标题、标签和正文查找。'; return; }
    const words = q.split(/\s+/);
    const matches = index.map(p => {
      const title = p.title.toLocaleLowerCase(), tags = p.tags.join(' ').toLocaleLowerCase();
      const all = `${title} ${tags} ${p.category} ${p.text}`.toLocaleLowerCase();
      return {post:p, score:words.every(w => all.includes(w)) ? words.reduce((s,w)=>s+(title.includes(w)?10:0)+(tags.includes(w)?5:0)+1,0) : 0};
    }).filter(x=>x.score).sort((a,b)=>b.score-a.score);
    status.textContent = matches.length ? `找到 ${matches.length} 篇笔记` : '暂时没有匹配的笔记，试试更短的关键词。';
    for (const {post:p} of matches) {
      const a=document.createElement('a'); a.className='search-result'; a.href=p.url;
      const small=document.createElement('small'); small.textContent=`${p.category} · ${p.date}`;
      const strong=document.createElement('strong'); strong.textContent=p.title;
      const desc=document.createElement('p'); desc.textContent=p.excerpt;
      a.append(small,strong,desc); results.append(a);
    }
  }
  async function openSearch() {
    if (!dialog.open) dialog.showModal();
    input.focus();
    if (index) { renderResults(); return; }
    status.textContent='正在载入笔记索引…';
    try {
      request ||= fetch(`${base}/search.json`).then(r=>{if(!r.ok)throw new Error('Index unavailable');return r.json();});
      index=await request; renderResults();
    } catch {
      request=null; status.textContent='搜索暂时无法加载。你仍可以通过归档浏览文章。';
      results.replaceChildren(); const a=document.createElement('a');a.href=`${base}/archive/`;a.className='search-fallback';a.textContent='打开笔记归档 →';results.append(a);
    }
  }
  $('.search-open')?.addEventListener('click',openSearch);
  $('.search-close')?.addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  input?.addEventListener('input',renderResults);
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}
  });
  const shortcut=$('.search-open kbd');if(shortcut && !/Mac|iPhone|iPad/.test(navigator.platform))shortcut.textContent='Ctrl K';
  $$('.filter').forEach(button=>button.addEventListener('click',()=>{
    $$('.filter').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    let count=0;$$('.post-list .post-row').forEach(row=>{row.hidden=button.dataset.filter!=='all'&&row.dataset.category!==button.dataset.filter;if(!row.hidden)count++;});
    const empty=$('.filter-empty'); if(empty)empty.hidden=!!count;
  }));
  $$('.prose table').forEach(table=>{
    if(table.closest('.table-scroll'))return;const wrapper=document.createElement('div');wrapper.className='table-scroll';wrapper.tabIndex=0;wrapper.setAttribute('role','region');wrapper.setAttribute('aria-label','可横向滚动的数据表');table.before(wrapper);wrapper.append(table);
  });
  $$('.prose pre').forEach(pre=>{
    const code=pre.querySelector('code');if(!code)return;const button=document.createElement('button');button.type='button';button.className='copy-code';button.textContent='复制';button.setAttribute('aria-label','复制代码');pre.append(button);
    button.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(code.textContent);button.textContent='已复制';}
      catch{button.textContent='请选中复制';}
      setTimeout(()=>button.textContent='复制',1800);
    });
  });
  const article=$('#article-content'), bar=$('.reading-progress span');
  if(article && bar){
    const update=()=>{const start=article.getBoundingClientRect().top+window.scrollY-120;const end=Math.max(1,article.offsetHeight-window.innerHeight+180);bar.style.width=`${Math.min(100,Math.max(0,(window.scrollY-start)/end*100))}%`;};
    window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();
    if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){$$('.toc nav a').forEach(a=>a.classList.toggle('active',decodeURIComponent(a.hash.slice(1))===e.target.id));}});},{rootMargin:'-110px 0px -65% 0px'});$$('.prose h2,.prose h3').forEach(h=>observer.observe(h));}
  }
  const demo=$('[data-q-demo]');
  if(demo){
    let q=[0,0,0],step=0,timer=null;const states=['A','B','C'];
    const status=demo.querySelector('.demo-status'),next=demo.querySelector('[data-next]'),play=demo.querySelector('[data-play]');
    function paint(changed=-1){
      demo.querySelectorAll('[data-q]').forEach((cell,i)=>{cell.textContent=q[i].toFixed(3);cell.classList.toggle('changed',i===changed);});
      demo.querySelectorAll('[data-state]').forEach((el,i)=>el.classList.toggle('active',i===step%3));
    }
    function advance(){
      const s=step%3,old=q[s],target=s===2?1:.9*q[s+1];q[s]=old+.5*(target-old);step++;
      status.textContent=`第 ${step} 次更新 · ${states[s]} → ${s===2?'终点':states[s+1]}：目标值 = ${s===2?'1（终止，不再自举）':`0 + 0.9 × ${q[s+1].toFixed(3)} = ${target.toFixed(3)}`}；Q(${states[s]},右) = ${old.toFixed(3)} + 0.5 × (${target.toFixed(3)} − ${old.toFixed(3)}) = ${q[s].toFixed(3)}。`;
      paint(s);
    }
    function stop(){clearInterval(timer);timer=null;play.textContent='自动播放';next.disabled=false;}
    next.addEventListener('click',advance);
    play.addEventListener('click',()=>{if(timer){stop();return;}play.textContent='暂停';next.disabled=true;advance();timer=setInterval(advance,1500);});
    demo.querySelector('[data-reset]').addEventListener('click',()=>{stop();q=[0,0,0];step=0;status.textContent='Q 值从 0 开始。点击「下一步」，观察终点奖励怎样通过后续回合逐渐传回 A。';paint();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});paint();
  }
})();
