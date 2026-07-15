---
title: 本地搜索
date: 2026-07-10 12:00:00
categories:
  - 使用指南
tags:
  - 搜索
  - Hexo
cover: /img/home-toybox/card-aqua-scene.jpg
description: 搜索索引在静态站点内生成，输入关键词即可匹配标题与文章内容。
---

Demo 已启用 `hexo-generator-searchdb`。点击顶部搜索按钮后，可以搜索“卡带”、
“配色”或“Sprite”查看匹配结果。

## 站点配置

```yml
search:
  path: search.xml
  field: post
  content: true

local_search:
  enable: true
  preload: true
```

搜索完全运行在浏览器中，不需要服务器或第三方账号。
