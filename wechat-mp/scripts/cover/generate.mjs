// 微信公众号封面批量生成（两种版式）
//   mode "series"(默认): 连载版式 — 左侧大 Day 编号 + 右侧主题 + 底部「N 天系列」+ 进度
//   mode "single":       单篇版式 — 居中文章主标题 + 副标题 + 底部公众号品牌名（无编号/进度）
// 用法: node generate.mjs <config.json>
//       node generate.mjs --out <目录> --title "..." [--sub "..."] [--corner "..."] [--name cover]   (单篇快捷模式)
// 持久默认: ~/.config/wechat-mp/config.json (或 $WECHAT_MP_CONFIG) 的 "cover" 段，
//           可配 mode/style/brand/corner/palette 等固定参数，运行时 config/CLI 参数优先。
// 依赖: playwright-core（首次需 npm i，见 SKILL.md）+ 系统 Google Chrome
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function loadPersistentDefaults() {
  const p = process.env.WECHAT_MP_CONFIG || join(homedir(), '.config', 'wechat-mp', 'config.json');
  try { return JSON.parse(readFileSync(p, 'utf8')).cover || {}; } catch { return {}; }
}

const argv = process.argv.slice(2);
let runCfg;
if (argv.length && !argv[0].startsWith('--')) {
  runCfg = JSON.parse(readFileSync(argv[0], 'utf8'));
} else if (argv.length) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--out') a.outDir = argv[++i];
    else if (k === '--title') a.title = argv[++i];
    else if (k === '--sub') a.sub = argv[++i];
    else if (k === '--corner') a.corner = argv[++i];
    else if (k === '--name') a.name = argv[++i];
    else { console.error(`未知参数: ${k}`); process.exit(1); }
  }
  if (!a.outDir || !a.title) { console.error('快捷模式必须提供 --out 与 --title'); process.exit(1); }
  runCfg = { mode: 'single', outDir: a.outDir, items: [{
    name: a.name || 'cover', title: a.title,
    ...(a.sub !== undefined ? { sub: a.sub } : {}),
    ...(a.corner !== undefined ? { corner: a.corner } : {}),
  }] };
} else {
  console.error('用法: node generate.mjs <config.json>\n     node generate.mjs --out <目录> --title "..." [--sub "..."] [--corner "..."] [--name cover]');
  process.exit(1);
}
const cfg = { ...loadPersistentDefaults(), ...runCfg };

const mode = cfg.mode || 'series';
const style = cfg.style || 'dark'; // dark(默认,深色科技底) | light(浅蓝风,仅 single 版式,与技术洋贴图视觉一致)
if (!['series', 'single'].includes(mode)) { console.error(`mode 只支持 series / single，收到: ${mode}`); process.exit(1); }
if (!['dark', 'light'].includes(style)) { console.error(`style 只支持 dark / light，收到: ${style}`); process.exit(1); }
const isLight = style === 'light';
if (isLight && mode !== 'single') { console.error('style:light 仅支持 mode:single'); process.exit(1); }
const items = cfg.items || cfg.days || [];
if (!items.length) { console.error('config 缺少 items / days'); process.exit(1); }
// 持久配置的 corner 作为单篇 kicker 默认值，item 显式给了（含空串关闭）则不覆盖
if (mode === 'single' && cfg.corner) {
  for (const it of items) { if (it && typeof it === 'object' && it.corner === undefined) it.corner = cfg.corner; }
}
if (!cfg.outDir) { console.error('config 缺少 outDir'); process.exit(1); }
mkdirSync(cfg.outDir, { recursive: true });

// 技术洋品牌色（钉死）：dark 以品牌金 #f1c14b 为主色（2026-07 起现行风格）；
// light（小红书贴图风）仍用品牌蓝。个别场景确需换色，可在 config 显式传 palette 覆盖。
const defaultPalette = isLight
  ? { main: '#1f7ae0', light: '#5fa8f0', accent: '#1f7ae0' }
  : { main: '#d99a1f', light: '#f6d47c', accent: '#f1c14b' };
