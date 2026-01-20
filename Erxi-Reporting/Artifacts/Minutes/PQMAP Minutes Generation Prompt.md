# PQMAP Minutes Generation Prompt

Please follow the prompt to produce meeting minutes in a consistent CSV format, even if prior CSVs are not provided.

## Input Source
- Transcript file path: Update as needed (e.g., `/workspaces/codespaces-react/Artifacts/Minutes/PQMAP - Design discussion.txt`)
- Encoding: UTF-8; Traditional Chinese (繁體中文) content acceptable.
- Extract meeting date from transcript header (format: "Month Day, Year, Time")
- If the transcript is unavailable, proceed with assumed meeting content and keep the format consistent.

## Output Requirements
- Create a UTF-8 CSV with headers:
  - Reportor (name), Topic, Area (category), Description, Discussion, Decision (If any), Action Item (if any)
- Save to: `/workspaces/codespaces-react/Artifacts/Minutes/`
- Filename scheme: `PQMAP_meeting_minutes_YYYY-MM-DD.csv`
  - Use the **meeting date from the transcript** (not generation date)
  - If conflict, append `-01`, `-02`, etc. (e.g., `PQMAP_meeting_minutes_2025-12-05.csv`, `PQMAP_meeting_minutes_2025-12-05-01.csv`)

## Row Structure and Grouping Rules
- Produce multiple rows, one distinct topic per row.
- If sub-points belong to the same topic, group them in a single row and use bulleted items in “Discussion” and "Action Items"(newline-separated).
- Reporter mapping: Use the first speaker who raised/led the topic as “Reportor (name)”. If unclear, leave blank.
- Keep entries concise and impersonal.

## Area Categories (prefer these first)
- Architect, Process, Operations, Pain Point, Integration, Data/Monitoring, Governance, Notification, UI/UX, Reporting/BI

## Decisions and Actions
- Phrase decisions concretely (e.g., "PQMAP will …").
- If decision is implied from discussion, note as "(Implied)" in the decision field.
- Keep action items specific and measurable where possible.

## Key Topics to Ensure Coverage
- Pain points of old system
- Business as-is (existing operation flow)
- WBS in PQMAP

## Keywords to Respect in Parsing
- PQMAP, PQMS, PQDA, CPDS (also CPDIS), ADMS, Datadog
- Note: CPDS and CPDIS refer to the same system

## Quality Checklist
Before finalizing, verify:
- [ ] Meeting date extracted from transcript (not generation date)
- [ ] All three key topic areas covered: Pain points, Business as-is, WBS components
- [ ] Reporter names match actual speakers from transcript
- [ ] Discussion points use bullet format with newlines (`\n`)
- [ ] Decisions use "PQMAP will..." phrasing
- [ ] Action items are specific and actionable
- [ ] File saved with correct naming convention

## Example Row (use this grouping style)
````csv
Reportor (name),Topic,Area (category),Description,Discussion,Decision (If any),Action Item (if any)
"Arthur Chan","Notification setup","Notification","Define internal notification strategy and configuration in PQMAP.","• Notification types to include: PQ events, meter disconnects, watchdog/server anomalies.\n• Recipient groups: operators (primary), managers (selected summaries).\n• Channel: email (primary).\n• Configuration: thresholds per type; admin UI to maintain recipient lists and rules.","PQMAP internal notification via email to operators on all PQ events, meter disconnect, and watchdog anomalies (Implied).","• Build notification admin page with thresholds and recipient groups.\n• Prepare cut-over plan to disable overlapping notifications in PQMS."