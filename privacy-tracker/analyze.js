/**
 * Main analysis module
 * Coordinates website tracking and classification
 */

const fs = require('fs').promises;
const path = require('path');
const { trackWebsite } = require('./tracker');


const MAX_WEBSITES_TO_ANALYZE = 3;

/**
 * Reads websites from a file
 * @param {string} filePath - Path to the websites.txt file
 * @returns {Promise<string[]>} - Array of website URLs
 */
async function readWebsites(filePath) {
  try {
    console.log(`read website file: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf8');
    const websites = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    console.log(`already read ${websites.length} websites`);
    return websites;
  } catch (error) {
    console.error(`Error reading website file: ${error.message}`);
    return [];
  }
}

/**
 * Analyzes a single website
 * @param {string} url - URL to analyze
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeWebsite(url) {
  console.log(`now analyze ${url}...`);
  
  try {
    // Normalize URL (add https:// if missing)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Track website behavior
    const chain = await trackWebsite(url);
    console.log(`${url} tracking complete ${chain.nodes.length} `);
    
    // Classify the behavior using GPT
    console.log(`use GPT to ${url} classify...`);
    const classification = await chain.classify();
    console.log(`${url} complete: ${classification.category}`);
    
    return {
      url,
      behaviorSummary: chain.getSummary(),
      classification: classification.category,
      reasoning: classification.reasoning,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error analyzing ${url}: ${error.message}`);
    return {
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Analyzes multiple websites
 * @param {string[]} urls - Array of URLs to analyze
 * @returns {Promise<Object[]>} - Array of analysis results
 */
async function analyzeWebsites(urls) {
  const results = [];
  
  
  const sitesToAnalyze = urls.slice(0, MAX_WEBSITES_TO_ANALYZE);
  if (sitesToAnalyze.length < urls.length) {
    console.log(`for testing,only show  ${MAX_WEBSITES_TO_ANALYZE} website`);
  }
  
  for (const url of sitesToAnalyze) {
    try {
      const result = await analyzeWebsite(url);
      results.push(result);
    } catch (error) {
      console.error(`analyze ${url} error:`, error);
      results.push({
        url,
        error: `error: ${error.message}`,
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
async function analyzeFromFile(filePath) {
  try {
    const websites = await readWebsites(filePath);
    console.log(`find ${websites.length} website to analyze`);
    
    if (websites.length === 0) {
      console.warn('waring: no website to analyze');
      return [];
    }
    
    return await analyzeWebsites(websites);
  } catch (error) {
    console.error('error while analyzing', error);
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
      console.error(`Analysis failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  readWebsites,
  analyzeWebsite,
  analyzeWebsites,
  analyzeFromFile
}; 
