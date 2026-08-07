#!/usr/bin/env bash
# Raidex API smoke test — runs a series of checks against a running server.
# Usage:  ./smoke_test.sh [base_url]   (defaults to http://localhost:8787)
set -u
BASE="${1:-http://localhost:8787}"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  PASS  $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL  $1"; }
check(){ # desc  expected_status  actual_status
  if [ "$2" = "$3" ]; then ok "$1 (${3})"; else bad "$1 (expected ${2}, got ${3})"; fi
}

echo "=== Raidex API smoke test @ $BASE ==="

# --- Content library ---
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/meta");  check "GET /api/meta" 200 "$S"
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/items"); check "GET /api/items" 200 "$S"
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/quests"); check "GET /api/quests" 200 "$S"
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/barter"); check "GET /api/barter" 200 "$S"
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/ratings"); check "GET /api/ratings" 200 "$S"

# count checks
ITEMS=$(curl -s "$BASE/api/meta" | python3 -c "import sys,json;print(json.load(sys.stdin)['items'])")
[ "$ITEMS" = "194" ] && ok "item count = 194" || bad "item count = $ITEMS (expected 194)"

# icon served
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/icons/arc-alloy.png"); check "GET item icon" 200 "$S"

# --- Profiles ---
NAME="SmokeTest_$(date +%s)"
PID=$(curl -s -X POST "$BASE/api/profiles" -H 'Content-Type: application/json' -d "{\"name\":\"$NAME\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
[ -n "$PID" ] && ok "created profile $PID" || bad "profile create returned no id"
S=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/profiles/$PID"); check "GET profile" 200 "$S"

# update profile (inventory + stash level)
S=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/profiles/$PID" \
  -H 'Content-Type: application/json' \
  -d '{"inventory":[{"slug":"metal-parts","name":"Metal Parts","qty":5}],"stashLevel":4}')
check "PUT profile" 200 "$S"

# --- Barter flow ---
# create a trade
TID=$(curl -s -X POST "$BASE/api/barter" -H 'Content-Type: application/json' \
  -d "{\"profileId\":\"$PID\",\"profileName\":\"$NAME\",\"offer\":[{\"slug\":\"battery\",\"name\":\"Battery\",\"qty\":2}],\"want\":[{\"slug\":\"wires\",\"name\":\"Wires\",\"qty\":1}],\"note\":\"smoke test\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
[ -n "$TID" ] && ok "posted trade $TID" || bad "trade create failed"

# cannot claim own trade
E=$(curl -s -X POST "$BASE/api/barter/$TID/claim" -H 'Content-Type: application/json' -d "{\"profileId\":\"$PID\",\"profileName\":\"$NAME\"}" | python3 -c "import sys,json;print(json.load(sys.stdin).get('error',''))")
[ -n "$E" ] && ok "self-claim blocked" || bad "self-claim was NOT blocked"

# another user claims it
P2=$(curl -s -X POST "$BASE/api/profiles" -H 'Content-Type: application/json' -d '{"name":"SmokeTaker"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
S=$(curl -s -X POST "$BASE/api/barter/$TID/claim" -H 'Content-Type: application/json' -d "{\"profileId\":\"$P2\",\"profileName\":\"SmokeTaker\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])")
[ "$S" = "claimed" ] && ok "claim works" || bad "claim failed (got $S)"

# claim again should fail
E=$(curl -s -X POST "$BASE/api/barter/$TID/claim" -H 'Content-Type: application/json' -d "{\"profileId\":\"$P2\",\"profileName\":\"SmokeTaker\"}" | python3 -c "import sys,json;print(json.load(sys.stdin).get('error',''))")
[ -n "$E" ] && ok "double-claim blocked" || bad "double-claim NOT blocked"

# release
S=$(curl -s -X POST "$BASE/api/barter/$TID/unclaim" -H 'Content-Type: application/json' -d "{\"profileId\":\"$P2\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])")
[ "$S" = "open" ] && ok "release works" || bad "release failed"

# --- Ratings ---
S=$(curl -s -X POST "$BASE/api/ratings/seed-a" -H 'Content-Type: application/json' -d "{\"voterId\":\"$PID\",\"value\":1}" | python3 -c "import sys,json;print(json.load(sys.stdin)['score'])")
[ "$S" = "1" ] && ok "upvote works" || bad "upvote failed"
E=$(curl -s -X POST "$BASE/api/ratings/$PID" -H 'Content-Type: application/json' -d "{\"voterId\":\"$PID\",\"value\":1}" | python3 -c "import sys,json;print(json.load(sys.stdin).get('error',''))")
[ -n "$E" ] && ok "self-vote blocked" || bad "self-vote NOT blocked"

echo ""
echo "=== RESULT: $PASS passed, $FAIL failed ==="
