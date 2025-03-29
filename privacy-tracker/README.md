# NoT.js 隐私追踪分析器

基于大语言模型增强的网站隐私行为分析工具，此项目使用 NoT.js（Network of Thoughts）思维链结构，通过 ChatGPT 替代原始的随机森林分类器进行网站隐私风险评估。

## 🌟 特性

- **网站行为收集**：使用 Puppeteer 自动访问网站并收集隐私相关行为
- **思维链构建**：构建 NoT.js 风格的 ThoughtNode 和 ThoughtChain 结构
- **大语言模型分类**：用 ChatGPT 替代原始的随机森林分类器进行风险评估
- **优雅的用户界面**：直观的文件上传和结果展示界面
- **详细的隐私评估**：提供详细的网站行为摘要和隐私风险分类

## 📋 快速开始

### 前提条件

- Node.js 16+ 
- 有效的 OpenAI API 密钥

### 安装

1. 克隆此仓库

```bash
git clone https://github.com/yourusername/privacy-tracker.git
cd privacy-tracker
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

将 `.env` 文件中的 `OPENAI_API_KEY` 设置为您的 OpenAI API 密钥：

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 运行

启动开发服务器：

```bash
npm run dev
```

访问 `http://localhost:3000` 即可使用应用。

## 🧠 工作原理

1. **网站行为收集**：
   - 用户上传包含多个网站 URL 的 TXT 文件
   - 系统使用 Puppeteer 访问每个网站
   - 监控并记录可能涉及隐私问题的行为（如跟踪器请求、Cookie 访问等）

2. **思维链构建**：
   - 每个观察到的行为被封装为 ThoughtNode
   - 多个节点组成一个 ThoughtChain 代表网站的整体行为

3. **GPT 分类**：
   - 思维链中的行为被发送到 ChatGPT 进行分析
   - GPT 根据行为将网站分类为：
     - A: 明显隐私泄露
     - B: 可疑行为
     - C: 安全行为

4. **结果展示**：
   - 分析结果以时间线形式展示
   - 包含详细的行为列表、GPT 分析结果和风险分类

## 🔄 自定义

### 添加新的行为检测

编辑 `tracker.js` 文件，在 `trackWebsite` 函数中添加新的检测逻辑。

例如，添加新的指纹识别方法检测：

```javascript
// 检测新的指纹识别方法
if (window.someNewFingerprintingAPI) {
  chain.addNode(new ThoughtNode('fingerprinting', '网站使用新方法进行指纹识别', { method: 'newMethod' }));
}
```

### 修改 GPT 提示词

编辑 `gptClassifier.js` 文件中的 `prompt` 变量以自定义发送给 GPT 的提示词。

## 📝 许可证

MIT

## 🙏 致谢

- [NoT.js](https://github.com/douglascrockford/NOT) - 思维链结构的灵感来源
- [Puppeteer](https://pptr.dev/) - 网站自动化工具
- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [OpenAI](https://openai.com/) - ChatGPT API 