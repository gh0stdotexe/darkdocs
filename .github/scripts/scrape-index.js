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

// Initialize FirecrawlApp
const app = new FirecrawlApp({ apiKey });

// Base URL and paths
const baseUrl = 'https://docs.controld.com';
const indexUrl = `${baseUrl}/docs/`;

// Structure to hold the documentation hierarchy
const docHierarchy = {
  docs: {
    path: '/docs',
    children: {}
  }
};

// Function to extract links from markdown content
function extractLinks(content) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const [_, text, url] = match;
    // Only include links that are relative to the docs directory
    if (url.startsWith('/docs/')) {
      links.push({
        text: text.trim(),
        url: url.trim()
      });
    }
  }
  return links;
}

// Function to build the hierarchy from links
function buildHierarchy(links) {
  links.forEach(({ text, url }) => {
    const parts = url.split('/').filter(Boolean);
    let current = docHierarchy;
    
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {
          path: `/${parts.slice(0, index + 1).join('/')}`,
          children: {}
        };
      }
      current = current[part];
    });
  });
}

// Function to scrape a page and extract its content
async function scrapePage(url) {
  try {
    const response = await app.scrapeUrl(url, {
      formats: ['markdown']
    });
    
    if (!response || !response.markdown) {
      console.error(`Failed to scrape ${url}`);
      return null;
    }
    
    return {
      content: response.markdown,
      links: extractLinks(response.markdown)
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

// Function to save the hierarchy to a file
async function saveHierarchy() {
  const outputPath = path.join(process.cwd(), 'docs-hierarchy.json');
  await fs.writeFile(outputPath, JSON.stringify(docHierarchy, null, 2));
  console.log(`Saved hierarchy to: ${outputPath}`);
}

// Main function to process the documentation
async function main() {
  try {
    console.log('Scraping documentation index...');
    
    // First, scrape the index page
    const indexContent = await scrapePage(indexUrl);
    if (!indexContent) {
      throw new Error('Failed to scrape index page');
    }
    
    // Build initial hierarchy from index links
    buildHierarchy(indexContent.links);
    
    // Now process each page in the hierarchy
    const pages = Object.values(docHierarchy.docs.children);
    for (const page of pages) {
      console.log(`Processing ${page.path}...`);
      const content = await scrapePage(`${baseUrl}${page.path}`);
      if (content) {
        buildHierarchy(content.links);
      }
    }
    
    // Save the final hierarchy
    await saveHierarchy();
    
    console.log('Documentation hierarchy built successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 