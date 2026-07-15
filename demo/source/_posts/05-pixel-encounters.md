---
title: 像素彩蛋图鉴
date: 2026-07-11 12:00:00
categories:
  - 像素世界
tags:
  - Sprite
  - 彩蛋
cover: /img/home-toybox/featured-island.png
description: 原创 32×32 Sprite 会在页面边缘随机出现，为阅读过程增加一点探索感。
---

Toybox 的环境彩蛋来自一张合并后的 Sprite Atlas。页面会根据可用边距、页面类型
和随机种子选择少量角色，不会遮挡正文或控制按钮。

## 出现规则

1. 窄屏设备自动减少或关闭边缘角色。
2. 首页、集合页和文章页使用不同数量的 Sprite。
3. 关闭像素动效后停止移动动画。
4. 系统要求减少动态效果时自动降级。

## 测试台

设置面板中保留了 Sprite 测试台，可以一次查看 Atlas 中的素材，方便主题开发时
检查透明边缘、颜色和缩放效果。
