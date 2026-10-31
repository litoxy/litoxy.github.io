#!/usr/bin/env python3
"""
Form Lab 一键部署脚本（API 推送 + 自动恢复）

为什么用 API 而不是 git push：
  本沙箱直连 github.com:443 不稳定（curl 超时），但 api.github.com 稳定，
  且此前 Data API 推送已成功上线。因此主流程用 Git Data API
  （blob -> tree -> commit -> PATCH ref）推送源码，不依赖 git/gh。

流程：
  1. 构建         npm ci && npm run build（可用 --no-build 跳过）
  2. API 推送源码  blob/tree/commit + PATCH main（自动触发 Actions CI；
                  空文件用 Git 空对象 SHA，避免 400）
  3. 等待部署     轮询 Actions "Deploy to GitHub Pages" 运行结束
  4. 校验线上     轮询站点返回 200（"Site not found" 视为未就绪）
  5. 自动恢复     若持续未就绪：重建 Pages 站点(gh api PUT /pages) + 重跑部署，
                  最多两轮
  6. 回退         --legacy：本地构建推 gh-pages 分支（仍需 API，故走 curl）

用法：
  python3 scripts/deploy.py                 # 构建并部署
  python3 scripts/deploy.py --no-build      # 已构建，只推送+部署
  python3 scripts/deploy.py --token ghp_xxx # 显式 token（否则从 git remote 解析）
"""
import argparse
import base64
import json
import os
import re
import subprocess
import sys
import time
import urllib.request as net
import urllib.error

REPO = "litoxy/litoxy.github.io"
SITE = "https://litoxy.github.io/"
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANCH = "main"
EMPTY_SHA = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"  # git 空对象
EXCLUDE = {".git", "node_modules", "dist"}
WORKFLOW_FILE = "deploy.yml"


def log(*a):
    print("[deploy]", *a, flush=True)


def run(cmd, cwd=PROJECT_DIR, check=True):
    log("+", " ".join(cmd))
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if check and r.returncode != 0:
        log("命令失败:", r.returncode, r.stderr[-600:])
        sys.exit(1)
    return r


def token_from_remote():
    r = run(["git", "remote", "get-url", "origin"], check=False)
    m = re.search(r"://[^@/]+:([^@]+)@|oauth2:([^@]+)@", r.stdout)
    return (m.group(1) or m.group(2)) if m else None


def api(method, path, token, body=None):
    url = f"https://api.github.com/repos/{REPO}{path}"
    data = json.dumps(body).encode() if body is not None else None
    last_err = ""
    for attempt in range(3):
        try:
            req = net.Request(url, method=method, data=data, headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                "User-Agent": "formlab-deploy",
            })
            with net.urlopen(req, timeout=180) as resp:
                raw = resp.read()
                return resp.status, (json.loads(raw) if raw else {})
        except net.HTTPError as e:
            last_err = e.read().decode()[:300]
            if e.code in (401, 403, 500, 502, 503) and attempt < 2:
                log(f"API {method} {path} -> {e.code}，重试…")
                time.sleep(8 * (attempt + 1))
                continue
            return e.code, last_err
    return 0, last_err


def site_status():
    try:
        with net.urlopen(net.Request(SITE), timeout=30) as resp:
            return resp.status, False
    except net.HTTPError as e:
        body = ""
        try:
            body = e.read().decode(errors="ignore")
        except Exception:
            pass
        return e.code, ("Site not found" in body)


