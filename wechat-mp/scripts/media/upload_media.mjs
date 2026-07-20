#!/usr/bin/env node
// 微信公众号素材上传工具：上传图片到素材库，获取 media_id 用于文章封面。
// 零第三方依赖，使用 Node 18+ 内置 fetch / FormData / Blob。

import { readFileSync, existsSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { homedir } from 'node:os';

const TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/token';

function parseArgs(argv) {
  // 默认上传为永久素材（封面用途）；显式 --temp 才走临时素材（仅测试，3 天过期）。
  // --permanent 仍兼容（等价默认行为），无需再手动加。
  const args = { permanent: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--image') args.image = argv[++i];
    else if (a === '--config') args.config = argv[++i];
    else if (a === '--temp') args.permanent = false;
    else if (a === '--permanent') args.permanent = true;
  }
  return args;
}

function loadConfig(configPath) {
  const path = configPath
    || process.env.WECHAT_MP_CONFIG
    || `${homedir()}/.config/wechat-mp/config.json`;
  if (!existsSync(path)) {
    console.log(`配置文件不存在: ${path}`);
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

async function getAccessToken(appid, secret) {
  const url = `${TOKEN_URL}?grant_type=client_credential&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`;
  const data = await (await fetch(url, { signal: AbortSignal.timeout(30000) })).json();
  if (data.access_token) return data.access_token;
  console.log(`获取 access_token 失败: ${data.errmsg || 'Unknown error'}`);
  return null;
}

async function uploadImage(imagePath, accessToken, permanent) {
  if (!existsSync(imagePath)) {
    console.log(`文件不存在: ${imagePath}`);
    return { error: 'File not found' };
  }
  const size = statSync(imagePath).size;
  if (permanent && size > 2 * 1024 * 1024) {
    console.log(`文件过大: ${(size / 1024 / 1024).toFixed(2)}MB，最大 2MB`);
    return { error: 'File too large' };
  }
  const url = permanent
    ? `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`
    : `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${accessToken}&type=image`;

  const form = new FormData();
  form.append('media', new Blob([readFileSync(imagePath)]), basename(imagePath));
  const data = await (await fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) })).json();

  if (data.media_id) return { media_id: data.media_id, url: data.url || '' };
  console.log(`上传失败: ${data.errmsg || 'Unknown error'}`);
  return { error: data.errmsg || 'Unknown error' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.image) { console.error('缺少必填参数 --image'); process.exit(1); }

  const config = loadConfig(args.config);
  if (!config) return;

  const { app_id: appid, app_secret: secret } = config.wechat || {};
  if (!appid || !secret) { console.log('配置文件中缺少 app_id 或 app_secret'); return; }

  console.log('正在获取 access_token...');
  const accessToken = await getAccessToken(appid, secret);
  if (!accessToken) return;
  console.log('access_token 获取成功');

  console.log(`正在上传 ${args.permanent ? '永久' : '临时'}素材: ${args.image}`);
  const result = await uploadImage(args.image, accessToken, args.permanent);

  if (result.media_id) {
    console.log('\n上传成功!');
    console.log(`media_id: ${result.media_id}`);
    if (result.url) console.log(`url: ${result.url}`);
  } else {
    console.log(`\n上传失败: ${result.error}`);
  }
}

main();
