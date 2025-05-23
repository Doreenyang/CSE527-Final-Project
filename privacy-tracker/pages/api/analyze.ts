/**
 * API endpoint for website privacy analysis
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';

import { IncomingForm, File, Fields, Files } from 'formidable';

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
    console.log('API start: now process and analyze tracking request');
    
    // Parse the form data
    const { files } = await parseForm(req);
    console.log('complete analyze document', files ? 'document exist' : 'document not exist');
    
    // in formidable v2 ，files[fieldname] 
    const websitesFile = files.websites;
    console.log('website document type', typeof websitesFile, Array.isArray(websitesFile));
    
    
    if (websitesFile) {
      console.log('document structure:', JSON.stringify(websitesFile, null, 2).substring(0, 200) + '...');
    }

    
    let filePath: string;
    
   
    if (Array.isArray(websitesFile)) {
      
      if (websitesFile.length === 0) {
        return res.status(400).json({ error: 'No websites file provided (empty array)' });
      }
      filePath = websitesFile[0].filepath;
    } else if (websitesFile && typeof websitesFile === 'object' && 'filepath' in websitesFile) {
      
      filePath = websitesFile.filepath;
    } else {
      console.error('invalid document object:', websitesFile);
      return res.status(400).json({ error: 'No valid websites file provided' });
    }

    console.log('website tracking route:', filePath);
    
    // Save the file temporarily
    const tempFilePath = path.join(process.cwd(), 'temp_websites.txt');
    await fsPromises.copyFile(filePath, tempFilePath);
    console.log('temporary document:', tempFilePath);
    
    try {
     
      const fileContent = await fsPromises.readFile(tempFilePath, 'utf-8');
      console.log('document content view:', fileContent.slice(0, 100) + '...');
      
      // Analyze the websites
      console.log('now analyze website');
      const results = await analyzeFromFile(tempFilePath);
      console.log('analysis complete，result number:', Array.isArray(results) ? results.length : 'nonArray');
  
      // Clean up the temporary file
      await fsPromises.unlink(tempFilePath);
      console.log('temporary document clean up');
  
      // Return the results
      return res.status(200).json({ results });
    } catch (innerError) {
      console.error('analyze inner error:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('API error:', error);
    console.error('error info:', error instanceof Error ? error.stack : String(error));
    return res.status(500).json({ 
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 
