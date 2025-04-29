/**
 * GPT Classifier for NoT.js
 * Replaces the Random Forest classifier with OpenAI's GPT model
 */

import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

dotenv.config();


export interface ClassificationResult {
  category: string;
  reasoning: string;
  rawBehaviors: string;
}


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
    console.error('Error reading .env file:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * use while cannot use gpt
 */
function mockClassify(behaviorText: string): ClassificationResult {
  console.log('use it while cannot connect to openAI');
  
 
  const trackerKeywords = [
    'google-analytics', 'facebook', 'pixel', 'tracker',
    'tracker', 'read cookie', 'write cookie'
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
 * @returns {Promise<ClassificationResult>} Classification result with category and reasoning
 */
export async function classifyWithGPT(behaviorText: string): Promise<ClassificationResult> {
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
            content: 'You are the privacy expert. Below are website behavior list. Please analyze where there are risks of privacy leaks.'
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
    console.error('Error classifying with GPT:', error instanceof Error ? error.message : String(error));
   
    console.log('change to simulation classification');
    return mockClassify(behaviorText);
  }
} 
