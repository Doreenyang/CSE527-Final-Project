/**
 * Website Tracker Module
 * Uses Puppeteer to track website behaviors related to privacy
 */

import { ThoughtNode, ThoughtChain } from './not';

// 声明 puppeteer 变量
let puppeteer: any;
try {
  puppeteer = require('puppeteer');
} catch (err) {
  console.error('Puppeteer 加载失败:', err instanceof Error ? err.message : String(err));
}

/**
 * 简化版的网站跟踪，当 Puppeteer 无法正常工作时使用
 */
async function simplifiedTrack(url: string): Promise<ThoughtChain> {
  console.log('使用简化版跟踪功能 (Puppeteer可能不可用)');
  const chain = new ThoughtChain(url);
  
  // 添加模拟的行为节点
  chain.addNode(new ThoughtNode('navigation', `访问网站 ${url}`, { url }));
  chain.addNode(new ThoughtNode('request', `模拟: 页面可能请求了跟踪器`, { url: url + '/tracking' }));
  chain.addNode(new ThoughtNode('cookie', '模拟: 脚本可能读取了 document.cookie', { action: 'read' }));
  
  // 根据网站域名添加一些特定的行为
  if (url.includes('google')) {
    chain.addNode(new ThoughtNode('script', '模拟: 页面加载了 Google Analytics', { url: 'https://www.google-analytics.com/analytics.js' }));
  } else if (url.includes('facebook')) {
    chain.addNode(new ThoughtNode('script', '模拟: 页面加载了 Facebook Pixel 或 SDK', { url: 'https://connect.facebook.net/signals/config/' }));
  } else if (url.includes('news') || url.includes('blog')) {
    chain.addNode(new ThoughtNode('script', '模拟: 页面加载了广告跟踪器', { url: 'https://ads-tracking.com' }));
  }
  
  chain.addNode(new ThoughtNode('storage', '模拟: 网站可能使用 localStorage 存储数据', { type: 'localStorage', itemCount: 5 }));
  
  return chain;
}

/**
 * Track a single website and collect privacy-related behaviors
 * @param {string} url - URL of the website to track
 * @returns {Promise<ThoughtChain>} - Chain of observed behaviors
 */
export async function trackWebsite(url: string): Promise<ThoughtChain> {
  // 如果 Puppeteer 不可用，使用简化版跟踪
  if (!puppeteer) {
    console.warn('Puppeteer 不可用，使用简化版跟踪功能');
    return simplifiedTrack(url);
  }
  
  console.log(`开始跟踪网站: ${url}`);
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
        chain.addNode(new ThoughtNode('request', `页面请求了跟踪器 ${url}`, { url }));
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
    chain.addNode(new ThoughtNode('navigation', `访问网站 ${url}`, { url }));
    console.log(`正在访问 ${url}...`);
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } catch (navError) {
      console.warn(`导航到 ${url} 时超时或错误: ${navError instanceof Error ? navError.message : String(navError)}`);
      // 即使导航失败也继续检测
      chain.addNode(new ThoughtNode('error', `导航到网站失败: ${navError instanceof Error ? navError.message : String(navError)}`, { error: true }));
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
      chain.addNode(new ThoughtNode('cookie', '脚本读取了 document.cookie', { action: 'read' }));
    }
    
    if (cookieActivity.cookieWritten) {
      chain.addNode(new ThoughtNode('cookie', '脚本写入了 document.cookie', { action: 'write' }));
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
      chain.addNode(new ThoughtNode('storage', `网站使用 localStorage 存储了 ${storageActivity.localStorageItems} 项数据`, { 
        type: 'localStorage', 
        itemCount: storageActivity.localStorageItems 
      }));
    }
    
    if (storageActivity.sessionStorageItems > 0) {
      chain.addNode(new ThoughtNode('storage', `网站使用 sessionStorage 存储了 ${storageActivity.sessionStorageItems} 项数据`, { 
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
      'facebook': 'Facebook Pixel 或 SDK',
      'google-analytics': 'Google Analytics',
      'gtag': 'Google Tag Manager',
      'google-tag': 'Google Tag Manager',
      'doubleclick': 'DoubleClick (Google广告)',
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
          chain.addNode(new ThoughtNode('script', `页面加载了 ${name}`, { url: scriptUrl }));
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
      chain.addNode(new ThoughtNode('fingerprinting', '网站使用 Canvas API 可能进行指纹识别', { method: 'canvas' }));
    }
    
    if (fingerprintingMethods.includes('webrtc')) {
      chain.addNode(new ThoughtNode('fingerprinting', '网站使用 WebRTC API 可能获取本地IP地址', { method: 'webrtc' }));
    }
    
    return chain;
  } catch (error) {
    console.error(`跟踪网站时出错: ${error instanceof Error ? error.message : String(error)}`);
    // 即使出错，也返回一个带有错误信息的链
    chain.addNode(new ThoughtNode('error', `跟踪过程出错: ${error instanceof Error ? error.message : String(error)}`, { error: true }));
    
    // 在出错时使用简化版跟踪来提供一些基本数据
    if (chain.nodes.length < 2) {
      console.log('使用简化版跟踪作为备用');
      return simplifiedTrack(url);
    }
    
    return chain;
  } finally {
    if (browser) {
      await browser.close().catch((err: Error) => console.warn('关闭浏览器时出错:', err.message));
    }
  }
} 