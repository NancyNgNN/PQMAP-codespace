#!/usr/bin/env node

/**
 * Update Project Functional Design from GitHub Issues
 * 
 * This script automatically updates PROJECT_FUNCTION_DESIGN.md
 * when new requirements are added via GitHub Issues
 */

const fs = require('fs').promises;
const path = require('path');

const FUNCTIONAL_DESIGN_PATH = path.join(__dirname, '../Artifacts/PROJECT_FUNCTION_DESIGN.md');

/**
 * Parse issue body to extract structured data
 */
function parseIssueData(issueBody, issueTitle, issueNumber, labels) {
  const data = {
    id: extractField(issueBody, 'Story ID') || extractField(issueBody, 'Task ID') || `REQ-${issueNumber}`,
    title: issueTitle.replace(/^\[(STORY|TASK)\]\s*/, ''),
    type: labels.includes('story') ? 'User Story' : 'Task',
    userStory: extractField(issueBody, 'User Story'),
    acceptanceCriteria: extractField(issueBody, 'Acceptance Criteria'),
    description: extractField(issueBody, 'Description'),
    priority: extractField(issueBody, 'Priority'),
    component: extractField(issueBody, 'Component'),
    issueNumber: issueNumber
  };
  
  return data;
}

/**
 * Extract field value from issue body
 */
function extractField(body, fieldName) {
  const regex = new RegExp(`###\\s*${fieldName}\\s*\\n\\s*([\\s\\S]*?)(?=\\n###|$)`, 'i');
  const match = body.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Update the functional design document
 */
async function updateFunctionalDesign(issueData) {
  try {
    let content = await fs.readFile(FUNCTIONAL_DESIGN_PATH, 'utf-8');
    
    // Find or create Requirements section
    const reqSectionRegex = /## Requirements\s*\n/;
    if (!reqSectionRegex.test(content)) {
      content += '\n\n## Requirements\n\n';
    }
    
    // Create new requirement entry
    const timestamp = new Date().toISOString().split('T')[0];
    const newEntry = `
### ${issueData.id}: ${issueData.title}

**Type:** ${issueData.type}  
**Priority:** ${issueData.priority || 'Not specified'}  
**Component:** ${issueData.component || 'Not specified'}  
**GitHub Issue:** [#${issueData.issueNumber}](../../issues/${issueData.issueNumber})  
**Date Added:** ${timestamp}

${issueData.userStory ? `**User Story:**\n${issueData.userStory}\n` : ''}
${issueData.description ? `**Description:**\n${issueData.description}\n` : ''}
${issueData.acceptanceCriteria ? `**Acceptance Criteria:**\n${issueData.acceptanceCriteria}\n` : ''}

---
`;
    
    // Append to Requirements section
    content = content.replace(
      /## Requirements\s*\n/,
      `## Requirements\n${newEntry}`
    );
    
    await fs.writeFile(FUNCTIONAL_DESIGN_PATH, content, 'utf-8');
    console.log(`✅ Updated PROJECT_FUNCTION_DESIGN.md with ${issueData.id}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating functional design:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  // Check if running in GitHub Actions
  const issueBody = process.env.ISSUE_BODY;
  const issueTitle = process.env.ISSUE_TITLE;
  const issueNumber = process.env.ISSUE_NUMBER;
  const issueLabels = process.env.ISSUE_LABELS ? process.env.ISSUE_LABELS.split(',') : [];
  
  if (!issueBody || !issueTitle) {
    console.log('ℹ️  No issue data found. Run this script via GitHub Actions.');
    process.exit(0);
  }
  
  const issueData = parseIssueData(issueBody, issueTitle, issueNumber, issueLabels);
  await updateFunctionalDesign(issueData);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { updateFunctionalDesign, parseIssueData };
