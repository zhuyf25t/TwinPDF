# TwinPDF — Personal Bilingual Study Craft

TwinPDF 是一个给自己用的英文课件自学工作台：左边英文 PDF，右边中文讲义，底部随时可用的 AI Assist 帮你解释选中文本、保留重复问题、沉淀个人子讲义，并在课程结束时生成 Markdown 总结。

## 快速运行

```bash
npm install
npm run dev
```

浏览器打开：

```text
http://localhost:5173
```

第一次进入页面后，点击 **选择本地学习工作区**，选择一个文件夹。TwinPDF 会把历史数据、句子切分、AI 问答、个人子讲义、最终导出都保存在这个文件夹中，而不是藏在浏览器默认缓存里。

## DeepSeek 配置

编辑 `env.local`：

```env
DEEPSEEK_API_KEY=你的 key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_REASONING=true
MOCK_AI=false
APP_PORT=5173
```

没有 key 时保持 `MOCK_AI=true`，Codex 也必须继续完成 UI、持久化和测试，不允许因为缺 key 停止。

## 核心工作流

1. 选择学习工作区。
2. 左边打开英文课件 PDF。
3. 右边打开中文讲义 Markdown / 文本。
4. 左边选中英文句子或段落。
5. 底部 AI Assist 自动更新：已选原文、浏览器翻译区、AI 解释。
6. 可以锁住输入框，把同一个问题反复问不同文本。
7. 可以锁住“加入个人子讲义”，AI 成功回答后自动保存。
8. 保存成功后显示绿色 `加入成功`。
9. 点击 `结束课程总结`，把本次所有保存的问答生成个人 Markdown 子讲义。

## 重要文档

- `AGENTS.md`：Codex 总操作协议，要求一直做到 DONE。
- `docs/CODEX_GOAL_PROMPT.md`：第一轮 `/goal` prompt。
- `docs/WHITEPAPER.md`：完整产品白皮书。
- `docs/ARCHITECTURE.md`：前后端与本地工作区架构。
- `docs/WORKSPACE_STORAGE_SPEC.md`：本地文件夹记忆系统。
- `docs/AI_ASSIST_SPEC.md`：AI Assist 细节。
- `docs/SENTENCE_PIPELINE_SPEC.md`：导入 PDF 后句子切分与 label 缓存。
- `docs/FINAL_DONE_CHECKLIST.md`：最终完成标准。

## 测试材料

用户会提供真实测试目录：

```text
C:\Users\Laptop\Desktop\网络学堂\[11] 计算机系统概论\lec8
```

里面有两个 PDF。Codex 必须用它们做真实 smoke test。
