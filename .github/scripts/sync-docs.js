import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://docs.controld.com/docs/';
const DOCS_DIR = path.join(path.dirname(__dirname), '..', 'control-d');

// Documentation structure from scraped index
const DOC_STRUCTURE = [
  {
    title: 'Getting Started',
    children: [
      { title: 'Introduction' },
      { title: 'Use Cases',
        children: [
          { title: 'Personal Use Cases' },
          { title: 'Business Use Cases' }
        ]
      },
      { title: 'Deployment' },
      { title: 'Limitations' },
      { title: 'Free DNS Resolvers' },
      { title: 'Control D IP Ranges' }
    ]
  },
  {
    title: 'Web Dashboard',
    children: [
      { 
        title: 'Profiles',
        children: [
          { title: 'DNS Rebind Protection' },
          { title: 'IPv4/IPv6 Compatibility Mode' },
          { title: 'Disable DNSSEC' },
          { title: 'TTL Overrides' },
          { title: 'AI Malware Filter' },
          { title: 'Safe Search' },
          { title: 'Restricted YouTube' },
          { title: 'Lock Profile' },
          { title: 'Blocked Query Response' },
          { title: 'Org: Shared Profile' },
          { title: 'DNS64' }
        ]
      },
      {
        title: 'Endpoints',
        children: [
          { title: 'Multiple Enforced Profiles' },
          { title: 'IP Management' },
          { title: 'Legacy Resolver' },
          { title: 'Auto Authorize IP' },
          { title: 'Dynamic DNS' },
          { title: 'Expose IP via DNS' },
          { title: 'Analytics' },
          { title: 'Status' },
          { title: 'Prevent Deactivation' },
          { title: 'Device Clients' },
          { title: 'Org: Restricted Resolver' },
          { title: 'Org: Add Multiple Devices' }
        ]
      },
      {
        title: 'Filters',
        children: [
          { title: 'Ads & Trackers Modes' },
          { title: 'Malware' }
        ]
      },
      { title: 'Services' },
      {
        title: 'Custom Rules',
        children: [
          { title: 'Folders' },
          { title: 'Geo Custom Rules' },
          { title: 'Magic Folders' }
        ]
      },
      { title: 'Default Rule' },
      {
        title: 'Analytics',
        children: [
          { title: 'Statistics' },
          { title: 'Activity Log' },
          { title: 'Org: Admin Logs' },
          { title: 'Org: Email Reports' }
        ]
      },
      { title: 'Status Page' },
      {
        title: 'Organizations',
        children: [
          { title: 'Members and Permissions' },
          { title: 'Sub Organizations' },
          { title: 'Billing Management' },
          { title: 'Connected Devices' },
          { title: 'API' },
          { title: 'Profiles' },
          { title: 'Global Profile' }
        ]
      }
    ]
  },
  {
    title: 'Onboarding',
    children: [
      {
        title: 'Software',
        children: [
          { title: 'GUI Setup Utility' },
          { title: 'Command Line Daemon' },
          { title: 'How to Debug ctrld' }
        ]
      },
      {
        title: 'Supported Platforms',
        children: [
          { title: 'Windows' },
          { title: 'MacOS' },
          { title: 'Linux' },
          { title: 'Android' },
          { title: 'iOS' },
          { title: 'Browsers' },
          { title: 'Routers' },
          { title: 'Windows Server / AD Controller' }
        ]
      },
      { title: 'Self-Provisioning' },
      {
        title: 'Org: Mass Provisioning',
        children: [
          { title: 'NinjaRMM Tutorial' },
          { title: 'Microsoft inTune Tutorial' },
          { title: 'Datto RMM Tutorial' },
          { title: 'N-able RMM Tutorial' },
          { title: 'Atera RMM Tutorial' }
        ]
      }
    ]
  },
  {
    title: 'Troubleshooting',
    children: [
      { title: 'IP not authorized' },
      { title: 'High latency/slow speeds' },
      { title: 'Unable to resolve any website / No Internet' },
      { title: 'Check if DNS is working' },
      { title: 'Collect Activity Log' },
      { title: "Doesn't work on captive portals" },
      { title: 'IP mismatch between DNS and Proxy' },
      { title: 'Lost Password/2FA' },
      { title: 'Browser not using OS DNS' },
      { title: 'iCloud Private Relay' },
      { title: 'How to troubleshoot geo-blocking issues' }
    ]
  },
  {
    title: 'Guides',
    children: [
      { title: 'Block Internet on a Schedule' },
      { title: 'Update IP via Heartbeat Device' },
      { title: 'Advanced rules creation guide' },
      {
        title: 'Legacy Router Guides',
        children: [
          { title: 'ASUS Router Guide' },
          { title: 'NETGEAR Router Guide' },
          { title: 'Linksys Router Guide' },
          { title: 'D-Link Router Guide' },
          { title: 'TP-Link Router Guide' },
          { title: 'DD-WRT Router Guide' },
          { title: 'FreshTomato Router Guide' },
          { title: 'FRITZ!Box Router Guide' }
        ]
      },
      { title: 'Root Certificate Installation' },
      {
        title: 'Active Directory Integration Guide',
        children: [
          { title: 'Microsoft NCSI / Connectivity Warning' }
        ]
      },
      {
        title: 'Log Streaming and Exporting',
        children: [
          { title: 'CSV Export How-To' },
          {
            title: 'SIEM Log Streaming with Fluentbit (Alpha)',
            children: [
              { title: 'Integration: General Purpose' },
              { title: 'Integration: Splunk' },
              { title: 'Log Field Reference' }
            ]
          }
        ]
      },
      { title: 'Tailscale Integration' },
      { title: 'GL.iNet Setup Guide' },
      { title: 'Create a DNS Stamp for Control D' },
      { title: 'SSO: OIDC with Okta' }
    ]
  }
];

