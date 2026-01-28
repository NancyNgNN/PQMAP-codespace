# PQMAP Meeting Summary Generation Prompt

Generate a concise meeting summary document from detailed meeting minutes CSV for quick recap distribution to attendees.

## Input Source
- Source CSV file: Update path as needed (e.g., `PQMAP_meeting_minutes_YYYY-MM-DD.csv`)
- Extract meeting date, duration, and attendees from CSV or transcript header

## Output Requirements
- **Format**: Markdown (.md file)
- **Filename**: `PQMAP_meeting_summary_YYYY-MM-DD.md` (use meeting date, not generation date)
- **Location**: Same folder as source CSV
- **Length**: 10-15 key points (adjust based on meeting length/complexity)

## Document Structure

### 1. Header Section
```markdown
# [Project Name] - Meeting Summary
**Date:** [Meeting Date]
**Duration:** [Approximate duration]
**Attendees:** [List teams/groups, not individuals]
```

### 2. Key Decisions Section
- **Format**: Grouped by topic area (Architecture, Data/Reporting, Operations, etc.)
- **Style**: Bullet points with **bold topic headers**
- **Content**: Concrete decisions only (use "PQMAP will..." phrasing)
- **Priority**: List most important decisions first

### 3. Pain Points Identified (if applicable)
- **Format**: Table with columns: Pain Point | Current Impact | Solution
- **Purpose**: Quickly show problems discussed and how they'll be addressed
- **Max rows**: 4-6 key pain points only

### 4. Priority Action Items
- **Grouping**: 
  - Immediate (Next 1-2 weeks)
  - Design Phase
  - Integration/Planning
- **Style**: Bullet points, action-oriented verbs
- **Limit**: 10-12 most important actions only

### 5. Special Topics (conditional)
- Add sections for major discussion areas that need highlighting
- Examples: Technical requirements, Historical data needs, Compliance requirements
- Use tables if topic has multiple related items

### 6. Next Steps
- **Format**: Numbered list (1-5 items)
- **Content**: Clear next actions with timing when known
- **Focus**: What happens after this meeting

### 7. Notes (optional)
- Brief contextual notes
- Meeting format/tools used
- Stakeholder participation highlights

## Formatting Guidelines

### Brevity Rules
- **One decision per bullet point** - no multi-sentence explanations
- **Remove redundant details** - assume readers attended or have access to full minutes
- **Use tables** when 3+ related items need comparison
- **Bold key terms** for quick scanning
- **Max 2 pages** when printed/exported to PDF

### Writing Style
- **Impersonal and objective** tone
- **Active voice**: "PQMAP will implement" not "It was decided that..."
- **Present/future tense** for decisions and actions
- **Past tense** only for pain points/problems discussed
- **No attribution** unless decision requires specific owner approval

### Visual Organization
- Use `---` horizontal rules to separate major sections
- Use `###` headers for subsections
- Use **bold** for emphasis, not *italics*
- Use tables for comparisons/structured data
- Use bullet points for lists

## Using AI Assistant Clarification Questions

If the meeting minutes include an "AI Assistant Clarification Questions" section:

### When Questions Are Answered
- **Integrate answers into summary**: Use answered questions to add clarity and specificity
- **Example**: If template variables are specified, mention them in Notification System decisions
- **Enhance context**: Use technical details (user count, sync frequency) to contextualize decisions

### When Questions Are Unanswered
- **Do NOT include unanswered questions in summary** - summary is for decisions made, not pending items
- **Add to "Next Steps"** if critical questions need answers before next phase
- **Skip entirely** if questions are internal/technical details not relevant to attendees

### Question-Enhanced Summary Examples
- ❌ Poor: "Notification system will use templates"
- ✅ Better: "Notification system will use ~10 templates with variables like [duration_ms], [voltage_level], [customer_count]"

---

## Content Selection Priority

### Must Include (High Priority)
1. All key decisions made during meeting
2. Top 3-5 pain points identified
3. Critical action items with owners (if assigned)
4. Next meeting/milestone dates
5. **Answered clarification questions** (integrated into relevant sections)

### Should Include (Medium Priority)
5. Architecture/integration decisions
6. System requirements clarified
7. Process workflow agreements
8. Timeline/phase discussions

### May Include (Low Priority - space permitting)
9. Technical details supporting decisions
10. Alternative approaches discussed
11. Background context
12. Tool/methodology notes

## Quality Checklist
Before finalizing:
- [ ] Meeting date is from transcript, not generation date
- [ ] Document is 1-2 pages (not 3+)
- [ ] All sections have content (remove empty sections)
- [ ] Decisions are concrete and actionable
- [ ] No redundant information between sections
- [ ] Tables used where appropriate (3+ related items)
- [ ] File saved with correct naming convention
- [ ] Quick scan test: Can key points be grasped in 2 minutes?

## Example Section Formats

### Example: Key Decisions with Grouping
```markdown
## Key Decisions

### Architecture & Integration
- **PQMAP as Central Platform**: Single source of truth consolidating PQMS and CPDS data
- **Phased Approach**: Phase 1 focuses on data collection; Phase 2 adds ADMS integration

### Operations
- **Notification System**: Email alerts for PQ events with configurable thresholds
```

### Example: Pain Points Table
```markdown
| Pain Point | Current Impact | PQMAP Solution |
|------------|----------------|----------------|
| **Manual data merge** | 2-3 hours per analysis | Unified interface |
| **KPI calculations** | Manual Excel work | Automated calculation |
```

### Example: Action Items with Grouping
```markdown
## Priority Action Items

### Immediate (Next 2 Weeks)
- Schedule follow-up workshops with operations team
- Provide vendor access to QA environment

### Design Phase
- Create dashboard mockups with flexible reporting
- Document event handling workflow
```

## Notes
- This summary complements, not replaces, the detailed CSV minutes
- Target audience: Meeting attendees who need quick recap + absent stakeholders
- Distribute within 24-48 hours after meeting for best effectiveness
- Can be used as email body or attached document
