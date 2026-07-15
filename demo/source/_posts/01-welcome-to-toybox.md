---
title: 欢迎来到 Toybox
date: 2026-07-15 12:00:00
categories:
  - 使用指南
tags:
  - Toybox
  - Hexo
cover: /img/home-toybox/featured-island.webp
description: 一座装满文章卡带、像素彩蛋与轻巧交互的 Hexo 掌机岛屿。
---

Toybox 把博客首页做成一台可以探索的像素掌机。文章不是排成普通列表，而是装进
不同颜色的卡带里；选中哪一篇，哪一张卡带就进入主屏幕。

## 从这里开始

你可以使用鼠标点击卡带，也可以用左右方向键循环选择。页面底部保存了文章、
标签、分类和本机阅读记录。

> 这套 Demo 使用独立示例文章，不包含作者博客的个人内容。

## 安装主题

```bash
git clone --depth=1 https://github.com/DipsySu/hexo-theme-toybox.git themes/toybox
npm install hexo-renderer-pug hexo-renderer-stylus
```

接着在 Hexo 的 `_config.yml` 中设置 `theme: toybox`，重新生成站点即可。

## 下一步

打开右上角设置按钮，可以体验浅色、深色、自动配色和三种界面语言。
