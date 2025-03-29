/**
 * Main analysis module
 * Coordinates website tracking and classification
 */

import fs from 'fs/promises';
import path from 'path';
import { trackWebsite } from './tracker';

// 开发模式下的最大网站分析数量限制
const MAX_WEBSITES_TO_ANALYZE = 3;

// 定义结果类型
interface AnalysisResult {
  url: string;
  behaviorSummary?: string;
  classification?: string;
  reasoning?: string;
  timestamp: string;
  error?: string;
}

/**
 * Reads websites from a file
 * @param {string} filePath - Path to the websites.txt file
 * @returns {Promise<string[]>} - Array of website URLs
 */
export async function readWebsites(filePath: string): Promise<string[]> {
  try {
    console.log(`读取网站列表文件: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf8');
    const websites = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    console.log(`已读取 ${websites.length} 个网站`);
    return websites;
  } catch (error) {
    console.error(`Error reading website file: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Analyzes a single website
 * @param {string} url - URL to analyze
 * @returns {Promise<Object>} - Analysis results
 */
export async function analyzeWebsite(url: string): Promise<AnalysisResult> {
  console.log(`开始分析 ${url}...`);
  
  try {
    // Normalize URL (add https:// if missing)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Track website behavior
    const chain = await trackWebsite(url);
    console.log(`${url} 行为跟踪完成，收集了 ${chain.nodes.length} 个观察结果`);
    
    // Classify the behavior using GPT
    console.log(`开始使用 GPT 对 ${url} 进行分类...`);
    const classification = await chain.classify();
    console.log(`${url} 分类完成: ${classification.category}`);
    
    return {
      url,
      behaviorSummary: chain.getSummary(),
      classification: classification.category,
      reasoning: classification.reasoning,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error analyzing ${url}: ${error instanceof Error ? error.message : String(error)}`);
    return {
      url,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Analyzes multiple websites
 * @param {string[]} urls - Array of URLs to analyze
 * @returns {Promise<Object[]>} - Array of analysis results
 */
export async function analyzeWebsites(urls: string[]): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  
  // 限制分析的网站数量
  const sitesToAnalyze = urls.slice(0, MAX_WEBSITES_TO_ANALYZE);
  if (sitesToAnalyze.length < urls.length) {
    console.log(`注意: 为了开发测试，仅分析前 ${MAX_WEBSITES_TO_ANALYZE} 个网站`);
  }
  
  for (const url of sitesToAnalyze) {
    try {
      const result = await analyzeWebsite(url);
      results.push(result);
    } catch (error) {
      console.error(`分析 ${url} 时发生致命错误:`, error);
      results.push({
        url,
        error: `致命错误: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results;
}

/**
 * Main function to run analysis from file
 * @param {string} filePath - Path to websites.txt file
 * @returns {Promise<Object[]>} - Analysis results
 */
export async function analyzeFromFile(filePath: string): Promise<AnalysisResult[]> {
  try {
    const websites = await readWebsites(filePath);
    console.log(`找到 ${websites.length} 个网站需要分析`);
    
    if (websites.length === 0) {
      console.warn('警告: 没有找到要分析的网站');
      return [];
    }
    
    return await analyzeWebsites(websites);
  } catch (error) {
    console.error('分析文件时发生错误:', error);
    throw error; // 向上传递错误以便 API 能够捕获
  }
}

// Allow direct execution via command line
if (require.main === module) {
  const filePath = process.argv[2] || path.join(__dirname, 'websites.txt');
  
  analyzeFromFile(filePath)
    .then(results => {
      console.log(JSON.stringify(results, null, 2));
    })
    .catch(error => {
      console.error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
} 