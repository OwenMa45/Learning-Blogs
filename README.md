# Ruiqi · 学习手记

中文个人学习博客，记录强化学习、具身智能、世界模型与机器人实践。

预期站点地址：**https://owenma45.github.io/Learning-Blogs/**（首次启用 Pages 并完成部署后生效）。

## 第一次发布

1. 打开 [Settings → Pages](https://github.com/OwenMa45/Learning-Blogs/settings/pages)。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
3. 打开 [Actions](https://github.com/OwenMa45/Learning-Blogs/actions/workflows/pages.yml)，选择 **Build and deploy blog → Run workflow → main → Run workflow**。如果原有部署失败，也可以选择 **Re-run failed jobs**。
4. 等待 `build` 与 `deploy` 均成功，再打开上方地址。

工作流只使用 GitHub 自带的 `GITHUB_TOKEN`，不需要个人 Token。首次启用 Pages 是仓库管理设置，需要仓库管理员完成。源码提交后的构建和部署由 Actions 自动完成。

## 新增文章（直接在网页上操作）

打开 [content/posts](https://github.com/OwenMa45/Learning-Blogs/tree/main/content/posts)，点击 **Add file → Create new file**，使用下面的格式填写 `YYYY-MM-DD-slug.md`，提交到 `main`：

```markdown
---
title: "我的学习笔记"
date: "2026-10-18"
slug: "my-learning-note"
category: "rl"
tags: ["强化学习", "实践"]
excerpt: "一两句话介绍这篇笔记。"
kind: "学习笔记"
draft: false
---

先写最重要的结论。

## 我的理解

正文支持 Markdown、代码、表格与 HTML。

## 参考资料
```

- 支持的分类：`rl`、`embodied`、`world-models`、`robotics`、`notes`。修改 `site.config.json` 可以新增分类、调整名称和站点信息。
- `slug` 必须唯一，只能包含小写英文、数字和短横线；发布后尽量不要修改。
- `draft: true` 不生成网站页面，也不进入搜索、RSS 和站点地图。源文件仍存在于公开仓库。
- `featured: true` 可将文章作为首页推荐候选；多个候选按日期降序取第一个。
- `date` 仅用于排序与展示，并不是定时发布开关。
- 文章信息支持单行字段、双引号文本、布尔值和 JSON 数组；不支持多行 YAML、嵌套结构。
- 图片放在 `public/assets/`，正文可写 `![说明]({{base}}/assets/example.png)`，`{{base}}` 构建时会替换为站点前缀。
- 初始的三篇文章为建站示例与使用指南；可以修改、删除或改成草稿。

## 本地开发

需要 Node.js 22 或更高版本。Markdown 解析器随仓库附带，无需 `npm install`。

```bash
git clone https://github.com/OwenMa45/Learning-Blogs.git
cd Learning-Blogs
npm run new -- my-next-note "我的下一篇笔记"
npm run build
npm run check
```

`npm run new` 使用北京时间日期创建草稿，不会覆盖已有同名文件。把 `draft` 改为 `false` 后再构建。

默认构建为 GitHub 项目站点（`/Learning-Blogs/`）。在电脑上预览根目录版本：

```bash
# macOS / Linux
BASE_PATH='' npm run build
BASE_PATH='' npm run check
python3 -m http.server 8000 --directory dist
```

```powershell
# Windows PowerShell
$env:BASE_PATH=''
npm run build
npm run check
python -m http.server 8000 --directory dist
```

访问 `http://localhost:8000/`。预览后，macOS/Linux 无需清理临时变量；PowerShell 运行 `Remove-Item Env:BASE_PATH` 恢复默认。不要直接双击 HTML 文件，因为全文搜索通过 HTTP 加载索引。

## 结构

| 路径 | 用途 |
| --- | --- |
| `content/posts/` | Markdown 文章 |
| `site.config.json` | 名称、网址、作者、专题 |
| `public/assets/` | CSS、JavaScript、图片 |
| `scripts/build.mjs` | 生成页面、目录、搜索、RSS、站点地图 |
| `scripts/new-post.mjs` | 新建草稿 |
| `scripts/check.mjs` | 检查页面与内部链接 |
| `.github/workflows/pages.yml` | 自动构建及 GitHub Pages 部署 |
| `dist/` | 本地构建产物，已加入 Git 忽略 |

## 已有功能

- 中文阅读排版，手机与桌面布局，深浅色切换。
- 标题、标签与正文搜索（Ctrl/Cmd + K）。
- 专题筛选、归档、文章目录、阅读进度与代码复制。
- RSS、站点地图、文章元信息、404 页面。
- Q 值更新交互示例，支持单步、播放、暂停与重置。
- 不使用访问统计、广告、登录或后端数据库。

正文与导航由构建生成，JavaScript 关闭时仍可阅读；搜索、筛选和交互演示需要 JavaScript。当前不包含语法着色、LaTeX 渲染器或 Markdown 在线编辑后台。数学表达式可用 HTML 上下标、MathML 或 SVG 图片。

## 第三方许可

Markdown 解析使用 Marked **17.0.5**，以 MIT 许可证分发，原始许可证见 `scripts/vendor/MARKED-LICENSE.md`。压缩文件保留其上游声明。其余站点代码与示例内容保留作者权利，未指定额外开放许可证。
