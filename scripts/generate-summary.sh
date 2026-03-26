#!/bin/bash
set -euo pipefail

ENTRIES_FILE="/home/ubuntu/zentrix-improvements-dashboard/data/entries.json"
OUTPUT_FILE="/home/ubuntu/zentrix-improvements-dashboard/data/summary.json"

# Filter entries from the last 24 hours and format as compact text
FORMATTED=$(python3 -c "
import json, sys
from datetime import datetime, timedelta, timezone

EST = timezone(timedelta(hours=-5))
now = datetime.now(EST)
cutoff = now - timedelta(hours=24)

with open('$ENTRIES_FILE') as f:
    entries = json.load(f)

recent = []
for e in entries:
    try:
        entry_dt = datetime.strptime(e['date'] + ' ' + e['time'], '%Y-%m-%d %H:%M').replace(tzinfo=EST)
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
You are summarizing AI-driven improvements made to Zentrix products in the last 24 hours.

Here are the changes, in order:
$FORMATTED

Write a concise summary ranked by importance. Group by theme (e.g. "Bug Fixes", "UX Improvements", "Build Errors", "Code Quality"). Use plain English. No markdown headers, no bullet dashes — use numbered lists within each group. Max 300 words. Start directly with the content, no preamble.
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
