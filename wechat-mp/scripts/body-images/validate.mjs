#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const args = process.argv.slice(2);
const options = {
  width: 2160,
  height: 1440,
  count: null,
  maxMb: 10,
};
const files = [];

const takeNumber = (flag, index) => {
  const raw = args[index + 1];
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${flag} 需要正数`);
  }
  return value;
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--width') {
    options.width = takeNumber(arg, i);
    i += 1;
  } else if (arg === '--height') {
    options.height = takeNumber(arg, i);
    i += 1;
  } else if (arg === '--count') {
    options.count = takeNumber(arg, i);
    i += 1;
  } else if (arg === '--max-mb') {
    options.maxMb = takeNumber(arg, i);
    i += 1;
  } else if (arg === '--help' || arg === '-h') {
    console.log('用法: node validate.mjs <图片...> [--width 2160] [--height 1440] [--count N] [--max-mb 10]');
    process.exit(0);
  } else if (arg.startsWith('--')) {
    throw new Error(`未知参数: ${arg}`);
  } else {
    files.push(resolve(arg));
  }
}

if (!files.length) {
  throw new Error('至少传入一张正文图片');
}

const pngSize = (buffer) => {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature || buffer.length < 24) {
    throw new Error('PNG 文件头无效');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const jpegSize = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error('JPEG 文件头无效');
  }
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if (sofMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  throw new Error('无法读取 JPEG 尺寸');
};

const errors = [];
const hashes = new Map();

if (options.count !== null && files.length !== options.count) {
  errors.push(`图片数量应为 ${options.count}，实际为 ${files.length}`);
}

for (const file of files) {
  if (!existsSync(file)) {
    errors.push(`文件不存在: ${file}`);
    continue;
  }

  const extension = extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(extension)) {
    errors.push(`格式不支持: ${file}`);
    continue;
  }

  try {
    const stat = statSync(file);
    const mb = stat.size / 1024 / 1024;
    if (!stat.isFile() || stat.size === 0) errors.push(`文件为空或不是普通文件: ${file}`);
    if (mb > options.maxMb) errors.push(`文件超过 ${options.maxMb}MB: ${file}`);

    const buffer = readFileSync(file);
    const size = extension === '.png' ? pngSize(buffer) : jpegSize(buffer);
    if (size.width !== options.width || size.height !== options.height) {
      errors.push(`尺寸不符: ${file}，实际 ${size.width}×${size.height}，要求 ${options.width}×${options.height}`);
    }

    const hash = createHash('sha256').update(buffer).digest('hex');
    if (hashes.has(hash)) {
      errors.push(`发现重复图片: ${file} 与 ${hashes.get(hash)}`);
    } else {
      hashes.set(hash, file);
    }
    console.log(`✓ ${file}  ${size.width}×${size.height}  ${mb.toFixed(2)}MB`);
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
  }
}

if (errors.length) {
  console.error('\n正文配图校验失败：');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`\n通过：${files.length} 张正文配图`);
