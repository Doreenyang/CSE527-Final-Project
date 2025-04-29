/**
 * GPT Classifier for NoT.js
 * Replaces the Random Forest classifier with OpenAI's GPT model
 */

require('dotenv').config();
const axios = require('axios');
const path = require('path');
const fs = require('fs');


let openaiApiKey = process.env.OPENAI_API_KEY;


if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
    const match = envContent.match(/OPENAI_API_KEY=([^\s\r\n]+)/);
    if (match && match[1]) {
      openaiApiKey = match[1];
      console.log('API key loaded from file directly');
    }
  } catch (err) {
    console.error('Error reading .env file:', err.message);
  }
}

/**
 * use while cannot use gpt
 */
function mockClassify(behaviorText) {
  console.log('use it while cannot connect to openAI');
  
 
  const trackerKeywords = [
    'google-analytics', 'facebook', 'pixel', 'tracker',
    'tracker1', 'read cookie', 'write cookie'
  ];
  
  const hasTrackers = trackerKeywords.some(keyword => 
    behaviorText.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (hasTrackers) {
    return {
      category: 'B',
      reasoning: 'Simulated Classification: B. suspicious hehavior - detected partial tracker or cookie read/write activity',
      rawBehaviors: behaviorText
    };
  } else {
    return {
      category: 'C',
      reasoning: 'Simulated Classification: C. safe behavior - no obvious tracking behavior detected',
      rawBehaviors: behaviorText
    };
  }
}

/**
 * Classifies privacy behavior using ChatGPT
 * @param {string} behaviorText - The text containing website behaviors to analyze
 * @returns {Object} Classification result with category and reasoning
 */
async function classifyWithGPT(behaviorText) {
  try {
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      console.warn('warning: OpenAI API key not set, Simulated Classification');
      return mockClassify(behaviorText);
    }

    console.log('now using OpenAI API to classify...');
    
    const prompt = `You are the privacy expert. Below are website behavior list. Please analyze where there are risks of privacy leaks.

【behavior list】
${behaviorText}

now choose：
A. obvious tracking behavior
B. suspicious behavior
C. safe behavior

please output the classification（A/B/C）and a one sentence explanation`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a privacy expert. You reply is simple and correct, only contain classify result and one-sentence reason.'
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
    console.log('OpenAI return result:', result);
    
    // Extract the classification (A/B/C) and reasoning
    const classificationMatch = result.match(/^([ABC])[.\s:]/i);
    const category = classificationMatch ? classificationMatch[1].toUpperCase() : 'Undetermined';
    
    return {
      category,
      reasoning: result,
      rawBehaviors: behaviorText
    };
  } catch (error) {
    console.error('Error classifying with GPT:', error.message);
    
    console.log('chang to simulated classification');
    return mockClassify(behaviorText);
  }
}

module.exports = {
  classifyWithGPT
}; 
