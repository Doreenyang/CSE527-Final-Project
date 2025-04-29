/**
 * Main analysis module
 * Coordinates website tracking and classification
 */

import fs from 'fs/promises';
import path from 'path';
import { trackWebsite } from './tracker';


const MAX_WEBSITES_TO_ANALYZE = 3;


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
    console.log(`read website file: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf8');
    const websites = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    console.log(`already read ${websites.length} website`);
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
  console.log(`now analyze ${url}...`);
  
  try {
    // Normalize URL (add https:// if missing)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Track website behavior
    const chain = await trackWebsite(url);
    console.log(`${url} tracking behavior complete ${chain.nodes.length} result`);
    
    // Classify the behavior using GPT
    console.log(`use Gpt ${url} to classify`);
    const classification = await chain.classify();
    console.log(`${url} classify complete: ${classification.category}`);
    
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
  

  const sitesToAnalyze = urls.slice(0, MAX_WEBSITES_TO_ANALYZE);
  if (sitesToAnalyze.length < urls.length) {
    console.log(`waring: for testing only show ${MAX_WEBSITES_TO_ANALYZE} website`);
  }
  
  for (const url of sitesToAnalyze) {
    try {
      const result = await analyzeWebsite(url);
      results.push(result);
    } catch (error) {
      console.error(`analyze ${url} error:`, error);
      results.push({
        url,
        error: `important error: ${error instanceof Error ? error.message : String(error)}`,
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
    console.log(`find ${websites.length} website to analyze`);
    
    if (websites.length === 0) {
      console.warn('waring:cannot find websites');
      return [];
    }
    
    return await analyzeWebsites(websites);
  } catch (error) {
    console.error('error happned while analyzing', error);
    throw error; 
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
