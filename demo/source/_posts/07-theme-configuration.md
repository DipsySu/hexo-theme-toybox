---
title: 主题配置清单
date: 2026-07-09 12:00:00
categories:
  - 使用指南
tags:
  - 配置
  - 部署
cover: /img/home-toybox/card-yellow-scene.jpg
description: 把站点个性化配置放在根目录覆盖文件中，主题更新时不会丢失修改。
---

推荐将主题 `_config.yml` 复制到站点根目录并命名为 `_config.toybox.yml`。头像、
菜单、搜索与默认配色都在覆盖文件中维护。

## 最小覆盖示例

```yml
menu:
  首页: / || fas fa-home
  归档: /archives/ || fas fa-archive

toybox:
  settings:
    color_mode:
      default: auto
    locale:
      default: zh-CN
```

主题本身可以继续通过 Git 更新，而站点配置与文章内容始终留在博客仓库中。
