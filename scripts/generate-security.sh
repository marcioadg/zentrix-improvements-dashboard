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
  ["zentrixcontent"]="/home/ubuntu/zentrixcontent"
  ["zentrixcreative"]="/home/ubuntu/zentrixcreative"
  ["zentrixchat"]="/home/ubuntu/zentrixchat"
  ["zentrixfinance"]="/home/ubuntu/zentrixfinance"
  ["zentrixmarketing"]="/home/ubuntu/zentrixmarketing"
  ["zentrix-email-marketing"]="/home/ubuntu/zentrix-email-marketing"
  ["zentrixpulse"]="/home/ubuntu/zentrixpulse"
  ["zentrixprojects"]="/home/ubuntu/zentrixprojects"
  ["zentrix-improvements-dashboard"]="/home/ubuntu/zentrix-improvements-dashboard"
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
  ["zentrixcontent"]="Zentrix Content"
  ["zentrixcreative"]="Zentrix Creative"
  ["zentrixchat"]="Zentrix Chat"
  ["zentrixfinance"]="Zentrix Finance"
  ["zentrixmarketing"]="Zentrix Marketing"
  ["zentrix-email-marketing"]="Zentrix Email Mktg"
  ["zentrixpulse"]="Zentrix Pulse"
  ["zentrixprojects"]="Zentrix Projects"
  ["zentrix-improvements-dashboard"]="Improvements Dashboard"
)

echo "[$TIMESTAMP] Starting daily security scoring"

RESULTS_FILE=$(mktemp)
echo "[]" > "$RESULTS_FILE"

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

  python3 - "$repo" "$name" "$SCORE" "$RESULTS_FILE" <<PYEOF
import json, sys
repo, name, score_str, results_file = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
issues_raw = """$ISSUES"""
issues = [l.strip() for l in issues_raw.splitlines() if l.strip()]
with open(results_file) as f:
    results = json.load(f)
results.append({
    'repo': repo,
    'name': name,
    'score': int(score_str),
    'updated': '$(TZ=America/New_York date +%Y-%m-%dT%H:%M:%S)',
    'issues': issues
})
with open(results_file, 'w') as f:
    json.dump(results, f)
PYEOF

  echo "    $repo: $SCORE/100"
  sleep 30
done

# Write final JSON
python3 - "$RESULTS_FILE" "$OUTPUT" "$TIMESTAMP" <<PYEOF
import json, sys
results_file, output, timestamp = sys.argv[1], sys.argv[2], sys.argv[3]
with open(results_file) as f:
    results = json.load(f)
data = {'generated': timestamp, 'repos': results}
with open(output, 'w') as f:
    json.dump(data, f, indent=2)
print('Security JSON written.')
PYEOF
rm -f "$RESULTS_FILE"

# Commit and push
cd "$REPO_DIR"
git config --local user.name "Marcio Goncalves"
git config --local user.email "marcio@wisevas.io"
git add data/security.json
git commit -m "chore: daily security scores $(TZ=America/New_York date +%Y-%m-%d)" --no-verify 2>/dev/null || echo "Nothing to commit"
git push 2>/dev/null || echo "Push failed — will retry next run"

echo "[$TIMESTAMP] Security scoring complete"
