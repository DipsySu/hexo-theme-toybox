# Contributing

感谢你帮助改进 Hexo Theme Toybox。

## 开始之前

- Bug 请先搜索现有 Issue，并提供 Hexo、Node.js 和浏览器版本。
- 新功能请说明使用场景、预期交互，以及是否会增加主题体积。
- 与站点内容或第三方插件有关的问题，请先用最小 Hexo 站点复现。

## 本地开发

```bash
npm install
npm test
```

要检查完整页面，请把仓库放到 Hexo 站点的 `themes/toybox`，使用
`hexo clean && hexo generate` 构建，并在桌面和移动视口各检查一次。

## 提交约定

- 一次提交只处理一个清晰的问题。
- 不提交博客文章、站点密钥、部署配置或 `node_modules`。
- 保持现有 Pug、Stylus 和 JavaScript 风格。
- UI 改动请在 Pull Request 中附上前后截图。
- 提交前运行 `npm test` 与 `npm pack --dry-run`。

提交贡献即表示你同意按本项目的 Apache-2.0 许可证发布贡献内容。
