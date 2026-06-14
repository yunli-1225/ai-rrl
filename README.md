# AI RRL — 自动简历重写器

根据职位描述（JD）智能生成针对性简历。Next.js + DeepSeek API 驱动。

## 功能特点

- 🏛️ **4 种简历模板**（央国企经典/简约 + 互联网现代/创意）
- 🧠 **DeepSeek AI 智能匹配** JD 关键词，STAR 格式自动生成
- 🚀 **差距激励**（Gap Booster）识别技能缺口，一键补充
- ✏️ **简历预览可编辑**，支持复制/下载 TXT/HTML/打印 PDF
- 📦 **素材库本地存储**，支持导入/导出 JSON
- 📑 **批量 JD 处理**，多个岗位一键生成

## 快速开始

```bash
# 1. 配置 DeepSeek API Key
echo "DEEPSEEK_API_KEY=sk-your-key-here" > .env.local

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问 http://localhost:3000
```

> **Windows 用户：** 如果没有全局安装 Node.js，可用项目自带的便携版：
> ```bash
> ./run-dev.sh
> ```

## 生产构建

```bash
npm run build
npm start
```

## 技术栈

- **框架**：Next.js 14 (App Router)
- **语言**：TypeScript
- **AI**：DeepSeek API (deepseek-chat)
- **校验**：Zod Schema（前后端共享契约）
- **状态管理**：useReducer（仅3状态：result/loading/error）
- **存储**：localStorage
