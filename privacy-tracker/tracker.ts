/**
 * Website Tracker Module
 * Uses Puppeteer to track website behaviors related to privacy
 */

import { ThoughtNode, ThoughtChain } from './not';


let puppeteer: any;
try {
  puppeteer = require('puppeteer');
} catch (err) {
  console.error('Puppeteer load error:', err instanceof Error ? err.message : String(err));
}

/**
 * use simplified function
 */
async function simplifiedTrack(url: string): Promise<ThoughtChain> {
  console.log('use simplified function  (Puppeteer may not function well)');
  const chain = new ThoughtChain(url);
  
  
  chain.addNode(new ThoughtNode('navigation', `visit website ${url}`, { url }));
  chain.addNode(new ThoughtNode('request', `simulation: simulation: website request tracker`, { url: url + '/tracking' }));
  chain.addNode(new ThoughtNode('cookie', 'simulation: script read document.cookie', { action: 'read' }));
  
  
  if (url.includes('google')) {
    chain.addNode(new ThoughtNode('script', 'simulation: page loads Google Analytics', { url: 'https://www.google-analytics.com/analytics.js' }));
  } else if (url.includes('facebook')) {
    chain.addNode(new ThoughtNode('script', 'simulation: page loads Facebook Pixel 或 SDK', { url: 'https://connect.facebook.net/signals/config/' }));
  } else if (url.includes('news') || url.includes('blog')) {
    chain.addNode(new ThoughtNode('script', 'simulation: simulation: page loads advertisment tracker', { url: 'https://ads-tracking.com' }));
  }
  
  chain.addNode(new ThoughtNode('storage', 'simulation: website may use localStorage to store data', { type: 'localStorage', itemCount: 5 }));
  
  return chain;
}

/**
 * Track a single website and collect privacy-related behaviors
 * @param {string} url - URL of the website to track
 * @returns {Promise<ThoughtChain>} - Chain of observed behaviors
 */
