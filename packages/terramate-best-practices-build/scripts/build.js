#!/usr/bin/env node

/**
 * Build script for terramate-best-practices skill
 * Compiles individual rule files into AGENTS.md
 */

const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '../../../skills/terramate-best-practices');
const RULES_DIR = path.join(SKILL_DIR, 'rules');
const OUTPUT_FILE = path.join(SKILL_DIR, 'AGENTS.md');

function getRuleFiles() {
  return fs.readdirSync(RULES_DIR)
    .filter(file => file.endsWith('.md'))
    .sort();
}

function extractRuleContent(filename) {
  const content = fs.readFileSync(path.join(RULES_DIR, filename), 'utf-8');
  return content;
}

function build() {
  console.log('Building terramate-best-practices AGENTS.md...');
  
  const ruleFiles = getRuleFiles();
  console.log(`Found ${ruleFiles.length} rule files`);
  
  let output = '# Terramate Best Practices - Full Reference\n\n';
  output += 'Comprehensive guide for Terramate CLI, Cloud, and Catalyst, maintained by Terramate.\n\n';
  output += '---\n\n';
  
  for (const file of ruleFiles) {
    const content = extractRuleContent(file);
    output += content + '\n\n---\n\n';
  }
  
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

build();
