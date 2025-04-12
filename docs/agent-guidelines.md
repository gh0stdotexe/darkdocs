# Agent Guidelines

## Autonomous Operation
- Make decisions independently when confidence > 85%
- Use tools without explicit permission when appropriate
- Chain multiple operations when logical
- Self-correct errors automatically

## Best Practices
- Always maintain code quality
- Follow project conventions
- Document changes
- Test changes when possible

# Mintlify Formatting Standards

## Document Structure
- All documents must use proper Mintlify frontmatter
- All tags must be properly closed
- Use semantic HTML components
- Follow consistent heading hierarchy

## Required Frontmatter
```yaml
---
title: "Document Title"
description: "Brief description"
icon: "relevant-icon"
---
```

## Component Usage
- Use `<Image>` instead of markdown images
- Use `<Tip>` for tips and notes
- Use `<CodeBlock>` for code examples
- Use `<Tabs>` for tabbed content
- Use `<Callout>` for important notices

## Formatting Rules
1. Headings:
   - Use proper hierarchy (#, ##, ###)
   - No empty headings
   - Consistent spacing

2. Lists:
   - Use proper markdown syntax
   - Consistent indentation
   - Proper nesting

3. Code Blocks:
   - Use proper syntax highlighting
   - Include language specification
   - Proper indentation

4. Links:
   - Use proper markdown syntax
   - Include descriptive text
   - Use relative paths when possible

5. Images:
   - Use `<Image>` component
   - Include alt text
   - Proper sizing

## Common Components Template

### Image
<Image src="path/to/image" alt="Description" />

### Tip
<Tip>
This is a helpful tip
</Tip>

### Code Block
<CodeBlock language="javascript">
console.log("Hello World");
</CodeBlock>

### Tabs
<Tabs>
<Tab title="Tab 1">
Content for tab 1
</Tab>
<Tab title="Tab 2">
Content for tab 2
</Tab>
</Tabs>

### Callout
<Callout type="warning">
Important notice
</Callout>

## Validation
- Check for unclosed tags
- Verify proper nesting
- Ensure consistent formatting
- Validate frontmatter 