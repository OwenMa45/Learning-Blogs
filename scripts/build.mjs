import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from './vendor/marked.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const base = (process.env.BASE_PATH ?? cfg.basePath).replace(/\/$/, '');
if (base && !/^\/[A-Za-z0-9_/-]+$/.test(base)) throw new Error('BASE_PATH 必须为空或 /Learning-Blogs 这样的路径');
const url = p => `${base}/${p.replace(/^\//, '')}`;
const abs = p => `${cfg.url}${url(p)}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const strip = s => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const arrow = '<span aria-hidden="true">↗</span>';
const topics = cfg.topics;
const topicFor = id => topics.find(t => t.id === id);

// A deliberately small front matter format: one key per line, JSON arrays for tags.
export function parseFrontMatter(source, filename) {
  const match = source.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: 缺少 --- 包围的文章信息`);
  const meta = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!m) throw new Error(`${filename}: 不支持的文章信息行 ${line}`);
    const value = m[2].trim();
    try { meta[m[1]] = JSON.parse(value); }
    catch { meta[m[1]] = value.replace(/^'(.*)'$/, '$1'); }
  }
  return {meta, body: match[2]};
}

const postDir = path.join(root, 'content/posts');
const used = new Set();
const posts = fs.readdirSync(postDir).filter(f => f.endsWith('.md')).map(filename => {
  const {meta, body} = parseFrontMatter(fs.readFileSync(path.join(postDir, filename), 'utf8'), filename);
  for (const key of ['title', 'date', 'slug', 'category', 'excerpt']) if (typeof meta[key] !== 'string' || !meta[key]) throw new Error(`${filename}: ${key} 必须是非空文本`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || new Date(meta.date).toISOString().slice(0,10) !== meta.date) throw new Error(`${filename}: 日期须为 YYYY-MM-DD`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug) || used.has(meta.slug)) throw new Error(`${filename}: slug 无效或重复`);
  if (!topicFor(meta.category)) throw new Error(`${filename}: 分类不存在，请先编辑 site.config.json`);
  if (meta.tags && (!Array.isArray(meta.tags) || meta.tags.some(t => typeof t !== 'string'))) throw new Error(`${filename}: tags 须为文本数组`);
  if (meta.draft !== undefined && typeof meta.draft !== 'boolean') throw new Error(`${filename}: draft 须为 true 或 false`);
  used.add(meta.slug);
  const toc = [], ids = new Set();
  const md = new Marked({gfm:true, breaks:false});
  md.use({renderer:{heading({tokens, depth}) {
    const text = this.parser.parseInline(tokens);
    const stem = strip(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g,'') || 'section';
    let id = stem, n = 2; while(ids.has(id)) id = `${stem}-${n++}`; ids.add(id);
    if (depth === 2 || depth === 3) toc.push({id, text:strip(text), depth});
    return `<h${depth} id="${esc(id)}">${text}<a class="heading-anchor" href="#${esc(id)}" aria-label="链接到此节">#</a></h${depth}>`;
  }}});
  const html = md.parse(body.replaceAll('{{base}}', base));
  const text = strip(html);
  const minutes = Math.max(1, Math.ceil(((text.match(/[\u4e00-\u9fff]/g)||[]).length + text.replace(/[\u4e00-\u9fff]/g,'').split(/\s+/).length)/300));
  return {...meta, tags:meta.tags || [], body, html, text, minutes, toc, filename, href:url(`posts/${meta.slug}/`)};
}).filter(p => p.draft !== true).sort((a,b) => b.date.localeCompare(a.date) || Number(!!b.featured)-Number(!!a.featured) || a.slug.localeCompare(b.slug));