const P = Object.assign(defaultPalette, cfg.palette || {});
for (const [key, color] of Object.entries(P)) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) { console.error(`palette.${key} 必须是 6 位 hex 颜色`); process.exit(1); }
}
const total = cfg.total || items.length;
const dayLabel = cfg.dayLabel || 'DAY';
const ext = cfg.ext || 'jpg';
const quality = cfg.quality || 92;
const scale = cfg.scale || 2;
const maxBytes = cfg.maxBytes || 2 * 1024 * 1024;
if (!['jpg', 'jpeg', 'png'].includes(ext)) { console.error(`ext 只支持 jpg / jpeg / png，收到: ${ext}`); process.exit(1); }
if (!Number.isInteger(quality) || quality < 1 || quality > 100) { console.error('quality 必须是 1–100 的整数'); process.exit(1); }
if (!Number.isInteger(scale) || scale < 1 || scale > 3) { console.error('scale 必须是 1–3 的整数'); process.exit(1); }
if (!Number.isInteger(maxBytes) || maxBytes <= 0) { console.error('maxBytes 必须是正整数'); process.exit(1); }
const prefix = cfg.filePrefix || 'day';
const tagline = cfg.seriesTagline || `${cfg.series || ''} · ${total} 天系列`;
const brand = cfg.brand || cfg.series || '技术洋';
if (mode === 'series' && !cfg.series) { console.error('mode:series 缺少 series'); process.exit(1); }
if (!Number.isInteger(Number(total)) || Number(total) <= 0) { console.error('total 必须是正整数'); process.exit(1); }
for (const [index, item] of items.entries()) {
  if (!item || typeof item !== 'object') { console.error(`第 ${index + 1} 项不是对象`); process.exit(1); }
  if (mode === 'series' && (item.n === undefined || item.n === null || item.n === '')) {
    console.error(`days[${index}].n 不能为空`); process.exit(1);
  }
  if (mode === 'single' && !item.name) { console.error(`items[${index}].name 不能为空`); process.exit(1); }
  if (typeof item.title !== 'string' || !item.title.trim()) {
    console.error(`${mode === 'single' ? 'items' : 'days'}[${index}].title 不能为空`); process.exit(1);
  }
}
// 底部图标 SVG path（默认菱形；Spring 叶子等可在 config.iconPath 覆盖，见 references/cover.md）
const iconPath = cfg.iconPath || 'M12 2 L22 12 L12 22 L2 12 Z';
if (!/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+\-]+$/.test(iconPath)) { console.error('iconPath 包含不支持的字符'); process.exit(1); }

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const titleHtml = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} 不能为空`);
  const tokens = [];
  const tokenized = value
    .replace(/<br\s*\/?>/gi, () => `@@TOKEN_${tokens.push('<br>') - 1}@@`)
    .replace(/<hl>/gi, () => `@@TOKEN_${tokens.push('<hl>') - 1}@@`)
    .replace(/<\/hl>/gi, () => `@@TOKEN_${tokens.push('</hl>') - 1}@@`);
  let escaped = escapeHtml(tokenized);
  tokens.forEach((token, index) => { escaped = escaped.replace(`@@TOKEN_${index}@@`, token); });
  return escaped;
};

const fileName = (value) => {
  const name = String(value);
  if (!name || name === '.' || name === '..' || /[\\/]/.test(name)) {
    throw new Error(`文件名不合法: ${name}`);
  }
  return name;
};

const taglineHtml = escapeHtml(tagline).replace(/·\s*(.+)$/, '· <b>$1</b>');

const hexToRgb = (h) => { const m = h.replace('#', ''); const s = m.length === 3 ? m.split('').map(c => c + c).join('') : m; const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; };
const icon = `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="${iconPath}" fill="${isLight ? '#0b3a6b' : P.main}"/></svg>`;

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1175px; height: 500px; overflow: hidden; }
.cover { position: relative; width: 1175px; height: 500px;
  background:
    radial-gradient(1100px 700px at 18% 30%, ${rgba(P.main, 0.22)}, transparent 60%),
    radial-gradient(900px 600px at 88% 90%, ${rgba(P.main, 0.16)}, transparent 55%),
    linear-gradient(135deg, #0a1320 0%, #0d1b2e 55%, #0a1422 100%);
  font-family: "PingFang SC", "Helvetica Neue", "Arial", sans-serif; overflow: hidden; }
.grid { position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 58px 58px; mask-image: radial-gradient(1000px 600px at 50% 40%, #000 30%, transparent 80%); }
.dot { position: absolute; border-radius: 50%; filter: blur(1px); }
.d1 { width: 8px; height: 8px; background: ${P.main}; top: 64px; left: 540px; opacity: .8; }
.d2 { width: 5px; height: 5px; background: ${P.light}; top: 150px; left: 1010px; opacity: .7; }
.d3 { width: 6px; height: 6px; background: ${P.main}; top: 410px; left: 470px; opacity: .6; }
.d4 { width: 4px; height: 4px; background: ${P.light}; top: 250px; left: 1100px; opacity: .6; }
.icon { width: 30px; height: 30px; }
/* —— 连载版式 —— */
.left { position: absolute; left: 78px; top: 0; height: 500px; width: 360px; display: flex; flex-direction: column; justify-content: center; }
.day-label { font-size: 30px; letter-spacing: 14px; font-weight: 700; color: ${P.accent}; margin-left: 8px; margin-bottom: -18px; }
.day-num { font-family: "SF Pro Display", "Helvetica Neue", Arial, sans-serif; font-size: 268px; line-height: 1; font-weight: 800; letter-spacing: -6px;
  background: linear-gradient(165deg, #ffffff 18%, ${P.light} 70%, ${P.main} 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  text-shadow: 0 8px 40px ${rgba(P.main, 0.25)}; }
.underline { width: 132px; height: 7px; border-radius: 4px; margin-left: 12px; margin-top: 6px; background: linear-gradient(90deg, ${P.main}, ${rgba(P.main, 0)}); }
.divider { position: absolute; left: 470px; top: 132px; height: 236px; width: 2px; background: linear-gradient(180deg, transparent, ${rgba(P.main, 0.45)}, transparent); }
.right { position: absolute; left: 512px; top: 0; height: 500px; width: 600px; display: flex; flex-direction: column; justify-content: center; }
.title { font-size: 58px; font-weight: 800; color: #f4f8ff; line-height: 1.22; letter-spacing: 0.5px; }
.title hl { color: ${P.accent}; }
.subtitle { margin-top: 22px; font-size: 27px; font-weight: 500; color: #9fb3c8; line-height: 1.5; letter-spacing: 0.3px; }
.footer { position: absolute; left: 80px; bottom: 40px; right: 80px; display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 14px; }
.brand-text { font-size: 24px; font-weight: 600; color: #c7d6e6; letter-spacing: 1px; }
.brand-text b { color: ${P.accent}; font-weight: 700; }
.progress { font-size: 23px; font-weight: 600; color: #5f7488; letter-spacing: 2px; font-family: "SF Pro Display", "Helvetica Neue", Arial, sans-serif; }
.progress b { color: ${P.accent}; }
.corner { position: absolute; top: 40px; right: 80px; font-size: 22px; font-weight: 600; color: #6e8298; letter-spacing: 3px; }
/* —— 单篇版式 —— */
.s-wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 92px 30px; text-align: center; }
.s-kicker { font-size: 26px; font-weight: 700; letter-spacing: 7px; color: ${P.accent}; margin-bottom: 24px; }
.s-bar { width: 66px; height: 6px; border-radius: 4px; background: ${P.main}; margin-bottom: 32px; }
.s-title { font-size: 72px; font-weight: 800; color: #f4f8ff; line-height: 1.24; letter-spacing: 0.5px; }
.s-title hl { color: ${P.accent}; }
.s-sub { margin-top: 26px; font-size: 30px; font-weight: 500; color: #9fb3c8; line-height: 1.5; letter-spacing: 0.3px; }
.s-brand { position: absolute; left: 0; right: 0; bottom: 46px; display: flex; align-items: center; justify-content: center; gap: 13px; }
.s-brand span { font-size: 25px; font-weight: 600; color: #c7d6e6; letter-spacing: 1px; }
/* —— 浅蓝风覆盖（style:"light"，仅 single）—— */
.cover.light { background: linear-gradient(150deg, #eef5fd 0%, #dfeafa 55%, #d3e4f8 100%); }
.cover.light .grid { background-image: linear-gradient(${rgba(P.main, 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${rgba(P.main, 0.06)} 1px, transparent 1px);
  background-size: 47px 47px; mask-image: radial-gradient(ellipse at 50% 40%, rgba(0,0,0,.8), transparent 75%); }
.cover.light .dot { filter: none; background: #5a8fd6; }
.cover.light .d1 { opacity: .45; } .cover.light .d2, .cover.light .d3, .cover.light .d4 { opacity: .3; }
.leaf { position: absolute; top: -30px; right: -20px; opacity: .55; }
.cover.light .s-wrap { padding-bottom: 56px; }
.cover.light .s-kicker { color: ${P.main}; margin-bottom: 0; }
.s-kbar { width: 56px; height: 5px; border-radius: 3px; background: ${P.main}; margin: 18px auto 30px; opacity: .85; }
.cover.light .s-title { color: #17335e; font-size: 80px; letter-spacing: 2px; line-height: 1.3; }
.cover.light .s-title hl { color: ${P.main}; }
.cover.light .s-sub { color: #3d5a85; letter-spacing: 3px; margin-top: 24px; }
.cover.light .s-brand span { color: #0b3a6b; font-weight: 800; }`;

