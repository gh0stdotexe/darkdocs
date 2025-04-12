import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const HTML_TO_MINTLIFY = {
  'img': 'Image',
  'a': 'Link',
  'div class="tip"': 'Tip',
  'div class="callout"': 'Callout'
};

function fixFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    content = `---
title: "${path.basename(file, '.mdx')}"
description: "Description for ${path.basename(file, '.mdx')}"
icon: "book"
---

${content}`;
  }

  return content;
}

function fixComponents(content) {
  let fixedContent = content;

  // Replace HTML tags with Mintlify components
  for (const [htmlTag, mintlifyComponent] of Object.entries(HTML_TO_MINTLIFY)) {
    const regex = new RegExp(`<${htmlTag}([^>]*)>`, 'g');
    fixedContent = fixedContent.replace(regex, (match, attributes) => {
      return `<${mintlifyComponent}${attributes}>`;
    });
  }

  // Fix closing tags
  for (const [htmlTag, mintlifyComponent] of Object.entries(HTML_TO_MINTLIFY)) {
    const regex = new RegExp(`</${htmlTag}>`, 'g');
    fixedContent = fixedContent.replace(regex, `</${mintlifyComponent}>`);
  }

  return fixedContent;
}

async function fixFiles() {
  const files = await glob('**/*.mdx');
  let fixedCount = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    content = fixFrontmatter(content);
    content = fixComponents(content);

    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed ${file}`);
      fixedCount++;
    }
  }

  console.log(`\nFixed ${fixedCount} files`);
}

fixFiles().catch(console.error); 