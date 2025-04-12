import FirecrawlApp from '@mendable/firecrawl-js';
import { execSync } from 'child_process';

// Get API key from 1Password
const apiKey = execSync('op read "op://stecmqyblx7syjfcwwmzpuyeym/Firecrawl/API Key"').toString().trim();
if (!apiKey) {
  console.error('Error: Could not retrieve API key from 1Password');
  process.exit(1);
}
console.log('API Key loaded successfully:', apiKey.substring(0, 4) + '...');

// Initialize FirecrawlApp
const app = new FirecrawlApp({ apiKey });

// Test URL
const testUrl = 'https://docs.controld.com/docs/getting-started';

async function testScrape() {
  try {
    console.log('Testing Firecrawl API with URL:', testUrl);
    
    // Use scrapeUrl method with minimal options
    const response = await app.scrapeUrl(testUrl, {
      formats: ['markdown', 'html']
    });
    
    if (!response) {
      console.error('Scrape failed: No response received');
      process.exit(1);
    }
    
    console.log('Scrape successful!');
    console.log('Response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

testScrape(); 