const LEAF = `<svg class="leaf" width="310" height="260" viewBox="0 0 300 260">
  <g fill="${P.main}" opacity=".16">
    <path d="M205 25 C 285 60, 305 150, 248 210 C 195 155, 185 90, 205 25 Z"/>
    <path d="M140 65 C 205 100, 222 175, 178 228 C 135 180, 124 118, 140 65 Z" opacity=".65"/>
  </g>
  <path d="M248 210 C 228 145, 218 82, 205 25" stroke="${P.main}" stroke-width="2" fill="none" opacity=".22"/>
</svg>`;

const DOTS = '<div class="dot d1"></div><div class="dot d2"></div><div class="dot d3"></div><div class="dot d4"></div>';
const shell = (inner) => `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>${CSS}</style></head><body><div class="cover${isLight ? ' light' : ''}"><div class="grid"></div>${isLight ? LEAF : ''}${DOTS}${inner}</div></body></html>`;

const htmlSeries = (d) => shell(`
  <div class="corner">${escapeHtml(d.corner)}</div>
  <div class="left"><div class="day-label">${escapeHtml(dayLabel)}</div><div class="day-num">${escapeHtml(d.n)}</div><div class="underline"></div></div>
  <div class="divider"></div>
  <div class="right"><div class="title">${titleHtml(d.title, 'days[].title')}</div><div class="subtitle">${escapeHtml(d.sub)}</div></div>
  <div class="footer">
    <div class="brand">${icon}<span class="brand-text">${taglineHtml}</span></div>
    <div class="progress">${escapeHtml(d.n)} / <b>${escapeHtml(total)}</b></div>
  </div>`);

