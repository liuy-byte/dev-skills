#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信公众号素材删除工具
删除已上传的永久素材
"""

import argparse
import json
import os
import requests


def load_config(config_path: str = None):
    """加载配置文件"""
    if config_path is None:
        config_path = os.environ.get('WECHAT_MP_CONFIG') or os.path.expanduser('~/.config/wechat-mp/config.json')

    if not os.path.exists(config_path):
        print(f"配置文件不存在: {config_path}")
        return None

    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_access_token(appid: str, secret: str) -> str:
    """获取 access_token"""
    url = "https://api.weixin.qq.com/cgi-bin/token"
    params = {
        "grant_type": "client_credential",
        "appid": appid,
        "secret": secret
    }

    response = requests.get(url, params=params, timeout=30)
    data = response.json()

    if "access_token" in data:
        return data["access_token"]
    else:
        print(f"获取 access_token 失败: {data.get('errmsg', 'Unknown error')}")
        return None


def delete_material(media_id: str, access_token: str) -> dict:
    """删除永久素材"""
    url = f"https://api.weixin.qq.com/cgi-bin/material/del_material?access_token={access_token}"

    data = {"media_id": media_id}
    response = requests.post(url, json=data, timeout=30)
    result = response.json()

    if result.get("errcode") == 0:
        return {"success": True}
    else:
        return {"error": result.get("errmsg", "Unknown error")}


def main():
    parser = argparse.ArgumentParser(description='微信公众号素材删除工具')
    parser.add_argument('--media-id', required=True, help='素材 media_id')
    parser.add_argument('--config', help='配置文件路径')
    parser.add_argument('--force', action='store_true', help='跳过确认直接删除')

    args = parser.parse_args()

    # 确认删除
    if not args.force:
        confirm = input(f"确认删除素材 {args.media_id}? (y/N): ")
        if confirm.lower() != 'y':
            print("已取消删除")
            return

    # 加载配置
    config = load_config(args.config)
    if not config:
        return

    wechat_config = config.get('wechat', {})
    appid = wechat_config.get('app_id')
    secret = wechat_config.get('app_secret')

    if not appid or not secret:
        print("配置文件中缺少 app_id 或 app_secret")
        return

    # 获取 access_token
    print("正在获取 access_token...")
    access_token = get_access_token(appid, secret)
    if not access_token:
        return
    print("access_token 获取成功")

    # 删除素材
    print(f"正在删除素材: {args.media_id}")
    result = delete_material(args.media_id, access_token)

    if result.get("success"):
        print("\n删除成功!")
    else:
        print(f"\n删除失败: {result.get('error')}")


if __name__ == '__main__':
    main()
