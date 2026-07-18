#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信公众号素材上传工具
上传图片到素材库，获取 media_id 用于文章封面
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


def upload_image(image_path: str, access_token: str, permanent: bool = False) -> dict:
    """
    上传图片到素材库

    Args:
        image_path: 图片路径
        access_token: Access token
        permanent: 是否上传为永久素材

    Returns:
        dict: {"media_id": "xxx", "url": "xxx"} 或 {"error": "xxx"}
    """
    if not os.path.exists(image_path):
        print(f"文件不存在: {image_path}")
        return {"error": "File not found"}

    file_size = os.path.getsize(image_path)
    if permanent and file_size > 2 * 1024 * 1024:
        print(f"文件过大: {file_size / 1024 / 1024:.2f}MB，最大 2MB")
        return {"error": "File too large"}

    if permanent:
        url = f"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={access_token}&type=image"
    else:
        url = f"https://api.weixin.qq.com/cgi-bin/media/upload?access_token={access_token}&type=image"

    with open(image_path, 'rb') as f:
        files = {'media': f}
        response = requests.post(url, files=files, timeout=60)
        data = response.json()

    if "media_id" in data:
        return {
            "media_id": data["media_id"],
            "url": data.get("url", "")
        }
    else:
        print(f"上传失败: {data.get('errmsg', 'Unknown error')}")
        return {"error": data.get("errmsg", "Unknown error")}


def main():
    parser = argparse.ArgumentParser(description='微信公众号素材上传工具')
    parser.add_argument('--image', required=True, help='图片文件路径')
    parser.add_argument('--permanent', action='store_true',
                        help='上传为永久素材（封面必须用）')
    parser.add_argument('--config', help='配置文件路径')

    args = parser.parse_args()

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

    # 上传素材
    material_type = "永久" if args.permanent else "临时"
    print(f"正在上传 {material_type}素材: {args.image}")

    result = upload_image(args.image, access_token, args.permanent)

    if "media_id" in result:
        print(f"\n上传成功!")
        print(f"media_id: {result['media_id']}")
        if result.get("url"):
            print(f"url: {result['url']}")
    else:
        print(f"\n上传失败: {result.get('error')}")


if __name__ == '__main__':
    main()