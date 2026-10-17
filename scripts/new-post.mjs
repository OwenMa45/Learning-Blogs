import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [slug,...parts]=process.argv.slice(2);
if(!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!parts.length){console.error('用法：npm run new -- my-post "文章标题"');process.exit(1);}
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const target=path.join(root,'content/posts',`${date}-${slug}.md`);
const text=`---\ntitle: ${JSON.stringify(parts.join(' '))}\ndate: "${date}"\nslug: "${slug}"\ncategory: "notes"\ntags: []\nexcerpt: "这里写文章摘要。"\nkind: "学习笔记"\ndraft: true\n---\n\n先写一句最重要的结论。\n\n## 问题从哪里来\n\n## 我的理解\n\n## 还想验证什么\n\n## 参考资料\n`;
fs.writeFileSync(target,text,{flag:'wx'});
console.log(`已创建 ${path.relative(root,target)}（草稿，发布前请设 draft: false）`);
