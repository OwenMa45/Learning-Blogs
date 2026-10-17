import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'dist');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'site.config.json'),'utf8'));
const base=(process.env.BASE_PATH??cfg.basePath).replace(/\/$/,'');
const errors=[];
const all=[];
function walk(d){for(const item of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,item.name);item.isDirectory()?walk(p):all.push(p);}}
walk(dir);
const html=all.filter(f=>f.endsWith('.html'));
const documents=new Map(html.map(f=>[f,fs.readFileSync(f,'utf8')]));
function decode(s){return s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'");}
for(const [file,text] of documents){
  const label=path.relative(dir,file);
  if(!text.includes('lang="zh-CN"')||!text.includes('name="viewport"'))errors.push(`${label}: 缺少语言或移动端信息`);
  if((text.match(/<h1(?:\s|>)/g)||[]).length!==1)errors.push(`${label}: h1 数量不为 1`);
  const ids=[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>decode(m[1]));
  if(new Set(ids).size!==ids.length)errors.push(`${label}: 重复 ID`);
  for(const m of text.matchAll(/(?:href|src)="([^"]+)"/g)){
    const ref=decode(m[1]);
    if(/^(https?:|mailto:|data:)/.test(ref))continue;
    let resolved;
    try{resolved=new URL(ref,`https://example.test${base}/${label}`);}catch{errors.push(`${label}: 无效链接 ${ref}`);continue;}
    if(base&&!(resolved.pathname===base||resolved.pathname.startsWith(base+'/'))){errors.push(`${label}: 子路径错误 ${ref}`);continue;}
    let target=path.join(dir,decodeURIComponent(resolved.pathname.slice(base.length)));
    if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
    if(!fs.existsSync(target)){errors.push(`${label}: 缺少 ${ref}`);continue;}
    if(resolved.hash&&documents.has(target)){
      const id=decodeURIComponent(resolved.hash.slice(1));
      const targetIds=[...documents.get(target).matchAll(/\bid="([^"]+)"/g)].map(m=>decode(m[1]));
      if(!targetIds.includes(id))errors.push(`${label}: 锚点不存在 ${ref}`);
    }
  }
}
const search=JSON.parse(fs.readFileSync(path.join(dir,'search.json'),'utf8'));
for(const p of search){if(!p.title||!p.text||!p.url)errors.push('搜索索引缺少字段');}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Checked ${html.length} HTML pages, internal links, anchors and ${search.length} searchable posts.`);
