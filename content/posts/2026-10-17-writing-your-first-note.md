---
title: "从第一篇笔记开始：这个博客怎么写"
date: "2026-10-17"
slug: "writing-your-first-note"
category: "notes"
tags: ["Markdown", "写作指南", "知识整理"]
excerpt: "用一份 Markdown 文件记录理解、代码和疑问。保存到仓库后，文章列表、搜索和归档会自动更新。"
kind: "写作指南"
notice: "博客使用指南 · 可以保留此文，作为以后发布笔记时的速查页。"
draft: false
---

这个博客的文章保存在仓库的 `content/posts/` 目录中。一篇文章就是一个 Markdown 文件；文章列表、专题、归档、搜索索引和 RSS 都由这些文件生成。

## 在 GitHub 上直接写

1. 打开 [文章目录](https://github.com/OwenMa45/Learning-Blogs/tree/main/content/posts)。
2. 点击 **Add file → Create new file**。
3. 输入文件名，例如 `2026-10-18-my-next-note.md`。
4. 填写文章信息与正文，然后点击 **Commit changes**，提交到 `main`。
5. 查看仓库的 **Actions** 页面。部署成功后，刷新博客即可阅读新文章。

首次使用时，需要先在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。后续文章更新会复用已配置的发布流程。

## 一份可以复制的模板

```markdown
---
title: "我今天理解了什么"
date: "2026-10-18"
slug: "my-next-note"
category: "rl"
tags: ["强化学习", "学习笔记"]
excerpt: "用一两句话概括这篇笔记最值得回看的内容。"
kind: "学习笔记"
draft: false
---

先写一句最重要的结论。

## 为什么想弄清这个问题

记录最初的困惑。

## 我的理解

用自己的话解释，再补充例子或代码。

## 还有哪些不确定

留下下一次想验证的问题。

## 参考资料

- [资料标题](https://example.com)
```

文章信息使用一行一个字段的简化 YAML 写法：文字用双引号，标签用 JSON 数组，布尔值用 `true` 或 `false`。正文使用正常 Markdown；文章信息不支持多行 YAML 或嵌套对象。

## 每个字段是什么意思？

| 字段 | 用途 |
| --- | --- |
| `title` | 页面显示的文章标题 |
| `date` | 文章日期，格式 YYYY-MM-DD |
| `slug` | 网址的一部分；使用小写英文、数字和短横线，保持唯一 |
| `category` | 专题编号，例如 rl、embodied、world-models、robotics、notes |
| `tags` | 文章标签，也参与搜索 |
| `excerpt` | 列表和搜索结果中的摘要 |
| `kind` | 可选的文章类型文字 |
| `draft` | true 时不生成公开网页；false 时发布 |
| `featured` | 可选，true 时作为首页推荐候选 |

标题可以随时修改。`slug` 决定文章链接，发布后尽量保持不变，以免以前收藏的链接失效。`draft: true` 只控制网站是否显示文章，文件本身仍然在公开 GitHub 仓库里。

## 代码、图片与公式

代码用三个反引号包围，并标注语言。页面会显示代码块和复制按钮。

图片放进 `public/assets/`，在 Markdown 中引用：

```markdown
![实验装置的说明]({{base}}/assets/my-experiment.png)
```

路径中的前缀由网站构建过程处理；也可以直接使用 `/Learning-Blogs/assets/文件名`。图片说明应当描述图里传达的信息。

简单公式可以使用普通文字和 HTML 的上、下标。下面的表达式不依赖额外在线渲染服务：

<div class="equation">G<sub>t</sub> = r<sub>t+1</sub> + γr<sub>t+2</sub> + γ<sup>2</sup>r<sub>t+3</sub> + …</div>

当前版本不内置 LaTeX 渲染器。如果以后需要大量复杂公式，可以扩展构建脚本，或先把公式导出为 SVG 图像。

## 在电脑上预览与发布

安装 Node.js 22 或更高版本后：

```bash
git clone https://github.com/OwenMa45/Learning-Blogs.git
cd Learning-Blogs
npm run new -- my-next-note "我的下一篇笔记"
npm run build
npm run check
```

新文章默认为草稿，改为 `draft: false` 后才会出现在网站中。构建会输出 `dist/`。本地根目录预览可先设置空的 `BASE_PATH`，具体命令见仓库 README。

发布时只需提交源文件。网站会重新构建，不需要手工编辑 `dist/` 里的 HTML。

## 给未来的自己留下一点线索

一篇有用的笔记不一定很长。可以从三个问题开始：

- 我原来在哪一步理解错了？
- 哪个例子让我真正理解了？
- 下次回来看，需要哪些背景才能接上？

先保存一个足够清楚的版本，再随着学习逐步修订。
