# Hexo Theme Toybox

[![CI](https://github.com/DipsySu/hexo-theme-toybox/actions/workflows/ci.yml/badge.svg)](https://github.com/DipsySu/hexo-theme-toybox/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-GitHub%20Pages-f14b41)](https://dipsysu.github.io/hexo-theme-toybox/)
[![License](https://img.shields.io/github/license/DipsySu/hexo-theme-toybox)](LICENSE)
[![Hexo](https://img.shields.io/badge/Hexo-%3E%3D5.3-0e83cd?logo=hexo)](https://hexo.io/)

Toybox 是一个独立维护的 Hexo 像素卡带主题。它把首页做成桌面卡带陈列架，
并让文章、分类、标签与归档沿用同一套彩色塑料卡带、轻量导航和阅读排版。

![Toybox 首页预览](docs/cartridge-library-home.jpg)

[打开在线 Demo](https://dipsysu.github.io/hexo-theme-toybox/)

主题所需的布局、样式、脚本、字体、光标和图片都包含在仓库中，不需要向站点
`source` 目录复制额外文件。

## 功能

- 服务端输出卡带架，选中的卡带原位展开，手机端横向浏览
- 同一次构建中跨页面一致的文章封面 fallback，不覆盖文章显式封面
- 键盘切换、触控滚动与分页过渡
- 翻页、读完文章时短暂出现的像素 Sprite 彩蛋，空闲时偶尔出现
- 本机阅读存档，首页可继续上次未读完的文章
- 文章目录、阅读模式、上一篇/下一篇与相关推荐
- 归档、标签、分类、友情链接和 404 页面
- 即开搜索弹窗、失败重试、图片懒加载、Fancybox 和 Share.js
- Light / Dark / Auto 配色
- English / 简体中文 / 繁体中文界面

## 安装

在 Hexo 站点根目录运行：

```bash
git clone --depth=1 https://github.com/DipsySu/hexo-theme-toybox.git themes/toybox
npm install hexo-renderer-pug hexo-renderer-stylus
```

然后在站点 `_config.yml` 中启用主题：

```yml
theme: toybox
```

本地搜索需要额外安装 `hexo-generator-searchdb`；文章字数功能需要
`hexo-wordcount`。未安装时请保持对应选项关闭。

## 配置

将主题的 `_config.yml` 复制为站点根目录 `_config.toybox.yml`，以后只修改站点
覆盖文件，更新主题时就不会覆盖你的配置。

```yml
local_search:
  enable: true
  preload: true

wordcount:
  enable: true

toybox:
  home:
    fallback_covers:
      - src: /img/home-toybox/featured-island.webp
      - src: /img/home-toybox/card-aqua-scene.jpg
  settings:
    enable: true
    color_mode:
      default: auto # light / dark / auto
    locale:
      default: zh-CN # en / zh-CN / zh-TW
```

头像、站点图标和菜单可以通过 `avatar`、`favicon`、`nav` 与 `menu` 配置覆盖。

首页推荐在站点 `_config.yml` 中设置 `per_page: 5`。默认封面优先使用
`cover.default_cover`，未设置时使用主题自带的 `toybox.home.fallback_covers`。
后备图片按文章时间排序循环分配；新增文章可能改变分配。需要永久固定图片的文章
请在 front matter 中显式设置 `cover`。设置 `cover: false` 仍可关闭该文章封面。

页面与组件规范见 [Cartridge Library 设计规范](docs/cartridge-library.md)。

## 更新

```bash
git -C themes/toybox pull --ff-only
npx hexo clean
npx hexo generate
```

更新前请确认个性化配置都保存在站点根目录 `_config.toybox.yml`。
升级后清理 Hexo 缓存，以移除旧布局记录。主题会忽略仓库内 `demo` 的生成目录，
避免本地开发示例站覆盖实际站点的模板。

## 功能边界

阅读存档只保存在当前浏览器中，按站点根路径隔离，不上传、不跨设备同步。
点击首页「继续阅读」才恢复阅读位置，普通文章链接不自动跳转。读完或清除存档
后入口隐藏；清除存档不会重置配色、语言或已读记录。浏览器禁止本地存储时，
文章阅读和导航仍可正常使用。

Toybox 不内置评论系统、聊天、广告、播放器、数学公式、PWA 或 PJAX。这些能力
需要时应作为站点级扩展接入，避免主题重新变成臃肿的集成包。

## 开发

```bash
npm install
npm test
npm pack --dry-run
```

完整页面需要将本仓库放到 Hexo 站点的 `themes/toybox` 后运行站点构建。
提交改动前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

仓库内置了一套不含个人内容的 Pages 示例站：

```bash
npm ci --prefix demo
npm run build --prefix demo
```

构建结果位于 `demo/public`。`main` 分支更新后，GitHub Actions 会自动重新部署
在线 Demo。

## 许可与致谢

Toybox 使用 [Apache-2.0](LICENSE) 许可证。主题早期基于
[Hexo Theme Butterfly](https://github.com/jerryc127/hexo-theme-butterfly) 的
Apache-2.0 代码演进而来，相关署名见 [NOTICE](NOTICE)。Pixelarticons 图标许可见
`source/img/pixel-icons/LICENSE`，Fusion Pixel 字体许可见
`source/fonts/LICENSE-Fusion-Pixel-OFL.txt`。
