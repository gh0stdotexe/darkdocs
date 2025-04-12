import FirecrawlApp from '@mendable/firecrawl-js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Get API key from 1Password
const apiKey = execSync('op read "op://stecmqyblx7syjfcwwmzpuyeym/Firecrawl/API Key"').toString().trim();
if (!apiKey) {
  console.error('Error: Could not retrieve API key from 1Password');
  process.exit(1);
}
console.log('API Key loaded successfully:', apiKey.substring(0, 4) + '...');

// Initialize FirecrawlApp
const app = new FirecrawlApp({ apiKey });

// Define the base URL and paths to scrape
const baseUrl = 'https://docs.controld.com';
const paths = [
  '/docs/getting-started',
  '/reference/get-started',
  '/reference',
  '/docs/ctrld',
  '/docs/business/industries/startups',
  '/docs/business/industries/smbs',
  '/docs/business/industries/msps',
  '/docs/business/solutions/secure-end-user-devices',
  '/docs/business/solutions/protect-whole-networks',
  '/docs/business/solutions/block-unwanted-content',
];

// Output directory for scraped content
const outputDir = path.join(process.cwd(), 'scraped-docs');

// Stats for summary report
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  startTime: null,
  endTime: null,
  errors: []
};

async function ensureOutputDir() {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

function validateContent(content) {
  if (!content) return false;
  if (!content.markdown && !content.html) return false;
  if (content.markdown && typeof content.markdown !== 'string') return false;
  if (content.html && typeof content.html !== 'string') return false;
  return true;
}

function extractMetadata(url, content) {
  const metadata = {
    url,
    scrapedAt: new Date().toISOString(),
    contentLength: {
      markdown: content.markdown?.length || 0,
      html: content.html?.length || 0
    },
    title: content.markdown?.split('\n')[0]?.replace(/^#\s*/, '') || '',
    sections: content.markdown?.match(/^##\s+.+$/gm)?.map(s => s.replace(/^##\s+/, '')) || []
  };
  return metadata;
}

async function scrapeUrl(url) {
  try {
    console.log(`\nScraping URL: ${url}`);
    
    const response = await app.scrapeUrl(url, {
      formats: ['markdown', 'html']
    });
    
    if (!response || !validateContent(response)) {
      console.error(`Failed to scrape ${url}: Invalid content`);
      stats.errors.push({ url, error: 'Invalid content structure' });
      return null;
    }
    
    const metadata = extractMetadata(url, response);
    return { content: response, metadata };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    stats.errors.push({ url, error: error.message });
    return null;
  }
}

async function saveContent(url, data) {
  const filename = url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const outputPath = path.join(outputDir, `${filename}.json`);
  
  try {
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    console.log(`✓ Saved to: ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`Error saving content for ${url}:`, error.message);
    stats.errors.push({ url, error: `File write error: ${error.message}` });
    return false;
  }
}

function printProgress(current, total) {
  const percent = Math.round((current / total) * 100);
  const bar = '='.repeat(Math.floor(percent / 2)) + '>' + ' '.repeat(50 - Math.floor(percent / 2));
  process.stdout.write(`\rProgress: [${bar}] ${percent}% (${current}/${total})`);
}

function printSummary() {
  const duration = (stats.endTime - stats.startTime) / 1000;
  console.log('\n\n=== Scraping Summary ===');
  console.log(`Total URLs processed: ${stats.total}`);
  console.log(`Successful: ${stats.success} (${Math.round((stats.success / stats.total) * 100)}%)`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log('\nErrors:');
  if (stats.errors.length > 0) {
    stats.errors.forEach(({ url, error }) => {
      console.log(`- ${url}: ${error}`);
    });
  } else {
    console.log('No errors occurred!');
  }
}

async function processBatch(urls, batchSize = 3) {
  stats.total = urls.length;
  let processed = 0;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    const results = await Promise.all(
      batch.map(async (url) => {
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
        const result = await scrapeUrl(fullUrl);
        
        if (result) {
          const saved = await saveContent(url, result);
          if (saved) stats.success++;
          else stats.failed++;
        } else {
          stats.failed++;
        }
        
        processed++;
        printProgress(processed, stats.total);
        
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { url, success: !!result };
      })
    );
  }
}

async function main() {
  try {
    await ensureOutputDir();
    console.log('Starting content processing...\n');
    
    stats.startTime = Date.now();
    await processBatch(paths);
    stats.endTime = Date.now();
    
    printSummary();
  } catch (error) {
    console.error('\nFatal error:', error);
    process.exit(1);
  }
}

main(); 