function generateUrl(title) {
  // Convert title to URL-friendly format
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Check if it's a special case
  if (title.includes('Guide')) {
    return `${BASE_URL}guides/${slug}`;
  }
  
  if (title.includes('Tutorial')) {
    return `${BASE_URL}tutorials/${slug}`;
  }
  
  // Default case
  return `${BASE_URL}${slug}`;
}

function addUrlsToStructure(structure) {
  return structure.map(item => {
    const newItem = {
      ...item,
      url: generateUrl(item.title)
    };
    
    if (item.children) {
      newItem.children = addUrlsToStructure(item.children);
    }
    
    return newItem;
  });
}

async function scrapeDocStructure(page) {
  await page.goto(BASE_URL);
  
  // Wait for navigation to load
  await page.waitForSelector('nav', { timeout: 10000 });
  await page.waitForTimeout(2000); // Wait for dynamic content
  
  // Get all navigation links and their hierarchy
  const structure = await page.evaluate(() => {
    function getStructure(element) {
      const items = [];
      
      // Handle main sections
      const sections = element.querySelectorAll('h2');
      sections.forEach(section => {
        const sectionTitle = section.textContent.trim();
        const sectionList = section.nextElementSibling;
        
        if (sectionList && sectionList.tagName === 'UL') {
          const item = {
            title: sectionTitle,
            url: BASE_URL + sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            children: []
          };
          
          // Get all links in this section
          const links = sectionList.querySelectorAll('li');
          links.forEach(li => {
            const link = li.querySelector('a');
            if (!link) return;
            
            const subItem = {
              title: link.textContent.trim(),
              url: link.href,
              children: []
            };
            
            // Check for nested items
            const subList = li.querySelector('ul');
            if (subList) {
              const subLinks = subList.querySelectorAll('li > a');
              subLinks.forEach(subLink => {
                subItem.children.push({
                  title: subLink.textContent.trim(),
                  url: subLink.href,
                  children: []
                });
              });
            }
            
            item.children.push(subItem);
          });
          
          items.push(item);
        }
      });
      
      return items;
    }
    
    const nav = document.querySelector('nav');
    console.log('Nav element found:', !!nav);
    return nav ? getStructure(nav) : [];
  });
  
  console.log('Raw structure:', JSON.stringify(structure, null, 2));
  return structure;
}

function validateUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'docs.controld.com';
  } catch (e) {
    return false;
  }
}

