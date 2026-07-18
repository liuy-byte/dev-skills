# 素材库上传（取 media_id）

上传图片到微信公众号素材库，获取 `media_id` 用于文章封面。

## 环境

- Python 3.8+
- 使用 uv 管理依赖（自动安装 requests）

## 使用方法

```bash
cd ~/.claude/skills/wechat-mp/scripts/media
uv run python upload_media.py --image /path/to/image.png --permanent
```

> 配置含 `app_id`/`app_secret`，**缺失时本 skill 会主动询问并自动生成**（见下「首次配置」），无需手动准备。

## 参数说明

| 参数 | 说明 |
|------|------|
| `--image` | 图片文件路径（必填） |
| `--permanent` | 上传为永久素材（封面必须用） |
| `--config` | 配置文件路径（默认 `$WECHAT_MP_CONFIG`，否则 `~/.config/wechat-mp/config.json`） |

## 首次配置（缺配置时 skill 自动完成）

配置解析顺序：`$WECHAT_MP_CONFIG` → `--config <路径>` → `~/.config/wechat-mp/config.json`。

**若都没有、或文件缺 `app_id`/`app_secret`**：不要报错了事——先**引导用户获取**，再**自动写好配置**。

**① 引导用户获取 AppID / AppSecret**（微信公众平台，需管理员账号）：
1. 登录 <https://mp.weixin.qq.com>
2. 左侧「设置与开发」→「基本配置」，找到「公众号开发信息」区
3. **AppID（开发者ID）** 直接复制；**AppSecret（开发者密码）** 点「重置/显示」，需管理员用绑定微信**扫码确认**，**仅显示一次**，弹出后立即复制
4. 同页「IP 白名单」若已开启，把运行本机的**公网 IP** 加进去（否则换取 access_token 会报 `errcode 40164`）

用普通对话向用户索取这两个值（别用选项式提问塞密钥；用户已有配置也可直接给路径）。

**② skill 自动写入配置**（目录自动建）：

```bash
mkdir -p ~/.config/wechat-mp
cat > ~/.config/wechat-mp/config.json <<'JSON'
{
  "wechat": { "app_id": "<AppID>", "app_secret": "<AppSecret>" }
}
JSON
```

写好后重跑上传命令即可，之后自动读取、不再询问。

> ⚠️ 配置含密钥：放在 `~/.config/` 下（不在任何仓库内），**切勿提交到 git 或写进 skill 仓库**。

## 输出

上传成功后返回 `media_id`，可用于发布文章时指定封面图。

## 微信公众号封面图要求

- 头条封面比例：2.35:1；本 Skill 默认生成 2350×1000 高清母版
- 格式：JPG、PNG
- 大小：不超过 2MB
- 必须上传为永久素材才能在文章中使用

上传接口接受素材文件不代表各展示场景会使用同一裁切。发布前仍需在公众号后台检查头条横图和 1:1 分享缩略图预览。

## 示例

```bash
# 上传封面图
uv run python upload_media.py --image images/docker-14days-cover.jpg --permanent
```

上传成功后直接输出 media_id。
