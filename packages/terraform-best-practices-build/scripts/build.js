#!/usr/bin/env node

/**
 * Build script for terraform-best-practices skill
 * Compiles individual rule files into AGENTS.md
 */

const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '../../../skills/terraform-best-practices');
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
  console.log('Building terraform-best-practices AGENTS.md...');
  
  const ruleFiles = getRuleFiles();
  console.log(`Found ${ruleFiles.length} rule files`);
  
  let output = '# Terraform Best Practices - Full Reference\n\n';
  output += 'Comprehensive optimization guide for Terraform and Infrastructure as Code, maintained by Terramate.\n\n';
  output += '---\n\n';
  
  for (const file of ruleFiles) {
    const content = extractRuleContent(file);
    output += content + '\n\n---\n\n';
  }
  
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

build();
