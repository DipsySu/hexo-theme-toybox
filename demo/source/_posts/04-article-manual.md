---
title: 文章阅读手册
date: 2026-07-12 12:00:00
categories:
  - 阅读体验
tags:
  - 文章页
  - 目录
cover: /img/home-toybox/card-coral-scene.jpg
description: 文章页像一本带索引的游戏说明书，目录、正文和阅读状态各自拥有明确位置。
---

文章页使用说明书式布局：页眉是卡带封套，目录是章节书签，正文保留舒适的阅读
宽度。长文章滚动时，章节状态会同步更新。

## 阅读模式

阅读模式会收起装饰与辅助区域，让正文成为唯一焦点。退出后原来的布局会恢复。

## 代码示例

```js
const theme = 'toybox'
const modes = ['light', 'dark', 'auto']

console.log(`${theme}: ${modes.join(' / ')}`)
```

## 文章之间移动

正文底部提供上一篇、下一篇和相关推荐，保持连续阅读，不需要回到首页重新寻找。
