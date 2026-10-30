# 👟 跑步姿态训练指南（running-form）

一个开源的跑步姿态训练指导 Skill：分析并纠正跑步姿态，涵盖**着地方式**、**步频步幅**、**身体前倾角度**三大核心维度。

配套在线版通过 GitHub Pages 自动发布。

## 在线预览

部署完成后访问：`https://<你的用户名>.github.io/running-form/`

## 仓库结构

```
.
├── index.html              # 在线版页面（由 SKILL.md 渲染生成）
├── SKILL.md                # 技能定义：角色、触发条件、执行流程、输出格式
├── _meta.json              # 技能元信息（slug / version）
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages 自动部署
└── .gitignore
```

## 本地预览

```bash
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 内容能力

| 模块 | 说明 |
| --- | --- |
| 评估水平 | 初学者 / 中级 / 进阶者分级判断 |
| 训练目标 | 减脂、增肌、技术提升、比赛备赛 |
| 训练方案 | 每周计划：内容、组数次数、休息、注意事项 |
| 技术指导 | 关键动作分步要领 + 常见错误与纠正 |
| 营养恢复 | 饮食搭配、热身、拉伸、休息安排 |
| 进度跟踪 | 可量化指标与阶段性评估节点 |

## 修改内容后如何更新页面

`index.html` 是从 `SKILL.md` 生成的静态页。改完 `SKILL.md` 后重新生成：

```bash
python3 scripts/build.py
```

或者直接编辑 `index.html`。两种方式都可以，提交到 `main` 后会自动重新部署。

## 部署说明

仓库已内置 Actions 工作流，推送到 `main` 即自动构建发布。
首次需要在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

## License

MIT