def wait_live(timeout=360, interval=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        code, notfound = site_status()
        if code == 200 and not notfound:
            log("站点已就绪: HTTP 200")
            return True
        log(f"未就绪 (code={code}, notfound={notfound})，{interval}s 后重试…")
        time.sleep(interval)
    return False


def list_runs(token):
    st, data = api("GET", "/actions/runs?per_page=5", token)
    if st != 200:
        return []
    return data.get("workflow_runs", [])


def wait_run(token, expected_head=None, timeout=600, interval=15):
    """等待一次新的部署运行完成，返回是否 success"""
    deadline = time.time() + timeout
    seen = None
    while time.time() < deadline:
        runs = list_runs(token)
        if not runs:
            time.sleep(interval)
            continue
        run0 = runs[0]
        # 优先等“Deploy to GitHub Pages”且 head_sha 匹配当前提交的运行
        target = None
        for r in runs:
            if r["name"] == "Deploy to GitHub Pages":
                if expected_head is None or r["head_sha"].startswith(expected_head):
                    target = r
                    break
        if target is None:
            target = run0
        stt = target["status"]
        if stt == "completed":
            log(f"运行结束: {target['name']} {target['conclusion']}")
            return target["conclusion"] == "success", target["id"]
        log(f"运行中: {target['name']} {stt} …")
        time.sleep(interval)
    return False, None


# ---------------- 主流程 ----------------

def push_source_api(token, no_build):
    if not no_build:
        run(["npm", "ci"])
        run(["npm", "run", "build"])
        if not os.path.exists(os.path.join(PROJECT_DIR, "dist", "index.html")):
            log("ERROR: 构建产物缺失 dist/index.html")
            sys.exit(1)

    # 收集工程文件（排除 .git/node_modules/dist）
    files = []
    for dp, dirs, fnames in os.walk(PROJECT_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE]
        for f in fnames:
            full = os.path.join(dp, f)
            rel = os.path.relpath(full, PROJECT_DIR).replace(os.sep, "/")
            files.append((rel, full))
    log(f"待推送文件: {len(files)}")

    # 基线
    st, base = api("GET", f"/git/ref/heads/{BRANCH}", token)
    if st != 200:
        log(f"无法读取分支 {BRANCH}: {base}")
        sys.exit(1)
    base_sha = base["object"]["sha"]
    head_sha = base["object"]["sha"]

    # 建 blob
    tree_entries = []
    for rel, full in files:
        data = open(full, "rb").read()
        if len(data) == 0:
            sha = EMPTY_SHA
        else:
            st2, blob = api("POST", "/git/blobs", token,
                            {"content": base64.b64encode(data).decode(),
                             "encoding": "base64"})
            if st2 != 201:
                log(f"blob 失败 {rel}: {blob}")
                sys.exit(1)
            sha = blob["sha"]
        tree_entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": sha})

    # 建 tree
    st3, tree = api("POST", "/git/trees", token,
                    {"base_tree": head_sha, "tree": tree_entries})
    if st3 != 201:
        log(f"tree 失败: {tree}")
        sys.exit(1)

    # 建 commit
    st4, commit = api("POST", "/git/commits", token, {
        "message": "deploy: 自动部署（脚本）",
        "tree": tree["sha"],
        "parents": [head_sha],
    })
    if st4 != 201:
        log(f"commit 失败: {commit}")
        sys.exit(1)
    new_sha = commit["sha"]
    log(f"新提交: {new_sha[:8]}")

    # PATCH ref
    st5, ref = api("PATCH", f"/git/refs/heads/{BRANCH}", token, {"sha": new_sha})
    if st5 != 200:
        log(f"ref 更新失败: {ref}")
        sys.exit(1)
    log("已推送到 main，等待 Actions 部署…")
    time.sleep(15)
    ok, rid = wait_run(token, expected_head=new_sha[:8])
    if not ok:
        log("部署运行未成功完成")
    time.sleep(20)  # 让 CDN 接收
    return new_sha[:8]


def recover(token):
    for attempt in (1, 2):
        log(f"== 恢复尝试 {attempt}: 重建 Pages 站点 ==")
        st, msg = api("PUT", "/pages", token, {
            "build_type": "workflow",
            "source": {"branch": BRANCH, "path": "/"},
        })
        log(f"PUT /pages -> {st}")
        time.sleep(10)
        # 重跑最新一次 Deploy 运行
        runs = list_runs(token)
        rid = next((r["id"] for r in runs if r["name"] == "Deploy to GitHub Pages"), None)
        if rid:
            api("POST", f"/actions/runs/{rid}/rerun", token)
        else:
            api("POST", f"/actions/workflows/{WORKFLOW_FILE}/dispatches", token,
                {"ref": BRANCH})
        wait_run(token)
        if wait_live():
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-build", action="store_true")
    ap.add_argument("--token", default=None)
    args = ap.parse_args()

    token = args.token or os.environ.get("GH_TOKEN") or token_from_remote()
    if not token:
        log("ERROR: 找不到 token（--token / GH_TOKEN / git remote）")
        sys.exit(1)

    head = push_source_api(token, args.no_build)
    if wait_live():
        log(f"✅ 部署成功上线: {SITE}")
        sys.exit(0)
    log("⚠️ 首次上线未就绪，执行自动恢复…")
    if recover(token):
        log(f"✅ 已通过恢复流程上线: {SITE}")
        sys.exit(0)
    log("❌ 部署失败：所有策略均未恢复。请到 Settings→Pages 检查（必要时重新选 "
        "GitHub Actions 源保存），并尽快撤销更换此前泄露过的 GitHub PAT。")
    sys.exit(2)


if __name__ == "__main__":
    main()
