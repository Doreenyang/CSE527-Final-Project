/**
 * GPT Classifier for NoT.js
 * Replaces the Random Forest classifier with OpenAI's GPT model
 */

import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

dotenv.config();

// 定义分类结果类型
export interface ClassificationResult {
  category: string;
  reasoning: string;
  rawBehaviors: string;
}

// 确保 API 密钥已加载
let openaiApiKey = process.env.OPENAI_API_KEY;

// 如果环境变量未加载，尝试直接从文件读取
if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
    const match = envContent.match(/OPENAI_API_KEY=([^\s\r\n]+)/);
    if (match && match[1]) {
      openaiApiKey = match[1];
      console.log('API key loaded from file directly');
    }
  } catch (err) {
    console.error('Error reading .env file:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * 使用模拟分类，当无法访问 OpenAI API 时使用
 */
function mockClassify(behaviorText: string): ClassificationResult {
  console.log('使用模拟分类器 (无法连接OpenAI)');
  
  // 基于关键词的简单规则分类
  const trackerKeywords = [
    'google-analytics', 'facebook', 'pixel', 'tracker',
    '跟踪器', '读取了 cookie', '写入了 cookie'
  ];
  
  const hasTrackers = trackerKeywords.some(keyword => 
    behaviorText.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (hasTrackers) {
    return {
      category: 'B',
      reasoning: '模拟分类: B. 可疑行为 - 检测到部分跟踪器或Cookie读写行为',
      rawBehaviors: behaviorText
    };
  } else {
    return {
      category: 'C',
      reasoning: '模拟分类: C. 安全行为 - 未检测到明显的跟踪行为',
      rawBehaviors: behaviorText
    };
  }
}

/**
 * Classifies privacy behavior using ChatGPT
 * @param {string} behaviorText - The text containing website behaviors to analyze
 * @returns {Promise<ClassificationResult>} Classification result with category and reasoning
 */
export async function classifyWithGPT(behaviorText: string): Promise<ClassificationResult> {
  try {
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      console.warn('警告: OpenAI API 密钥未设置, 使用模拟分类');
      return mockClassify(behaviorText);
    }

    console.log('正在使用 OpenAI API 进行分类...');
    
    const prompt = `你是隐私安全分析专家。以下是某网站行为列表，请判断其是否涉及用户隐私泄露。

【行为列表】
${behaviorText}

请选择：
A. 明显隐私泄露
B. 可疑行为
C. 安全行为

请返回分类（A/B/C）及一句理由。`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一个擅长分析网站隐私安全问题的专家。你的回复应简洁明了，只包含分类结果和简短理由。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        }
      }
    );

    const result = response.data.choices[0].message.content.trim();
    console.log('OpenAI 返回结果:', result);
    
    // Extract the classification (A/B/C) and reasoning
    const classificationMatch = result.match(/^([ABC])[.\s:]/i);
    const category = classificationMatch ? classificationMatch[1].toUpperCase() : 'Undetermined';
    
    return {
      category,
      reasoning: result,
      rawBehaviors: behaviorText
    };
  } catch (error) {
    console.error('Error classifying with GPT:', error instanceof Error ? error.message : String(error));
    // 当 OpenAI API 错误时使用模拟分类
    console.log('切换到模拟分类');
    return mockClassify(behaviorText);
  }
} 