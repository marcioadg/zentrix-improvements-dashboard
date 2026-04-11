#!/bin/bash
# Daily security scoring — generates data/security.json
# Runs daily at 9 AM EST (1 PM UTC)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="/home/ubuntu/zentrix-improvements-dashboard"
OUTPUT="$REPO_DIR/data/security.json"
# Find claude in PATH, fallback to hardcoded location, fail clearly if not found
CLAUDE="$(command -v claude || echo /home/ubuntu/.npm-global/bin/claude)"
if [ ! -x "$CLAUDE" ]; then
  echo "ERROR: claude binary not found in PATH or at $CLAUDE"
  exit 1
fi
TIMESTAMP=$(TZ=America/New_York date +%Y-%m-%dT%H:%M:%S%z)

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

# Verify output directory exists
if [ ! -d "$(dirname "$OUTPUT")" ]; then
  echo "ERROR: output directory $(dirname "$OUTPUT") not found"
  exit 1
fi

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

  # Pre-extract risky patterns so Claude doesn't need to explore the full repo
  SECRETS_SCAN=$(grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env*" -n \
    -e "api_key\s*=" -e "apiKey\s*=" -e "secret\s*=" -e "password\s*=" \
    -e "API_KEY\s*=" -e "AUTH_TOKEN\s*=" -e "\"sk-" -e "'sk-" -e "pk_live" -e "rk_live" \
    -e "PRIVATE_KEY\s*=" -e "CLIENT_SECRET\s*=" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=build \
    "$path" 2>/dev/null | head -50 || echo "(none found)")

  ROUTES_SCAN=$(grep -r --include="*.ts" --include="*.tsx" --include="*.js" -n \
    -e "app\.get\b" -e "app\.post\b" -e "app\.put\b" -e "app\.delete\b" \
    -e "router\.get\b" -e "router\.post\b" -e "router\.put\b" -e "router\.delete\b" \
    -e "export.*GET\b" -e "export.*POST\b" -e "export.*PUT\b" -e "export.*DELETE\b" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist \
    "$path" 2>/dev/null | head -30 || echo "(none found)")

  PACKAGE_JSON=$(cat "$path/package.json" 2>/dev/null | head -80 || echo "(no package.json)")

  ENV_IN_GIT=$(git -C "$path" ls-files 2>/dev/null | grep -E "\.env$|\.env\.local$|\.env\.production$|\.env\.staging$" || echo "(none)")

  OUTPUT_RAW=$(timeout 300 $CLAUDE --permission-mode bypassPermissions --print "
You are a security auditor. DO NOT explore the filesystem. Score ONLY based on the pre-extracted data below.

## Repo: $repo

## 1. Hardcoded Secrets Scan (grep output — matched patterns in source files):
$SECRETS_SCAN

## 2. API Route Definitions (grep output — route handlers found):
$ROUTES_SCAN

## 3. package.json dependencies:
$PACKAGE_JSON

## 4. .env files tracked in git (should be empty for secure repos):
$ENV_IN_GIT

---

Based ONLY on the above data, give a security score from 0 to 100:
- 90-100: Very secure, minor issues only
- 70-89: Generally solid with some gaps
- 50-69: Moderate risks present
- 30-49: Significant vulnerabilities
- 0-29: Critical issues found

List up to 5 specific security issues found in the data above. Focus on:
1. Any hardcoded secrets or API keys visible in the grep output
2. Routes that appear unprotected (no auth middleware visible)
3. Outdated dependencies with known CVEs (from package.json)
4. .env files committed to git
5. Any other clear risks visible in the provided data

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

  ISSUES_FILE=$(mktemp)
  echo "$ISSUES_JSON" > "$ISSUES_FILE"
  UPDATED=$(TZ=America/New_York date +%Y-%m-%dT%H:%M:%S%z)
  python3 - "$repo" "$name" "$SCORE" "$RESULTS_FILE" "$ISSUES_FILE" "$UPDATED" <<'PYEOF'
import json, sys
repo, name, score_str, results_file, issues_file, updated = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
with open(issues_file) as f:
    issues = json.load(f)
with open(results_file) as f:
    results = json.load(f)
results.append({
    'repo': repo,
    'name': name,
    'score': int(score_str),
    'updated': updated,
    'issues': issues
})
with open(results_file, 'w') as f:
    json.dump(results, f)
PYEOF
  rm -f "$ISSUES_FILE"

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