export async function trackWebsite(url: string): Promise<ThoughtChain> {
  
  if (!puppeteer) {
    console.warn('Puppeteer does not function well，use the simplified tracking function');
    return simplifiedTrack(url);
  }
  
  console.log(`now track website: ${url}`);
  const chain = new ThoughtChain(url);
  
  let browser: any;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Track network requests
    page.on('request', (request: any) => {
      const url = request.url();
      // Filter for tracking and analytics requests
      const trackerPatterns = [
        /google-analytics/i, /facebook/i, /fb\.com/i, /doubleclick/i, /tracking/i, 
        /analytics/i, /pixel/i, /tracker/i, /beacon/i, /collect/i, /telemetry/i
      ];
      
      if (trackerPatterns.some(pattern => pattern.test(url))) {
        chain.addNode(new ThoughtNode('request', `the page request tracker ${url}`, { url }));
      }
    });
    
    // Track cookies
    const cookieAccessDetectionScript = `
      (function() {
        const originalDocumentCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
        
        Object.defineProperty(document, 'cookie', {
          get: function() {
            window.cookieRead = true;
            return originalDocumentCookie.get.call(this);
          },
          set: function(val) {
            window.cookieWritten = true;
            return originalDocumentCookie.set.call(this, val);
          }
        });
      })();
    `;
    
    await page.evaluateOnNewDocument(cookieAccessDetectionScript);
    
    // Navigate to the URL
    chain.addNode(new ThoughtNode('navigation', `visit website ${url}`, { url }));
    console.log(`now visiting website ${url}...`);
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } catch (navError) {
      console.warn(`Navigate to ${url} error happen: ${navError instanceof Error ? navError.message : String(navError)}`);
      
      chain.addNode(new ThoughtNode('error', `navigaton error: ${navError instanceof Error ? navError.message : String(navError)}`, { error: true }));
    }
    
    // Wait a bit more for any deferred scripts
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check for cookie access
    const cookieActivity = await page.evaluate(() => {
      return {
        cookieRead: (window as any).cookieRead || false,
        cookieWritten: (window as any).cookieWritten || false
      };
    });
    
    if (cookieActivity.cookieRead) {
      chain.addNode(new ThoughtNode('cookie', 'Script reads document.cookie', { action: 'read' }));
    }
    
    if (cookieActivity.cookieWritten) {
      chain.addNode(new ThoughtNode('cookie', 'Script writes document.cookie', { action: 'write' }));
    }
    
    // Check for localStorage and sessionStorage access
    const storageActivity = await page.evaluate(() => {
      // Override Storage prototype methods to detect usage
      let localStorageAccessed = false;
      let sessionStorageAccessed = false;
      
      // Check for existing values
      const localStorageItems = Object.keys(localStorage).length;
      const sessionStorageItems = Object.keys(sessionStorage).length;
      
      return {
        localStorageItems,
        sessionStorageItems
      };
    });
    
    if (storageActivity.localStorageItems > 0) {
      chain.addNode(new ThoughtNode('storage', `The website uses localStorage to store ${storageActivity.localStorageItems} data`, { 
        type: 'localStorage', 
        itemCount: storageActivity.localStorageItems 
      }));
    }
    
    if (storageActivity.sessionStorageItems > 0) {
      chain.addNode(new ThoughtNode('storage', `the website uses sessionStorage to store ${storageActivity.sessionStorageItems} data`, { 
        type: 'sessionStorage', 
        itemCount: storageActivity.sessionStorageItems 
      }));
    }
    
    // Detect third-party scripts
    const thirdPartyScripts = await page.evaluate(() => {
      return Array.from(document.getElementsByTagName('script'))
        .filter(script => script.src)
        .map(script => script.src);
    });
    
    const knownTrackers: {[key: string]: string} = {
      'facebook': 'Facebook Pixel or SDK',
      'google-analytics': 'Google Analytics',
      'gtag': 'Google Tag Manager',
      'google-tag': 'Google Tag Manager',
      'doubleclick': 'DoubleClick (Google)',
      'tiktok': 'TikTok Pixel',
      'twitter': 'Twitter Pixel',
      'amplitude': 'Amplitude Analytics',
      'hotjar': 'Hotjar',
      'segment': 'Segment',
      'mixpanel': 'Mixpanel'
    };
    
    thirdPartyScripts.forEach(scriptUrl => {
      for (const [key, name] of Object.entries(knownTrackers)) {
        if (scriptUrl.includes(key)) {
          chain.addNode(new ThoughtNode('script', `the page loads ${name}`, { url: scriptUrl }));
          break;
        }
      }
    });
    
    // Check for fingerprinting techniques
    const fingerprintingMethods = await page.evaluate(() => {
      const methods: string[] = [];
      
      // Check canvas fingerprinting
      if (document.createElement('canvas').getContext) {
        methods.push('canvas');
      }
      
      // Check WebRTC
      if (typeof (window as any).RTCPeerConnection !== 'undefined') {
        methods.push('webrtc');
      }
      
      // Check device enumeration
      if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices !== 'undefined') {
        methods.push('mediaDevices');
      }
      
      return methods;
    });
    
    if (fingerprintingMethods.includes('canvas')) {
      chain.addNode(new ThoughtNode('fingerprinting', 'the website uses Canvas API to identify fingerprint', { method: 'canvas' }));
    }
    
    if (fingerprintingMethods.includes('webrtc')) {
      chain.addNode(new ThoughtNode('fingerprinting', 'the website uses WebRTC API to get locap ip address', { method: 'webrtc' }));
    }
    
    return chain;
  } catch (error) {
    console.error(`tracking error: ${error instanceof Error ? error.message : String(error)}`);
    
    chain.addNode(new ThoughtNode('error', `tracking error: ${error instanceof Error ? error.message : String(error)}`, { error: true }));
    
    
    if (chain.nodes.length < 2) {
      console.log('use the simplified function as backup');
      return simplifiedTrack(url);
    }
    
    return chain;
  } finally {
    if (browser) {
      await browser.close().catch((err: Error) => console.warn('error while closing the website:', err.message));
    }
  }
} 
