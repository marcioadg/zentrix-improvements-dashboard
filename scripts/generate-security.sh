#!/bin/bash
# Daily security scoring — generates data/security.json
# Runs daily at 9 AM EST (1 PM UTC)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="/home/ubuntu/zentrix-improvements-dashboard"
OUTPUT="$REPO_DIR/data/security.json"
CLAUDE="/home/ubuntu/.npm-global/bin/claude"
TIMESTAMP=$(TZ=America/New_York date +%Y-%m-%dT%H:%M:%S)

declare -A REPOS=(
  ["zentrix-insights"]="/home/ubuntu/zentrix-insights"
  ["business-os"]="/home/ubuntu/business-os"
  ["zentrixcrm"]="/home/ubuntu/zentrixcrm"
  ["zentrixmail"]="/home/ubuntu/zentrixmail"
  ["dietforge"]="/home/ubuntu/dietforge"
  ["wisevasdashboard"]="/home/ubuntu/wisevasdashboard"
  ["zentrixcapture"]="/home/ubuntu/zentrixcapture"
  ["lineagevault"]="/home/ubuntu/lineagevault"
  ["thoughtline"]="/home/ubuntu/thoughtline"
  ["zentrix-cyber"]="/home/ubuntu/zentrix-cyber"
  ["zentrix-sign"]="/home/ubuntu/zentrix-sign"
  ["decision-command"]="/home/ubuntu/decision-command"
)

declare -A REPO_NAMES=(
  ["zentrix-insights"]="Zentrix Insights"
  ["business-os"]="Zentrix OS"
  ["zentrixcrm"]="Zentrix CRM"
  ["zentrixmail"]="Zentrix Mail"
  ["dietforge"]="DietForge"
  ["wisevasdashboard"]="WiseVAs"
  ["zentrixcapture"]="Zentrix Capture"
  ["lineagevault"]="Lineage Vault"
  ["thoughtline"]="Thoughtline"
  ["zentrix-cyber"]="Zentrix Cyber"
  ["zentrix-sign"]="Zentrix Sign"
  ["decision-command"]="Decision Command"
)

echo "[$TIMESTAMP] Starting daily security scoring"

RESULTS="[]"

for repo in "${!REPOS[@]}"; do
  path="${REPOS[$repo]}"
  name="${REPO_NAMES[$repo]}"

  if [ ! -d "$path" ]; then
    echo "  Skipping $repo — directory not found"
    continue
  fi

  echo "  Scoring $repo..."

  OUTPUT_RAW=$(cd "$path" && timeout 180 $CLAUDE --permission-mode bypassPermissions --print "
You are running a fast security audit of the $repo repo (read-only, no changes).

Scan for these risks:
1. Hardcoded secrets, API keys, tokens, passwords in source code
2. Missing authentication/authorization checks on sensitive routes
3. SQL injection, XSS, or command injection vulnerabilities
4. Sensitive data exposed in logs, responses, or error messages
5. Outdated dependencies with known CVEs (check package.json/package-lock.json)

Give a security score from 0 to 100:
- 90-100: Very secure, minor issues only
- 70-89: Generally solid with some gaps
- 50-69: Moderate risks present
- 30-49: Significant vulnerabilities
- 0-29: Critical issues found

Output EXACTLY this format (no extra text):
SCORE: [number]
ISSUES:
- [issue 1, one line, max 100 chars]
- [issue 2, one line, max 100 chars]
- [issue 3, one line, max 100 chars]
- [issue 4, one line, max 100 chars]
- [issue 5, one line, max 100 chars]

If fewer than 5 issues, list only what you found. If none, write: - No significant issues found
" 2>/dev/null || echo "SCORE: 50
ISSUES:
- Could not complete scan")

  SCORE=$(echo "$OUTPUT_RAW" | grep "^SCORE:" | head -1 | grep -oP '\d+' | head -1 || echo "50")
  # Clamp 0-100
  SCORE=$(( SCORE < 0 ? 0 : SCORE > 100 ? 100 : SCORE ))

  ISSUES=$(echo "$OUTPUT_RAW" | awk '/^ISSUES:/{found=1;next} found && /^- /{print substr($0,3)}' | head -5)

  # Build JSON for this repo
  ISSUES_JSON=$(echo "$ISSUES" | python3 -c "
import json, sys
lines = [l.strip() for l in sys.stdin.read().splitlines() if l.strip()]
print(json.dumps(lines))
")

  REPO_JSON=$(python3 -c "
import json
obj = {
  'repo': '$repo',
  'name': '$name',
  'score': $SCORE,
  'updated': '$(TZ=America/New_York date +%Y-%m-%dT%H:%M:%S)',
  'issues': $ISSUES_JSON
}
print(json.dumps(obj))
")

  RESULTS=$(python3 -c "
import json, sys
results = json.loads('$RESULTS' if '$RESULTS' != '[]' else '[]')
new_entry = $REPO_JSON
results.append(new_entry)
print(json.dumps(results))
" 2>/dev/null || echo "$RESULTS")

  echo "    $repo: $SCORE/100"
  sleep 30
done

# Write final JSON
python3 -c "
import json
data = {
  'generated': '$TIMESTAMP',
  'repos': $RESULTS
}
with open('$OUTPUT', 'w') as f:
    json.dump(data, f, indent=2)
print('Security JSON written.')
"

# Commit and push
cd "$REPO_DIR"
git config --local user.name "Marcio Goncalves"
git config --local user.email "marcio@wisevas.io"
git add data/security.json
git commit -m "chore: daily security scores $(TZ=America/New_York date +%Y-%m-%d)" --no-verify 2>/dev/null || echo "Nothing to commit"
git push 2>/dev/null || echo "Push failed — will retry next run"

echo "[$TIMESTAMP] Security scoring complete"