fs.rmSync(out, {recursive:true, force:true});
fs.mkdirSync(out, {recursive:true});
fs.cpSync(path.join(root, 'public'), out, {recursive:true});
function write(p, text) { const target = path.join(out,p); fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,text); }
const icons = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>'
};
function nav(key) {
  return `<a class="skip-link" href="#main">跳到主要内容</a><header class="site-header"><div class="header-inner"><a class="brand" href="${url('')}" aria-label="Ruiqi 学习手记首页"><span class="brand-mark">r<span>.</span></span><span>Ruiqi <span class="brand-divider">/</span> <span class="brand-cn">学习手记</span></span></a><nav aria-label="主导航">${[['home','笔记',''],['topics','专题','topics/'],['archive','归档','archive/'],['about','关于','about/']].map(([id,title,p])=>`<a href="${url(p)}" ${id===key?'aria-current="page"':''}>${title}</a>`).join('')}</nav><div class="header-actions"><button class="search-open" type="button" aria-label="搜索文章">${icons.search}<span>搜索</span><kbd>⌘ K</kbd></button><button class="theme-toggle icon-button" type="button" aria-label="切换深浅色主题" title="切换深浅色主题">${icons.sun}</button></div></div></header>`;
}
function shell(title, content, {key='', description=cfg.description, canonical='', post=null}={}) {
 const data = post ? {'@context':'https://schema.org','@type':'BlogPosting',headline:post.title,datePublished:post.date,author:{'@type':'Person',name:cfg.author},description:post.excerpt,url:abs(canonical)} : {'@context':'https://schema.org','@type':'WebSite',name:cfg.title,url:abs(''),description:cfg.description};
 return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(title)}${title===cfg.title?'':` · ${esc(cfg.title)}`}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${abs(canonical)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${post?'article':'website'}"><meta property="og:locale" content="zh_CN"><meta property="og:url" content="${abs(canonical)}"><link rel="icon" href="${url('assets/favicon.svg')}" type="image/svg+xml"><link rel="alternate" type="application/rss+xml" title="${esc(cfg.title)}" href="${url('feed.xml')}"><script src="${url('assets/theme.js')}"></script><link rel="stylesheet" href="${url('assets/style.css')}"><script type="application/ld+json">${JSON.stringify(data).replaceAll('<','\\u003c')}</script><script defer src="${url('assets/app.js')}"></script></head><body data-base="${base}">${nav(key)}${content}<footer class="site-footer"><div><a class="footer-brand" href="${url('')}">Ruiqi · 学习手记</a><p>保持好奇。慢慢理解。持续记录。</p></div><div class="footer-links"><a href="${cfg.github}" target="_blank" rel="noopener noreferrer">GitHub ${arrow}</a><a href="${url('feed.xml')}">RSS ${arrow}</a><a href="${url('about/')}">关于本站</a><small>© ${new Date().getFullYear()} Ruiqi</small></div></footer><dialog id="search-dialog" aria-labelledby="search-title"><div class="search-top"><h2 id="search-title">搜索笔记</h2><button type="button" class="search-close" aria-label="关闭搜索">Esc <span aria-hidden="true">×</span></button></div><label class="search-field">${icons.search}<span class="sr-only">关键词</span><input id="search-input" type="search" placeholder="试试 Q-Learning、机器人、Markdown…" autocomplete="off"></label><p id="search-status" role="status">按标题、标签和正文查找。</p><div id="search-results"></div></dialog></body></html>`;
}
function tag(p) { const t=topicFor(p.category); return `<span class="topic-tag ${t.color}">${esc(t.name)}</span>`; }
function meta(p) { return `<span>${esc(p.date.replaceAll('-','.'))}</span><span>·</span><span>${p.minutes} 分钟阅读</span>`; }
function row(p, i=0) { return `<article class="post-row" data-category="${p.category}"><span class="row-number">${String(i+1).padStart(2,'0')}</span><div class="row-content"><div class="post-eyebrow">${tag(p)}<span>${esc(p.kind||'学习笔记')}</span></div><h3><a href="${p.href}">${esc(p.title)}</a></h3><p>${esc(p.excerpt)}</p><div class="post-meta">${meta(p)}</div></div><a class="row-arrow" href="${p.href}" aria-label="阅读：${esc(p.title)}">↗</a></article>`; }
function topicCard(t) { const n=posts.filter(p=>p.category===t.id).length; return `<a class="topic-card" href="${url(`topics/#${t.id}`)}"><span class="topic-dot ${t.color}"></span><div><h3>${esc(t.name)}</h3><p>${esc(t.en)}</p></div><span class="topic-count">${n?`${n} 篇`:'待记录'}</span><span aria-hidden="true">↗</span></a>`; }
function empty() { return '<div class="empty-state"><span>一页空白，也是一个开始。</span><p>这个专题还没有笔记，之后的探索会从这里展开。</p></div>'; }
const featured = posts.find(p=>p.featured)||posts[0];
const home = `<main id="main"><section class="hero wrap"><div class="hero-copy"><p class="eyebrow"><span class="small-dot"></span> A LEARNING NOTEBOOK</p><h1>把好奇，写成<br>可以回看的<span class="ink-underline">理解。</span></h1><p class="hero-description">你好，我是 Ruiqi。这里是我的学习手记。<br>关于强化学习、具身智能，以及从「知道」到「理解」的过程。</p><div class="hero-actions"><a class="button primary" href="#notes">开始阅读 <span>↗</span></a><a class="text-link" href="${url('about/')}">认识我 <span>→</span></a></div><div class="hero-footnote"><span>OBSERVE</span><i></i><span>QUESTION</span><i></i><span>UNDERSTAND</span></div></div><div class="hero-visual"><div class="visual-label"><span>FIELD NOTES / 001</span><span class="visual-pill">Learning in progress</span></div><img src="${url('assets/learning-map.svg')}" alt="学习路径示意：从一个问题出发，在观察、尝试和反馈中逐渐形成理解。" width="560" height="350"><div class="visual-caption"><span>每一次反馈，都让理解更进一步。</span><span>↗</span></div></div></section><div class="section-divider wrap"><span>NOTES, IDEAS & SMALL DISCOVERIES</span><span>写下来，才算真正想过。</span></div><section class="featured-section wrap"><div class="section-heading"><h2>从这里读起<span>START HERE</span></h2><a class="text-link" href="${url('archive/')}">全部笔记 ↗</a></div>${featured?`<a class="featured-card" href="${featured.href}"><div class="featured-copy"><div class="post-eyebrow">${tag(featured)}<span>入门示例</span></div><h2>${esc(featured.title)}</h2><p>${esc(featured.excerpt)}</p><div class="featured-bottom"><div class="post-meta">${meta(featured)}</div><span class="round-arrow">↗</span></div></div><div class="featured-art" aria-hidden="true"><div class="formula-label">FROM VALUES TO ACTIONS</div><div class="q-formula">Q<span>(s, a)</span></div><div class="mini-pipeline"><span>一张表</span><b>→</b><span>一个网络</span><b>→</b><span>一种策略</span></div><div class="formula-note">Q-LEARNING &nbsp; / &nbsp; DQN &nbsp; / &nbsp; DDPG</div></div></a>`:empty()}</section><section class="notes-layout wrap" id="notes"><div><div class="section-heading"><h2>最近的笔记<span>LATEST NOTES</span></h2><span class="quiet">${posts.length} 篇记录</span></div><div class="filters" role="group" aria-label="按专题筛选"><button class="filter active" data-filter="all" aria-pressed="true">全部</button>${topics.filter(t=>posts.some(p=>p.category===t.id)).map(t=>`<button class="filter" data-filter="${t.id}" aria-pressed="false">${esc(t.name)}</button>`).join('')}</div><div class="post-list">${posts.map(row).join('')}</div><p class="filter-empty" hidden>这个专题还没有笔记。</p></div><aside class="sidebar"><div class="section-heading"><h2>探索专题<span>EXPLORE</span></h2></div><div class="topic-list">${topics.map(topicCard).join('')}</div><div class="margin-note"><span class="eyebrow">A NOTE TO SELF</span><p>理解不是一次抵达，<br>而是不断回访。</p><span>留一点空间，给下一个问题。 ↗</span></div></aside></section><section class="closing wrap"><span class="small-dot"></span><p>让今天的一个小问题，成为明天的一点新理解。</p><a href="${url('feed.xml')}">订阅 RSS ↗</a></section></main>`;
write('index.html',shell(cfg.title,home,{key:'home'}));
const pageHead = (en,title,description) => `<div class="page-heading"><p class="eyebrow">${en}</p><h1>${title}</h1><p>${description}</p></div>`;
write('topics/index.html',shell('探索专题',`<main id="main" class="wrap inner-page">${pageHead('TOPICS','沿着一个问题，继续深入。','把分散的笔记连成线，按主题慢慢建立自己的知识地图。')}<div class="topic-index">${topics.map(t=>`<section class="topic-group" id="${t.id}"><div class="topic-group-title"><span class="topic-dot ${t.color}"></span><h2>${esc(t.name)}</h2><span>${esc(t.en)}</span></div><p class="quiet">${esc(t.description)}</p>${posts.filter(p=>p.category===t.id).length?posts.filter(p=>p.category===t.id).map(row).join(''):empty()}</section>`).join('')}</div></main>`,{key:'topics',canonical:'topics/'}));
const years = [...new Set(posts.map(p=>p.date.slice(0,4)))];
write('archive/index.html',shell('笔记归档',`<main id="main" class="wrap inner-page narrow">${pageHead('THE ARCHIVE','时间会留下线索。',`这里收录了 ${posts.length} 篇笔记。每一次记录，都是理解向前的一小步。`)}${years.map(year=>`<section class="archive-year"><h2>${year}<span>${posts.filter(p=>p.date.startsWith(year)).length} 篇</span></h2>${posts.filter(p=>p.date.startsWith(year)).map(p=>`<a class="archive-row" href="${p.href}"><time datetime="${p.date}">${p.date.slice(5).replace('-',' / ')}</time><span>${esc(p.title)}</span><span aria-hidden="true">↗</span></a>`).join('')}</section>`).join('')}</main>`,{key:'archive',canonical:'archive/'}));
write('about/index.html',shell('关于 Ruiqi',`<main id="main" class="wrap inner-page"><div class="about-layout"><div>${pageHead('HELLO, I’M RUIQI','你好，我是 Ruiqi。','这里是一个关于学习、思考与动手实践的个人空间。')}<div class="prose"><p>我关注强化学习、具身智能、视频生成与世界模型，也在探索机器人如何实现稳定、精细的操作。</p><p>这个博客用来沉淀学习过程：把概念讲清楚，把论文拆开理解，把实验里的问题记录下来。内容会随着学习逐步补充和修订。</p><h2>这里会记录什么</h2><ul><li><strong>概念笔记：</strong>从直觉出发，再走到公式和算法。</li><li><strong>论文阅读：</strong>整理问题、方法、证据与仍然没想明白的地方。</li><li><strong>实践复盘：</strong>记录环境、步骤、现象与下一次可以改进的地方。</li></ul><h2>关于内容</h2><p>当前的入门笔记和阅读方法是建站时准备的示例内容，便于体验文章排版与写作流程。它们可以直接修改、扩充或替换。本文不代表已经完成相应实验或取得研究成果。</p><p>如果发现内容有误，欢迎通过仓库 Issue 提出具体问题与参考资料。</p></div><div class="about-links"><a class="button primary" href="${cfg.github}" target="_blank" rel="noopener noreferrer">GitHub ${arrow}</a><a class="button secondary" href="${cfg.homepage}">个人主页 ${arrow}</a><a class="text-link" href="${cfg.repository}/issues">交流与勘误 ↗</a></div></div><aside class="about-card"><span class="monogram">r<span>.</span></span><span class="eyebrow">A WORK IN PROGRESS</span><h2>好奇心是起点，<br>记录是路径。</h2><p>Learning · Building · Reflecting</p><hr><a href="${url('topics/')}">看看我在学什么 ↗</a></aside></div></main>`,{key:'about',canonical:'about/'}));
for (const p of posts) {
 const related=posts.filter(x=>x.slug!==p.slug).slice(0,2);
 const toc=p.toc.map(h=>`<a class="toc-depth-${h.depth}" href="#${esc(h.id)}">${esc(h.text)}</a>`).join('');
 const content=`<div class="reading-progress" aria-hidden="true"><span></span></div><main id="main" class="wrap article-page"><a class="back-link" href="${url('')}">← 返回笔记</a><header class="article-header"><div class="post-eyebrow">${tag(p)}<span>${esc(p.kind||'学习笔记')}</span></div><h1>${esc(p.title)}</h1><p class="article-excerpt">${esc(p.excerpt)}</p><div class="article-byline"><span class="author-avatar">r.</span><strong>${esc(cfg.author)}</strong><div class="post-meta">${meta(p)}</div></div></header><div class="article-layout"><article><div class="article-notice">${esc(p.notice||'学习笔记会持续更新，欢迎交流与勘误。')}</div><div class="prose" id="article-content">${p.html}</div><div class="article-bottom"><div class="tags">${p.tags.map(t=>`<span># ${esc(t)}</span>`).join('')}</div><a href="${cfg.repository}/edit/main/content/posts/${encodeURIComponent(p.filename)}" target="_blank" rel="noopener noreferrer">在 GitHub 编辑 ↗</a></div><section class="related"><h2>接着读</h2>${related.map(row).join('')}</section></article><aside class="toc"><div class="toc-inner"><p class="eyebrow">ON THIS PAGE / 本文目录</p><nav aria-label="本文目录">${toc}</nav><a class="toc-top" href="#main">回到顶部 ↑</a></div></aside></div></main>`;
 write(`posts/${p.slug}/index.html`,shell(p.title,content,{key:'home',description:p.excerpt,canonical:`posts/${p.slug}/`,post:p}));
}
write('404.html',shell('页面未找到',`<main id="main" class="wrap inner-page error-page"><span class="error-number">404</span><h1>这页笔记，暂时迷路了。</h1><p>链接可能已经变更，回到首页继续探索吧。</p><a class="button primary" href="${url('')}">返回首页 ↗</a></main>`,{canonical:'404.html'}));
write('search.json',JSON.stringify(posts.map(p=>({title:p.title,excerpt:p.excerpt,category:topicFor(p.category).name,tags:p.tags,date:p.date,url:p.href,text:p.text}))));
write('feed.xml',`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(cfg.title)}</title><link>${abs('')}</link><description>${esc(cfg.description)}</description><language>zh-cn</language>${posts.map(p=>`<item><title>${esc(p.title)}</title><link>${abs(`posts/${p.slug}/`)}</link><guid isPermaLink="true">${abs(`posts/${p.slug}/`)}</guid><pubDate>${new Date(p.date+'T00:00:00+08:00').toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join('')}</channel></rss>`);
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','topics/','archive/','about/',...posts.map(p=>`posts/${p.slug}/`)].map(p=>`<url><loc>${esc(abs(p))}</loc></url>`).join('')}</urlset>`);
write('.nojekyll','');
console.log(`Built ${posts.length} published posts into dist/ (base path: ${base||'/'})`);
