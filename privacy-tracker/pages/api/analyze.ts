/**
 * API endpoint for website privacy analysis
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
// 修改导入方式，导入正确的类型和函数
import { IncomingForm, File, Fields, Files } from 'formidable';
// 导入 TypeScript 版本的 analyzeFromFile
import { analyzeFromFile } from '../../analyze';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

interface FormidableResult {
  fields: Fields;
  files: Files;
}

/**
 * Parse form data from the request
 */
function parseForm(req: NextApiRequest): Promise<FormidableResult> {
  return new Promise((resolve, reject) => {
    // 使用 formidable v2.x 的方式创建 form 对象
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

/**
 * Handle the website analysis request
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('API start: 正在处理分析请求...');
    
    // Parse the form data
    const { files } = await parseForm(req);
    console.log('文件解析完成', files ? '文件存在' : '文件不存在');
    
    // 在 formidable v2 中，files[fieldname] 是单个文件对象或对象数组
    const websitesFile = files.websites;
    console.log('网站文件类型:', typeof websitesFile, Array.isArray(websitesFile));
    
    // 更详细的调试信息
    if (websitesFile) {
      console.log('文件对象结构:', JSON.stringify(websitesFile, null, 2).substring(0, 200) + '...');
    }

    // 适配 formidable v2 的文件对象结构
    let filePath: string;
    
    // 处理文件对象可能的不同结构
    if (Array.isArray(websitesFile)) {
      // 如果是数组（多文件）
      if (websitesFile.length === 0) {
        return res.status(400).json({ error: 'No websites file provided (empty array)' });
      }
      filePath = websitesFile[0].filepath;
    } else if (websitesFile && typeof websitesFile === 'object' && 'filepath' in websitesFile) {
      // 如果是单个文件对象
      filePath = websitesFile.filepath;
    } else {
      console.error('无效的文件对象:', websitesFile);
      return res.status(400).json({ error: 'No valid websites file provided' });
    }

    console.log('网站文件路径:', filePath);
    
    // Save the file temporarily
    const tempFilePath = path.join(process.cwd(), 'temp_websites.txt');
    await fsPromises.copyFile(filePath, tempFilePath);
    console.log('临时文件已创建:', tempFilePath);
    
    try {
      // 读取临时文件内容进行验证
      const fileContent = await fsPromises.readFile(tempFilePath, 'utf-8');
      console.log('文件内容预览:', fileContent.slice(0, 100) + '...');
      
      // Analyze the websites
      console.log('开始分析网站...');
      const results = await analyzeFromFile(tempFilePath);
      console.log('分析完成，结果数量:', Array.isArray(results) ? results.length : '非数组');
  
      // Clean up the temporary file
      await fsPromises.unlink(tempFilePath);
      console.log('临时文件已删除');
  
      // Return the results
      return res.status(200).json({ results });
    } catch (innerError) {
      console.error('分析过程内部错误:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('API error:', error);
    console.error('错误详情:', error instanceof Error ? error.stack : String(error));
    return res.status(500).json({ 
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 