const htmlSingle = (it) => shell(`
  <div class="s-wrap">
    ${it.corner ? `<div class="s-kicker">${escapeHtml(it.corner)}</div>` : ''}
    ${isLight ? '<div class="s-kbar"></div>' : (it.corner ? '' : '<div class="s-bar"></div>')}
    <div class="s-title">${titleHtml(it.title, 'items[].title')}</div>
    ${it.sub ? `<div class="s-sub">${escapeHtml(it.sub)}</div>` : ''}
  </div>
  <div class="s-brand">${icon}<span>${escapeHtml(brand)}</span></div>`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1175, height: 500 }, deviceScaleFactor: scale });
const usedNames = new Set();
for (const it of items) {
  const page = await context.newPage();
  await page.setContent(mode === 'single' ? htmlSingle(it) : htmlSeries(it), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const issues = await page.evaluate(({ mode }) => {
    const cover = document.querySelector('.cover').getBoundingClientRect();
    const title = document.querySelector(mode === 'single' ? '.s-title' : '.title');
    const rect = title.getBoundingClientRect();
    const lineHeight = Number.parseFloat(getComputedStyle(title).lineHeight);
    const lines = Math.round(rect.height / lineHeight);
    const result = [];
    if (lines > 2) result.push(`标题渲染为 ${lines} 行，最多允许 2 行`);
    if (rect.left < cover.left || rect.right > cover.right || rect.top < cover.top || rect.bottom > cover.bottom) {
      result.push('标题超出封面边界');
    }
    return result;
  }, { mode });
  if (issues.length) throw new Error(issues.join('；'));
  const fname = fileName(it.name ? it.name : `${prefix}${it.n}`);
  if (usedNames.has(fname)) throw new Error(`文件名重复: ${fname}`);
  usedNames.add(fname);
  const out = join(cfg.outDir, `${fname}.${ext}`);
  await page.screenshot(ext === 'png' ? { path: out } : { path: out, type: 'jpeg', quality });
  const bytes = statSync(out).size;
  if (bytes > maxBytes) throw new Error(`${fname}.${ext} 超过 ${(maxBytes / 1024 / 1024).toFixed(1)}MB`);
  await page.close();
  console.log(`✓ ${fname}.${ext} (${1175 * scale}×${500 * scale}, ${(bytes / 1024).toFixed(0)}KB)`);
}
await browser.close();
console.log(`done: ${items.length} covers (${mode}, ${style}) -> ${cfg.outDir}`);
