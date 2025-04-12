import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const REQUIRED_FRONTMATTER = ['title', 'description', 'icon'];
const MINTLIFY_COMPONENTS = ['Image', 'Tip', 'Link', 'Callout', 'Tabs', 'Tab', 'Steps', 'Step'];

function validateFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return { valid: false, error: 'Missing frontmatter' };
  }

  const frontmatter = frontmatterMatch[1];
  const missingFields = REQUIRED_FRONTMATTER.filter(field => !frontmatter.includes(`${field}:`));
  
  if (missingFields.length > 0) {
    return { valid: false, error: `Missing required frontmatter fields: ${missingFields.join(', ')}` };
  }

  return { valid: true };
}

function validateComponents(content) {
  const htmlTags = content.match(/<([a-z]+)(?![^>]*\/>)[^>]*>/g) || [];
  const invalidTags = htmlTags.filter(tag => {
    const tagName = tag.match(/<([a-z]+)/)[1];
    return !MINTLIFY_COMPONENTS.includes(tagName.charAt(0).toUpperCase() + tagName.slice(1));
  });

  if (invalidTags.length > 0) {
    return { valid: false, error: `Found HTML tags that should be Mintlify components: ${invalidTags.join(', ')}` };
  }

  return { valid: true };
}

async function validateFiles() {
  const files = await glob('**/*.mdx');
  let hasErrors = false;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    const frontmatterResult = validateFrontmatter(content);
    if (!frontmatterResult.valid) {
      console.error(`❌ ${file}: ${frontmatterResult.error}`);
      hasErrors = true;
    }

    const componentsResult = validateComponents(content);
    if (!componentsResult.valid) {
      console.error(`❌ ${file}: ${componentsResult.error}`);
      hasErrors = true;
    }

    if (frontmatterResult.valid && componentsResult.valid) {
      console.log(`✅ ${file}: Valid Mintlify format`);
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

validateFiles().catch(console.error); 