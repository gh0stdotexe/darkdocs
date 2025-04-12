const validateMintlify = (content) => {
  // Check frontmatter
  if (!content.match(/^---\n.*\n---/)) {
    console.error('Missing or invalid frontmatter');
    return false;
  }

  // Check tag closure
  const tags = content.match(/<[^>]+>/g);
  for (const tag of tags) {
    if (!tag.match(/<\/[^>]+>/)) {
      console.error(`Unclosed tag: ${tag}`);
      return false;
    }
  }

  // Check component usage
  const components = ['Image', 'Tip', 'CodeBlock', 'Tabs', 'Callout'];
  for (const component of components) {
    if (content.includes(`<${component}`) && !content.includes(`</${component}>`)) {
      console.error(`Unclosed ${component} component`);
      return false;
    }
  }

  // Check heading hierarchy
  const headings = content.match(/^#+\s.*$/gm);
  let lastLevel = 0;
  for (const heading of headings) {
    const level = heading.match(/^#+/)[0].length;
    if (level > lastLevel + 1) {
      console.error(`Invalid heading hierarchy: ${heading}`);
      return false;
    }
    lastLevel = level;
  }

  // Check list formatting
  const lists = content.match(/^\s*[-*+]\s.*$/gm);
  for (const list of lists) {
    if (!list.match(/^\s{0,3}[-*+]\s/)) {
      console.error(`Invalid list formatting: ${list}`);
      return false;
    }
  }

  return true;
};

const formatMintlify = (content) => {
  // Convert markdown images to Image component
  content = content.replace(/!\[(.*?)\]\((.*?)\)/g, '<Image src="$2" alt="$1" />');

  // Convert code blocks to CodeBlock component
  content = content.replace(/```(\w+)\n([\s\S]*?)\n```/g, '<CodeBlock language="$1">\n$2\n</CodeBlock>');

  // Fix heading spacing
  content = content.replace(/^#+\s*(.*?)\s*$/gm, (match, heading) => {
    return `# ${heading.trim()}`;
  });

  // Fix list indentation
  content = content.replace(/^\s*[-*+]\s/gm, '- ');

  return content;
};

module.exports = {
  validateMintlify,
  formatMintlify
}; 