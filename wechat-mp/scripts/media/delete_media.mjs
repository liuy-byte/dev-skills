#!/usr/bin/env node
// 微信公众号素材删除工具：删除已上传的永久素材。
// 零第三方依赖，使用 Node 18+ 内置 fetch。

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';

const TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/token';

function parseArgs(argv) {
  const args = { force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--media-id') args.mediaId = argv[++i];
    else if (a === '--config') args.config = argv[++i];
    else if (a === '--force') args.force = true;
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

async function deleteMaterial(mediaId, accessToken) {
  const url = `https://api.weixin.qq.com/cgi-bin/material/del_material?access_token=${accessToken}`;
  const data = await (await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_id: mediaId }),
    signal: AbortSignal.timeout(30000),
  })).json();
  if (data.errcode === 0) return { success: true };
  return { error: data.errmsg || 'Unknown error' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.mediaId) { console.error('缺少必填参数 --media-id'); process.exit(1); }

  if (!args.force) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const confirm = await rl.question(`确认删除素材 ${args.mediaId}? (y/N): `);
    rl.close();
    if (confirm.toLowerCase() !== 'y') { console.log('已取消删除'); return; }
  }

  const config = loadConfig(args.config);
  if (!config) return;

  const { app_id: appid, app_secret: secret } = config.wechat || {};
  if (!appid || !secret) { console.log('配置文件中缺少 app_id 或 app_secret'); return; }

  console.log('正在获取 access_token...');
  const accessToken = await getAccessToken(appid, secret);
  if (!accessToken) return;
  console.log('access_token 获取成功');

  console.log(`正在删除素材: ${args.mediaId}`);
  const result = await deleteMaterial(args.mediaId, accessToken);

  if (result.success) console.log('\n删除成功!');
  else console.log(`\n删除失败: ${result.error}`);
}

main();
