const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('yaml');

const BASE_URL = 'https://docs.controld.com/docs/';
const DOCS_DIR = 'control-d';

async function validateDocs() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    // Get online structure
    const onlineStructure = await getOnlineStructure(page);
    
    // Get local structure
    const localStructure = await getLocalStructure();
    
    // Compare structures
    const structureIssues = compareStructures(onlineStructure, localStructure);
    
    // Validate content
    const contentIssues = await validateContent(page, onlineStructure);
    
    // Validate Mintlify formatting
    const formatIssues = await validateFormatting();
    
    // Report issues
    reportIssues([...structureIssues, ...contentIssues, ...formatIssues]);
    
    // Exit with error if issues found
    if (structureIssues.length > 0 || contentIssues.length > 0 || formatIssues.length > 0) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

async function getOnlineStructure(page) {
  await page.goto(BASE_URL);
  
  return page.evaluate(() => {
    function getStructure(element) {
      const items = [];
      const links = element.querySelectorAll('a');
      
      links.forEach(link => {
        const item = {
          title: link.textContent.trim(),
          url: link.href,
          children: []
        };
        
        const parent = link.closest('li');
        if (parent) {
          const subList = parent.querySelector('ul');
          if (subList) {
            item.children = getStructure(subList);
          }
        }
        
        items.push(item);
      });
      
      return items;
    }
    
    return getStructure(document.querySelector('nav'));
  });
}

async function getLocalStructure() {
  async function readDir(dir) {
    const items = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const children = await readDir(fullPath);
        items.push({
          title: entry.name,
          path: fullPath,
          children
        });
      } else if (entry.name.endsWith('.mdx')) {
        const content = await fs.readFile(fullPath, 'utf8');
        const frontmatter = extractFrontmatter(content);
        items.push({
          title: frontmatter.title || entry.name,
          path: fullPath,
          children: []
        });
      }
    }
    
    return items;
  }
  
  return readDir(DOCS_DIR);
}

function compareStructures(online, local) {
  const issues = [];
  
  function compare(onlineItems, localItems, path = '') {
    // Check for missing sections
    onlineItems.forEach(onlineItem => {
      const localItem = localItems.find(l => 
        l.title.toLowerCase() === onlineItem.title.toLowerCase()
      );
      
      if (!localItem) {
        issues.push({
          type: 'missing_section',
          path: path + '/' + onlineItem.title,
          message: `Missing section: ${onlineItem.title}`
        });
      } else if (onlineItem.children.length > 0) {
        compare(onlineItem.children, localItem.children || [], path + '/' + onlineItem.title);
      }
    });
    
    // Check for extra sections
    localItems.forEach(localItem => {
      const onlineItem = onlineItems.find(o => 
        o.title.toLowerCase() === localItem.title.toLowerCase()
      );
      
      if (!onlineItem) {
        issues.push({
          type: 'extra_section',
          path: path + '/' + localItem.title,
          message: `Extra section not in online docs: ${localItem.title}`
        });
      }
    });
  }
  
  compare(online, local);
  return issues;
}

async function validateContent(page, structure) {
  const issues = [];
  
  async function validateSection(item, filePath) {
    // Get online content
    await page.goto(item.url);
    const onlineContent = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.textContent.trim() : '';
    });
    
    // Get local content
    try {
      const localContent = await fs.readFile(filePath, 'utf8');
      const strippedLocalContent = stripFrontmatter(localContent).trim();
      
      // Compare content (ignoring whitespace and formatting)
      if (!contentMatches(onlineContent, strippedLocalContent)) {
        issues.push({
          type: 'content_mismatch',
          path: filePath,
          message: `Content does not match online version: ${item.title}`
        });
      }
      
      // Validate children
      for (const child of item.children) {
        const childPath = path.join(path.dirname(filePath), child.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.mdx');
        await validateSection(child, childPath);
      }
    } catch (error) {
      issues.push({
        type: 'file_error',
        path: filePath,
        message: `Error reading file: ${error.message}`
      });
    }
  }
  
  for (const section of structure) {
    const filePath = path.join(DOCS_DIR, section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.mdx');
    await validateSection(section, filePath);
  }
  
  return issues;
}

async function validateFormatting() {
  const issues = [];
  
  async function validateFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Check frontmatter
    if (!hasFrontmatter(content)) {
      issues.push({
        type: 'missing_frontmatter',
        path: filePath,
        message: 'Missing frontmatter'
      });
    }
    
    // Check for unclosed tags
    const unclosedTags = findUnclosedTags(content);
    if (unclosedTags.length > 0) {
      issues.push({
        type: 'unclosed_tags',
        path: filePath,
        message: `Unclosed tags: ${unclosedTags.join(', ')}`
      });
    }
    
    // Check code blocks
    if (!validateCodeBlocks(content)) {
      issues.push({
        type: 'invalid_code_blocks',
        path: filePath,
        message: 'Invalid code block formatting'
      });
    }
  }
  
  async function walkDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.name.endsWith('.mdx')) {
        await validateFile(fullPath);
      }
    }
  }
  
  await walkDir(DOCS_DIR);
  return issues;
}

function reportIssues(issues) {
  if (issues.length === 0) {
    console.log('✅ All documentation is valid');
    return;
  }
  
  console.log('❌ Documentation validation failed');
  console.log('\nIssues found:');
  
  const groupedIssues = issues.reduce((acc, issue) => {
    acc[issue.type] = acc[issue.type] || [];
    acc[issue.type].push(issue);
    return acc;
  }, {});
  
  for (const [type, typeIssues] of Object.entries(groupedIssues)) {
    console.log(`\n${type}:`);
    typeIssues.forEach(issue => {
      console.log(`  - ${issue.path}: ${issue.message}`);
    });
  }
}

// Helper functions
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? yaml.parse(match[1]) : {};
}

function stripFrontmatter(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n/, '');
}

function hasFrontmatter(content) {
  return /^---\n[\s\S]*?\n---/.test(content);
}

function findUnclosedTags(content) {
  const tagRegex = /<([A-Za-z][A-Za-z0-9]*)[^>]*>/g;
  const closingTagRegex = /<\/([A-Za-z][A-Za-z0-9]*)>/g;
  const tags = [];
  const unclosedTags = [];
  
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1]);
  }
  
  while ((match = closingTagRegex.exec(content)) !== null) {
    const index = tags.lastIndexOf(match[1]);
    if (index !== -1) {
      tags.splice(index, 1);
    }
  }
  
  return tags;
}

function validateCodeBlocks(content) {
  const codeBlockRegex = /```[\s\S]*?```/g;
  return content.match(codeBlockRegex)?.every(block => 
    block.startsWith('```') && block.endsWith('```')
  ) ?? true;
}

function contentMatches(online, local) {
  // Normalize content for comparison
  const normalize = text => 
    text.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  
  return normalize(online) === normalize(local);
}

// Run validation
validateDocs().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
}); 