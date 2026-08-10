# Taste File

## Communication
- Gives terse, directive feature requests (e.g. "add Actions for docker compose down", "user can add folder from git by 'git clone ....'") and expects the assistant to infer implementation details. Confidence: 0.85

## Tooling
- Prefers bun over npm for running scripts and building projects. Confidence: 0.9

## UI Patterns
- Prefers tables with pagination (e.g. 10 rows per page) and action buttons (delete, etc.) right-aligned in the last column. Favors inline row actions over separate standalone cards/forms for row-specific operations like delete. Confidence: 0.85
- Wants visual loading indicators (e.g. progress bars) when navigating between pages for perceived responsiveness. Confidence: 0.8
- Expects data tables to have search/filter inputs (e.g. search by port in UFW rules) that reset pagination to page 1 on change. Confidence: 0.8
