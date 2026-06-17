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
- **存储**：localStorage + JSON 文件持久化

## 消融实验模块（差异化统计学量化分析）

本模块设计了一套对照消融实验流水线，用于量化评估多层文本清洗 + 链式Prompt + JSON强约束校验对简历生成质量的提升效果。

### 实验设计

| 变量 | 对照组（极简无清洗） | 实验组（链式Prompt+清洗） |
|------|-------------------|------------------------|
| Prompt | 单条极简指令，无格式说明 | 分层 Phase1/Phase2，STAR 约束 |
| JSON 输出约束 | 不指定 response_format | `type: json_object` |
| 文本清洗 | 无 cleanLLMResponse | cleanLLMResponse 清洗 |
| Schema 校验 | 无 Zod 校验 | Zod OptimizedResumeSchema |
| 调用方式 | 单次调用 | 两阶段链式调用 |
| 共同变量 | 素材/JD/RAG 知识库/双模型并发 | 相同 |

### 统计指标

- **报错率**：JSON 解析失败次数 / 总生成次数
- **匹配得分**：均值、方差、标准差（衡量稳定性）
- **性能指标**：平均耗时、Token 消耗、RAG 关键词命中数
- **模型分组**：DeepSeek / 通义千问 分开统计

### 操作方式

1. 切换到「🧪 实验」Tab
2. 设置循环轮次（1-20），点击「一键启动消融实验」
3. 系统自动运行对照组 + 实验组各 N 轮
4. 实时展示：柱状图（6 项指标对比）+ 分布直方图 + 统计结论
5. 点击「导出 CSV」下载原始实验数据用于外部绘图

### 前置条件

```bash
# 先在 RAG 知识库上传行业 JD（确保实验有增强上下文）
# 然后在素材库填写用户信息
# 最后切换到实验 Tab 启动
```

### 实验结论示例

> 实验结论：报错率 20.0% → 0.0%；评分均值 72.5 → 85.3；标准差 12.34 → 2.15
> 结论：多层文本清洗+链式Prompt+JSON强约束校验 能有效降低AI输出错误率、提升简历匹配得分的一致性和稳定性。`