async function scrapePageContent(page, url) {
  console.log(`Scraping content from: ${url}`);
  
  if (!validateUrl(url)) {
    console.warn(`Invalid URL: ${url}`);
    return createDefaultContent(url);
  }
  
  try {
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // First check if the URL exists
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (!response.ok()) {
      console.warn(`Failed to load ${url}: ${response.status()} ${response.statusText()}`);
      if (response.status() === 404) {
        console.warn(`404 error for ${url}, checking alternative URL format`);
        // Try alternative URL format
        const altUrl = url.replace(/\/docs\//, '/');
        const altResponse = await page.goto(altUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        if (altResponse.ok()) {
          console.log(`Found content at alternative URL: ${altUrl}`);
          url = altUrl;
        } else {
          return createDefaultContent(url);
        }
      } else {
        return createDefaultContent(url);
      }
    }
    
    // Wait for content to load
    try {
      await page.waitForSelector('article, main', { timeout: 20000 });
    } catch (e) {
      console.warn(`Content not found at ${url}, using default template`);
      return createDefaultContent(url);
    }
    
    // Get main content
    const content = await page.evaluate(() => {
      const article = document.querySelector('article');
      const main = document.querySelector('main');
      return (article || main)?.innerHTML || '';
    });
    
    if (!content) {
      console.warn(`No content found at ${url}, using default template`);
      return createDefaultContent(url);
    }
    
    // Convert HTML to Mintlify format
    const mintlifyContent = await convertToMintlify(content);
    return mintlifyContent;
    
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
  html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    let counter = 1;
    return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => `${counter++}. $1\n`);
  });
  
  // Convert links
  html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Convert images
  html = html.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '<Image src="$1" alt="$2" />');
  
  // Convert code blocks
  html = html.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```');
  html = html.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // Convert emphasis
  html = html.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  html = html.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  
  // Convert blockquotes
  html = html.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n');
  
  // Convert tables
  html = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, content) => {
    const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    return rows.map(row => {
      const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      return '| ' + cells.map(cell => cell.replace(/<\/?t[dh][^>]*>/gi, '').trim()).join(' | ') + ' |';
    }).join('\n');
  });
  
  // Convert special components
  html = html.replace(/<div[^>]*class="[^"]*warning[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '<Warning>$1</Warning>');
  html = html.replace(/<div[^>]*class="[^"]*tip[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '<Tip>$1</Tip>');
  html = html.replace(/<div[^>]*class="[^"]*note[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, '<Note>$1</Note>');
  
  // Clean up
  html = html
    .replace(/\n{3,}/g, '\n\n')  // Remove extra newlines
    .replace(/&nbsp;/g, ' ')     // Replace &nbsp; with space
    .replace(/&amp;/g, '&')      // Replace &amp; with &
    .replace(/&lt;/g, '<')       // Replace &lt; with <
    .replace(/&gt;/g, '>')       // Replace &gt; with >
    .trim();                     // Trim whitespace
    
  // Add frontmatter if not present
  if (!html.startsWith('---')) {
    const title = (html.match(/# (.*?)\n/) || [])[1] || 'Untitled';
    const description = (html.match(/\n([^#\n].*?)\n/) || [])[1] || '';
    html = `---
title: "${title}"
description: "${description}"
---

${html}`;
  }
  
  return html;
}

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

async function syncDocs() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('Starting documentation sync...');
    const structure = addUrlsToStructure(DOC_STRUCTURE);
    console.log('Using structure:', JSON.stringify(structure, null, 2));
    
    for (const section of structure) {
      console.log('Processing section:', section.title);
      await processSection(page, section, DOCS_DIR);
    }
    
  } catch (error) {
    console.error('Error during sync:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function processSection(page, section, parentDir) {
  console.log(`Processing section: ${section.title} at URL: ${section.url}`);
  
  // Convert section title to file/directory name
  const name = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const currentPath = path.join(parentDir, name);
  
  if (section.children && section.children.length > 0) {
    // It's a directory
    console.log(`Creating directory: ${currentPath}`);
    await createDirectory(currentPath);
    
    // Create index.mdx
    console.log(`Creating index for: ${section.title}`);
    const indexContent = await scrapePageContent(page, section.url);
    await writeDocFile(path.join(currentPath, 'index.mdx'), indexContent);
    
    // Process children
    for (const child of section.children) {
      await processSection(page, child, currentPath);
    }
  } else {
    // It's a file
    console.log(`Creating file: ${currentPath}.mdx`);
    const content = await scrapePageContent(page, section.url);
    await writeDocFile(`${currentPath}.mdx`, content);
  }
}

// Run the sync
syncDocs().catch(error => {
  console.error('Sync failed:', error);
  process.exit(1);
}); 