/**
 * API endpoint for website privacy analysis
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import formidable, { File } from 'formidable';
import { analyzeFromFile } from '../analyze';

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

interface FormidableResult {
  fields: formidable.Fields;
  files: formidable.Files;
}

/**
 * Parse form data from the request
 */
function parseForm(req: NextApiRequest): Promise<FormidableResult> {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
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
    // Parse the form data
    const { files } = await parseForm(req);
    const websitesFile = files.websites as File;

    if (!websitesFile) {
      return res.status(400).json({ error: 'No websites file provided' });
    }

    // Save the file temporarily
    const tempFilePath = path.join(process.cwd(), 'temp_websites.txt');
    await fsPromises.copyFile(websitesFile.filepath, tempFilePath);

    // Analyze the websites
    const results = await analyzeFromFile(tempFilePath);

    // Clean up the temporary file
    await fsPromises.unlink(tempFilePath);

    // Return the results
    return res.status(200).json({ results });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
} 