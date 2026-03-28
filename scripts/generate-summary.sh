#!/bin/bash
set -euo pipefail

ENTRIES_FILE="/home/ubuntu/zentrix-improvements-dashboard/data/entries.json"
OUTPUT_FILE="/home/ubuntu/zentrix-improvements-dashboard/data/summary.json"

# Filter entries from the last 24 hours and format as compact text
FORMATTED=$(python3 -c "
import json, sys
from datetime import datetime, timedelta, timezone
import zoneinfo

UTC_TZ = zoneinfo.ZoneInfo('UTC')
now = datetime.now(UTC_TZ)
cutoff = now - timedelta(hours=24)

with open('$ENTRIES_FILE') as f:
    entries = json.load(f)

recent = []
for e in entries:
    try:
        entry_dt = datetime.strptime(e['date'] + ' ' + e['time'], '%Y-%m-%d %H:%M').replace(tzinfo=UTC_TZ)
        if entry_dt >= cutoff:
            summary = (e.get('summary') or '(no summary)')
            recent.append(f\"[{e.get('repoName', e['repo'])}] [{e['category']}]: {summary}\")
    except (ValueError, KeyError):
        continue

print('\n'.join(recent))
")

if [ -z "$FORMATTED" ]; then
  echo '{"generated": "'$(TZ=America/New_York date -u +%Y-%m-%dT%H:%M:%S%z)'", "summary": "No improvements in the last 24 hours."}' > "$OUTPUT_FILE"
  exit 0
fi

SUMMARY=$(cat <<PROMPT | claude --permission-mode bypassPermissions --print
You are the CTO of Zentrix, writing a daily product update for the founders. They are non-technical — do not use engineering jargon, file names, technical terms, or code references.

Here are the AI-driven improvements made across Zentrix products in the last 24 hours:
$FORMATTED

Write a brief, confident CTO report. Use this structure:

**What We Shipped**
2–4 sentences on the most impactful improvements. Focus on what got better for users or the business — not how it was done.

**What We Fixed**
1–3 sentences on bugs or reliability issues that were resolved. Frame in terms of user experience or risk, not code.

**What to Watch**
1–2 sentences on any patterns, risks, or areas needing attention. Keep it brief and actionable.

Rules:
- Sound like a confident, plain-speaking CTO briefing the CEO
- No bullet points, no numbered lists, no markdown code
- No file names, no component names, no tech stack references
- Max 200 words total
- Bold the section headers
- Start directly with the content — no greeting, no "Here is your report"
PROMPT
)

TIMESTAMP=$(TZ=America/New_York date +%Y-%m-%dT%H:%M:%S%z)

python3 -c "
import json, sys
summary = sys.stdin.read()
obj = {'generated': '$TIMESTAMP', 'summary': summary}
with open('$OUTPUT_FILE', 'w') as f:
    json.dump(obj, f, indent=2)
" <<< "$SUMMARY"

echo "Summary generated at $TIMESTAMP"
