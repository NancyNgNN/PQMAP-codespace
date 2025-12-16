# GitHub Requirements Management Guide

This guide explains how to manage requirements using GitHub Issues and Projects as a replacement for Jira.

## Overview

Our requirement management system uses:
- **GitHub Issues** - For stories, tasks, and bugs
- **GitHub Projects** - For sprint planning and tracking
- **Automation** - Auto-updates PROJECT_FUNCTION_DESIGN.md
- **Issue Templates** - Standardized formats

## Creating Requirements

### 1. User Stories

To create a new user story:

1. Go to **Issues** → **New Issue**
2. Select **User Story** template
3. Fill in:
   - Story ID (e.g., US-001)
   - User Story (As a... I want... So that...)
   - Acceptance Criteria
   - Priority
   - Story Points
   - Related Requirements

**Example:**
```
Story ID: US-045
User Story: As a power quality engineer, I want to view SARFI events on a map, so that I can quickly identify affected areas
Priority: High
Story Points: 8
```

### 2. Tasks

To create a development task:

1. Go to **Issues** → **New Issue**
2. Select **Task** template
3. Fill in:
   - Task ID (e.g., TASK-100)
   - Description
   - Parent Story (link to issue)
   - Component
   - Estimated Hours
   - Files to Modify

**Example:**
```
Task ID: TASK-123
Description: Implement SARFI event filtering in map component
Parent Story: #45
Component: Frontend
Estimated Hours: 4
```

## Automation

When you create an issue with the `story` or `task` label:

1. ✅ Automatically added to PROJECT_FUNCTION_DESIGN.md
2. ✅ Linked to GitHub Project board
3. ✅ Comment added to issue confirming documentation update

## GitHub Project Setup

### Creating a Project Board

1. Go to **Projects** → **New Project**
2. Choose **Board** view
3. Set up columns:
   - 📋 Backlog
   - 📝 To Do
   - 🚧 In Progress
   - 👀 Review
   - ✅ Done

### Linking Issues to Projects

Issues with templates automatically get linked. You can also:
- Drag issues between columns
- Filter by label, assignee, milestone
- Create custom views (Table, Roadmap, etc.)

## Labels System

Use these labels for categorization:

### Type Labels
- `story` - User stories
- `task` - Development tasks
- `bug` - Bug fixes
- `enhancement` - Feature improvements

### Priority Labels
- `priority: critical` - Must fix immediately
- `priority: high` - Important for current sprint
- `priority: medium` - Normal priority
- `priority: low` - Nice to have

### Component Labels
- `component: frontend` - React/UI changes
- `component: backend` - API/server changes
- `component: database` - Schema/data changes
- `component: documentation` - Docs only

### Status Labels
- `status: blocked` - Cannot proceed
- `status: needs-review` - Awaiting review
- `status: in-progress` - Currently working

## Milestones for Sprints

Create milestones for sprints:

1. Go to **Issues** → **Milestones** → **New Milestone**
2. Name: `Sprint 2025-01` or `Release v2.0`
3. Set due date
4. Add description

Assign issues to milestones for sprint planning.

## Best Practices

### Story Creation
- ✅ Use clear, concise titles
- ✅ Include acceptance criteria as checkboxes
- ✅ Link related issues
- ✅ Add appropriate labels
- ✅ Assign to a milestone/sprint

### Task Breakdown
- ✅ Break stories into tasks (4-8 hours each)
- ✅ Link tasks to parent story
- ✅ List specific files to modify
- ✅ Include technical notes

### Documentation
- ✅ Reference requirement sections in commits
- ✅ Update acceptance criteria as you progress
- ✅ Close issues with descriptive commit messages

### Commit Message Format
```
type(scope): description

Closes #123
Related to #45
```

Examples:
```
feat(map): Add SARFI event filtering

Implements filtering by date range and severity level.
Closes #123
Related to #45
```

## Migration from Jira

If you're migrating from Jira:

### Option 1: Manual Migration
1. Export Jira issues to CSV
2. Use GitHub's CSV import feature
3. Map Jira fields to GitHub labels/fields

### Option 2: Automated Sync (Jira → GitHub)

See `.github/workflows/jira-sync.yml` for webhook-based sync.

Required Jira setup:
1. Install "GitHub for Jira" app
2. Configure webhook to GitHub API
3. Map issue types and fields

### Option 3: One-time Import Script

Use the GitHub CLI:
```bash
# Install GitHub CLI
gh extension install github/gh-import

# Import Jira issues
gh import jira \
  --source-url https://your-jira.atlassian.net \
  --project-key PROJ \
  --target-repo owner/repo
```

## Reporting and Analytics

### Built-in GitHub Insights
- **Issues** - All open/closed issues
- **Projects** - Sprint progress, burndown
- **Insights** → **Pulse** - Recent activity
- **Insights** → **Contributors** - Team activity

### Custom Reports

Query issues with GitHub CLI:
```bash
# Stories completed this sprint
gh issue list --label "story" --state closed --milestone "Sprint 2025-01"

# Open high-priority tasks
gh issue list --label "task,priority: high" --state open

# Blocked items
gh issue list --label "status: blocked" --state open
```

### Export Data

```bash
# Export issues to JSON
gh issue list --json number,title,state,labels,assignees > issues.json

# Export to CSV (requires jq)
gh issue list --json number,title,state,labels \
  | jq -r '.[] | [.number, .title, .state, (.labels | map(.name) | join(";"))] | @csv'
```

## Advantages Over Jira

✅ **Single Source of Truth** - Code and requirements in one place  
✅ **Better Git Integration** - Native linking between code and issues  
✅ **Markdown Support** - Rich formatting in issues  
✅ **Free for Public Repos** - No licensing costs  
✅ **Simpler Interface** - Less complexity than Jira  
✅ **Automation** - GitHub Actions for custom workflows  
✅ **API Access** - Easy integration and scripting  

## Implementation
- Issue templates back to `.github/ISSUE_TEMPLATE/`
- Workflow back to `workflows`
- Script back to `scripts`

## Troubleshooting

### Automation Not Running
- Check `.github/workflows/requirements-sync.yml`
- Verify GitHub Actions are enabled
- Check workflow permissions in Settings

### Issue Not Added to PROJECT_FUNCTION_DESIGN.md
- Ensure issue has `story` or `task` label
- Check GitHub Actions logs
- Verify `scripts/update-functional-design.js` exists

### Template Not Showing
- Templates must be in `.github/ISSUE_TEMPLATE/`
- File extension must be `.yml` or `.yaml`
- Syntax must be valid YAML

## Support

For questions or issues:
- 📖 Check GitHub Docs: https://docs.github.com/en/issues
- 💬 Ask in team discussions
- 🐛 Report automation bugs as issues

---

**Last Updated:** 2025-12-16
