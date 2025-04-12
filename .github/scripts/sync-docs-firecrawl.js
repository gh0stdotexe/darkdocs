import * as Firecrawl from '@mendable/firecrawl-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug: Check if API key is loaded
const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  console.error('Error: FIRECRAWL_API_KEY not found in environment variables');
  process.exit(1);
}
console.log('API Key loaded successfully:', apiKey.substring(0, 4) + '...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://docs.controld.com/docs/';
const DOCS_DIR = path.join(path.dirname(__dirname), '..', 'control-d');

// Initialize Firecrawl
const firecrawl = new Firecrawl.default({
  apiKey: process.env.FIRECRAWL_API_KEY
});

async function createDirectory(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

async function writeDocFile(filePath, content) {
  await createDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

async function scrapePage(url) {
  try {
    console.log(`Scraping: ${url}`);
    
    const response = await firecrawl.scrape({
      url,
      waitForSelector: 'article, main',
      timeout: 30000,
      retryAttempts: 3
    });
    
    if (!response.success) {
      console.warn(`Failed to scrape ${url}: ${response.error}`);
      return createDefaultContent(url);
    }
    
    const content = response.data;
    return convertToMintlify(content);
    
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return createDefaultContent(url);
  }
}

function createDefaultContent(url) {
  const title = url.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `---
title: "${title}"
description: "Documentation for ${title}"
---

# ${title}

This page is a placeholder for the ${title} documentation. The content will be updated soon.

## Overview

[Brief overview of ${title} will go here]

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage

[Usage instructions will go here]

## Related

- [Control D Documentation](https://docs.controld.com/)
`;
}

async function convertToMintlify(html) {
  // Remove script tags and their content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Convert headings
  html = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  html = html.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  html = html.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  
  // Convert lists
  html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  });
  
  // Convert links
  html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Convert images
  html = html.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '<Image src="$1" alt="$2" />');
  
  // Convert code blocks
  html = html.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```');
  
  // Clean up
  html = html
    .replace(/\n{3,}/g, '\n\n')
    .trim();
    
  return html;
}

async function processSection(section, parentDir) {
  console.log(`Processing section: ${section.title}`);
  
  const name = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const currentPath = path.join(parentDir, name);
  
  if (section.children && section.children.length > 0) {
    // It's a directory
    await createDirectory(currentPath);
    
    // Create index.mdx
    const indexContent = await scrapePage(section.url);
    await writeDocFile(path.join(currentPath, 'index.mdx'), indexContent);
    
    // Process children
    for (const child of section.children) {
      await processSection(child, currentPath);
    }
  } else {
    // It's a file
    const content = await scrapePage(section.url);
    await writeDocFile(`${currentPath}.mdx`, content);
  }
}

async function syncDocs() {
  try {
    console.log('Starting documentation sync with Firecrawl...');
    
    // Use the same DOC_STRUCTURE as before
    const structure = require('./sync-docs.js').DOC_STRUCTURE;
    
    for (const section of structure) {
      await processSection(section, DOCS_DIR);
    }
    
    console.log('Documentation sync completed successfully!');
    
  } catch (error) {
    console.error('Error during sync:', error);
    throw error;
  }
}

// Run the sync
syncDocs().catch(error => {
  console.error('Sync failed:', error);
  process.exit(1);
});