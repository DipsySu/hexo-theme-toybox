'use strict'

const path = require('node:path')

// Hexo's view pattern also matches nested "layout/" directories. The demo's
// generated theme copy must never override views in the installed theme.
const demoPath = path.join(hexo.theme_dir, 'demo').replace(/\\/g, '/')
hexo.theme.ignore.push(demoPath + '/**')
hexo.theme.options.ignored.push(new RegExp(demoPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:/|$)'))
