import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to convert markdown to Mintlify format
function convertToMintlify(markdown) {
  if (!markdown) return '';
  
  // Remove "Skip link to" sections
  markdown = markdown.replace(/\s*<Link[^>]*>Skip link to[^<]*<\/Link>/g, '');

  // Convert blockquotes before headings to avoid conflicts
  markdown = markdown.replace(/^>\s*##?\s+(.*)$/gm, '<Blockquote>$1</Blockquote>');
  markdown = markdown.replace(/^>\s*(.*)$/gm, '<Blockquote>$1</Blockquote>');

  // Remove emojis from headings and clean up heading format
  markdown = markdown.replace(/^(#+)\s*[📛📚🛠️🎁🚫☠️↪️📈⚙️🛡️]*\s*([^\n]+?)(?:\s+<Link[^>]*>[^<]*<\/Link>)?$/gm, (match, hashes, content) => {
    return `${hashes} ${content.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}`;
  });

  // Convert code blocks
  markdown = markdown.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `\`\`\`${lang || ''}\n${code.trim()}\`\`\``;
  });

  // Convert links (excluding already converted ones)
  markdown = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    if (text.includes('Skip link to')) {
      return '';
    }
    return `<Link href="${url}">${text}</Link>`;
  });

  // Convert images
  markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    return `<Image src="${src}" alt="${alt || ''}" />`;
  });

  // Clean up empty lines and normalize spacing
  markdown = markdown
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .join('\n\n');

  // Clean up multiple newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  return markdown;
}

// Process all files in the scraped-docs directory
const inputDir = path.join(__dirname, '../../scraped-docs');
const outputDir = path.join(__dirname, '../../docs');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read all JSON files in the input directory
const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.json'));

files.forEach(file => {
  try {
    const filePath = path.join(inputDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Skip 404 pages
    if (content.content?.metadata?.statusCode === 404) {
      console.log(`Skipping 404 page: ${file}`);
      return;
    }

    // Extract metadata
    const metadata = {
      title: content.content?.metadata?.ogTitle || 
             content.content?.metadata?.title || 
             content.metadata?.sections?.[0] || 
             'Untitled',
      description: content.content?.metadata?.ogDescription || 
                  content.content?.metadata?.description || 
                  '',
      icon: content.content?.metadata?.icon || 'book'
    };

    // Clean up title - remove markdown and HTML
    metadata.title = metadata.title
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove image markdown
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
      .trim();

    if (!metadata.title) {
      metadata.title = file
        .replace('_docs_', '')
        .replace('.json', '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Convert markdown content
    const mintlifyContent = convertToMintlify(content.content?.markdown);

    // Generate frontmatter
    const frontmatter = `---
title: ${metadata.title}
description: ${metadata.description}
icon: ${metadata.icon}
---

`;

    // Write the converted content to a new file
    const outputFile = path.join(outputDir, file.replace('_docs_', '').replace('.json', '.mdx'));
    fs.writeFileSync(outputFile, frontmatter + mintlifyContent);
    
    console.log(`Converted ${file} to ${path.basename(outputFile)}`);
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
}); 