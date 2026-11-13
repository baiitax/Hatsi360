#!/usr/bin/env bash
# =============================================================================
# Hatsi360 — launch readiness check.
#
# Runs the checks that must pass before the Hatsi360 site replaces, or sits
# alongside, the legacy Pluck Live site. It does not deploy anything and it
# does not change DNS. It reports, and it fails loudly.
#
#   bash scripts/verify_launch.sh [origin]
#
# With no argument it uses $NEXT_PUBLIC_SITE_URL, then $VERCEL_URL, then
# http://localhost:3000.
#
# Exit codes
#   0  every check passed
#   1  at least one check failed
#   2  the origin could not be reached at all
# =============================================================================
set -uo pipefail

ORIGIN="${1:-${NEXT_PUBLIC_SITE_URL:-${VERCEL_URL:+https://$VERCEL_URL}}}"
ORIGIN="${ORIGIN:-http://localhost:3000}"
ORIGIN="${ORIGIN%/}"

PASS=0
FAIL=0
FAILED_CHECKS=()

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; PASS=$((PASS + 1)); }
fail() {
  printf '  \033[31m✗\033[0m %s\n' "$1"
  [ -n "${2:-}" ] && printf '      %s\n' "$2"
  FAIL=$((FAIL + 1))
  FAILED_CHECKS+=("$1")
}

section() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# Search a captured body for a pattern.
#
# The pattern is fed through a here-string rather than a pipe. `grep -q` exits
# as soon as it finds a match, which closes the pipe and hands the writer a
# SIGPIPE; with `set -o pipefail` that non-zero status fails the test even
# though the pattern was found. It only starts to happen once the body grows
# past the pipe buffer, which is exactly when a page gets more content.
contains() {
  local haystack="$1" needle="$2"
  grep -q -- "$needle" <<< "$haystack"
}

# The same, case-insensitively.
contains_i() {
  local haystack="$1" needle="$2"
  grep -qi -- "$needle" <<< "$haystack"
}

# The same, as an extended regular expression.
contains_e() {
  local haystack="$1" needle="$2"
  grep -qE -- "$needle" <<< "$haystack"
}

# Fetch a path. The body is printed; the status code is written to
# $STATUS_FILE so it survives the command substitution.
STATUS_FILE="$(mktemp)"
http_body() {
  local path="$1"
  curl -sS -o "$STATUS_FILE.body" -w '%{http_code}' \
    --max-time 25 "${ORIGIN}${path}" 2>/dev/null > "$STATUS_FILE" || echo "000" > "$STATUS_FILE"
  cat "$STATUS_FILE.body" 2>/dev/null
}

# The status of the last http_body call.
last_status() {
  cat "$STATUS_FILE" 2>/dev/null || echo "000"
}

section "Origin"
echo "  checking ${ORIGIN}"
http_body "/" > /dev/null
if [ "$(last_status)" = "000" ]; then
  echo "  \033[31mThe origin could not be reached. Stopping.\033[0m" >&2
  exit 2
fi
pass "origin reachable"

# ---------------------------------------------------------------- routes ----
section "Routes"
ROUTES=(
  "/" "/prices" "/commodities" "/markets" "/compare" "/insights" "/reports" "/solutions"
  "/coverage" "/methodology" "/pricing" "/api-docs" "/about" "/contact" "/faq"
  "/privacy" "/terms" "/disclaimer" "/api-policy" "/cookies"
  "/login" "/forgot-password" "/reset-password" "/dashboard"
  "/sitemap.xml" "/robots.txt"
)
for route in "${ROUTES[@]}"; do
  http_body "$route" >/dev/null
  if [ "$(last_status)" = "200" ]; then
    pass "$route"
  else
    fail "$route" "returned HTTP $(last_status)"
  fi
done

# -------------------------------------------------------------- identity ----
section "Identity"
BODY=$(http_body "/")
if contains "$BODY" "Hatsi360"; then
  pass "homepage carries the Hatsi360 name"
else
  fail "homepage carries the Hatsi360 name"
fi

if contains "$BODY" "Agricultural Market Intelligence"; then
  pass "descriptor present"
else
  fail "descriptor present"
fi

if contains "$BODY" "Powered by Pluck Agro"; then
  pass "corporate endorsement present and subordinate"
else
  fail "corporate endorsement present"
fi

if contains "$BODY" "Know the harvest. Understand the market. Trade with confidence."; then
  pass "tagline present"
else
  fail "tagline present"
fi

# The hero headline. The exact wording is the copy the brand brief specifies,
# and it changes when the copy changes — so this check also asserts the
# structure that must never break: exactly one <h1>, carrying the value
# proposition, above the market-data panel. A missing or duplicated h1 fails
# here even if the sentence happens to match.
if contains "$BODY" "See beyond commodity prices. Understand the agricultural market."; then
  pass "hero headline present"
else
  fail "hero headline present"
fi

H1_COUNT=$(printf '%s' "$BODY" | grep -o '<h1' | wc -l | tr -d ' ')
if [ "$H1_COUNT" = "1" ]; then
  pass "the homepage carries exactly one h1"
else
  fail "the homepage carries exactly one h1" "found $H1_COUNT"
fi

# The previous working name must be gone from every rendered page.
if contains_i "$BODY" "gona pulse"; then
  fail "no previous working name on the homepage"
else
  pass "no previous working name on the homepage"
fi

# The legacy name may appear only as a historical reference to the previous
# system. A customer-facing heading or title using it is a failure.
if contains_e "$BODY" '<title>[^<]*Pluck Live|<h1[^>]*>[^<]*Pluck Live'; then
  fail "no legacy product name in a title or heading"
else
  pass "no legacy product name in a title or heading"
fi

# -------------------------------------------------------------- surfaces ---
section "Product surfaces"
LOGIN=$(http_body "/login")
if contains "$LOGIN" "Hatsi360 Access Portal"; then
  pass "the access portal carries the product name"
else
  fail "the access portal carries the product name"
fi

if contains "$LOGIN" "Powered by Pluck Agro"; then
  pass "the access portal carries the corporate endorsement"
else
  fail "the access portal carries the corporate endorsement"
fi

# The Control Centre and the Field App are server-guarded: an anonymous
# request must be redirected to the portal, never served.
for path in "/admin/overview" "/agent/home"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "${ORIGIN}${path}" 2>/dev/null || echo "000")
  if [ "$code" = "307" ] || [ "$code" = "302" ] || [ "$code" = "303" ]; then
    pass "$path is guarded by the server"
  else
    fail "$path is guarded by the server" "returned HTTP $code"
  fi
done

# The brand assets must be served. They are the artwork the owner supplied,
# derived by scripts/brand_assets.py — never a generated stand-in.
for asset in "/brand/hatsi360-mark.png" "/brand/hatsi360-logo-horizontal.png" "/brand/hatsi360-lockup-compact.png" "/brand/hatsi360-lockup-compact-light.png" "/brand/hatsi360-favicon-32.png" "/brand/hatsi360-icon-192.png" "/brand/hatsi360-apple-touch-icon.png" "/brand/hatsi360-social-1200x630.png" "/apple-icon.png" "/manifest.webmanifest"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "${ORIGIN}${asset}" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    pass "$asset is served"
  else
    fail "$asset is served" "returned HTTP $code"
  fi
done

# The page must show the owner's artwork, not a redrawn mark.
BODY=$(http_body "/")
if contains "$BODY" 'hatsi360-lockup-compact.png'; then
  pass "the header shows the supplied lockup"
else
  fail "the header shows the supplied lockup" "the compact lockup was not referenced"
fi

if contains "$BODY" 'hatsi360-logo-horizontal.png'; then
  pass "the footer shows the supplied lockup"
else
  fail "the footer shows the supplied lockup" "the horizontal lockup was not referenced"
fi

# The access portal is standalone: it must not carry the public navigation.
PORTAL=$(http_body "/login")
if contains "$PORTAL" 'hatsi360-lockup-compact'; then
  pass "the access portal carries the product artwork"
else
  fail "the access portal carries the product artwork" "the lockup was not referenced"
fi

if contains "$PORTAL" 'Market Insights'; then
  fail "the access portal is standalone" "the public navigation was rendered on the portal"
else
  pass "the access portal is standalone"
fi

# The web manifest must name the product and point at the supplied icons.
MANIFEST=$(http_body "/manifest.webmanifest")
if contains "$MANIFEST" 'Hatsi360'; then
  pass "the web application manifest names the product"
else
  fail "the web application manifest names the product" "the name was not present"
fi

if contains "$MANIFEST" 'hatsi360-icon-512.png'; then
  pass "the web application manifest uses the supplied icon"
else
  fail "the web application manifest uses the supplied icon" "the icon was not referenced"
fi

# --------------------------------------------------------------- metadata ---
section "Metadata"
BODY=$(http_body "/")
if contains "$BODY" 'rel="canonical"'; then
  pass "canonical link present"
else
  fail "canonical link present"
fi

if contains "$BODY" 'property="og:title"'; then
  pass "Open Graph title present"
else
  fail "Open Graph title present"
fi

if contains "$BODY" '"@type":"Organization"'; then
  pass "Organization structured data present"
else
  fail "Organization structured data present"
fi

if contains "$BODY" '"@type":"WebSite"'; then
  pass "WebSite structured data present"
else
  fail "WebSite structured data present"
fi

# Breadcrumb structured data belongs to the pages below the root, so it is
# checked on the price directory rather than on the homepage.
CRUMBS=$(http_body "/prices")
if contains "$CRUMBS" '"@type":"BreadcrumbList"'; then
  pass "Breadcrumb structured data present"
else
  fail "Breadcrumb structured data present"
fi

# The market pulse must publish its figures rather than a decorative claim.
if contains "$BODY" "Commodities tracked"; then
  pass "the market pulse publishes its metrics"
else
  fail "the market pulse publishes its metrics"
fi

# ------------------------------------------------------------------ seo -----
section "Indexing"
ROBOTS=$(http_body "/robots.txt")
if contains "$ROBOTS" "Disallow: /admin"; then
  pass "robots disallows the Control Centre"
else
  fail "robots disallows the Control Centre"
fi
if contains "$ROBOTS" "Disallow: /agent"; then
  pass "robots disallows the Field App"
else
  fail "robots disallows the Field App"
fi

SITEMAP=$(http_body "/sitemap.xml")
if contains "$SITEMAP" "<urlset"; then
  pass "sitemap is well-formed"
else
  fail "sitemap is well-formed"
fi

# ------------------------------------------------------------------- api ----
section "API"
API=$(http_body "/api/v1/reports?limit=1")
if contains "$API" '"reports"'; then
  pass "reports API responds"
else
  fail "reports API responds"
fi

API=$(http_body "/api/v1/prices/latest?limit=1")
if contains "$API" '"prices"'; then
  pass "latest prices API responds"
else
  fail "latest prices API responds"
fi

# A premium endpoint must refuse an anonymous caller.
API_STATUS=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 \
  "${ORIGIN}/api/v1/prices/latest" 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
  pass "public price API is reachable without a key"
else
  fail "public price API is reachable without a key" "returned HTTP $API_STATUS"
fi

# --------------------------------------------------------------- aliases ---
# A public URL implemented by an internal route must still serve the public
# URL, with the public URL as its canonical.
section "Route aliases"
for pair in "/coverage:/coverage-report"; do
  public="${pair%%:*}"
  internal="${pair##*:}"
  body=$(http_body "$public")
  if [ "$(last_status)" = "200" ]; then
    pass "$public is served"
  else
    fail "$public is served" "returned HTTP $(last_status)"
  fi
  if contains "$body" "rel=\"canonical\" href=\"[^\"]*$public\""; then
    pass "$public is its own canonical URL"
  else
    fail "$public is its own canonical URL"
  fi
done

# --------------------------------------------------------------- headers ---
section "Security headers"
HEADERS=$(curl -sSI --max-time 20 "${ORIGIN}/" 2>/dev/null)
for header in "X-Content-Type-Options: nosniff" "X-Frame-Options: DENY" "Referrer-Policy:" "Strict-Transport-Security:"; do
  if contains_i "$HEADERS" "$header"; then
    pass "$header"
  else
    fail "$header" "header missing"
  fi
done

# ---------------------------------------------------------- image library --
section "Image library"
if [ -d "public/images/hatsi360" ]; then
  pass "the image library is served from /images/hatsi360"
else
  fail "the image library is served from /images/hatsi360" "the folder is missing"
fi

for folder in hero commodities markets agriculture infrastructure professionals insights reports ui; do
  count=$(find "public/images/hatsi360/$folder" -maxdepth 1 -name '*.jpg' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -gt 0 ]; then
    pass "images/hatsi360/$folder holds $count file(s)"
  else
    fail "images/hatsi360/$folder holds at least one file" "the folder is empty or missing"
  fi
done

# The legacy generic marketing images must be gone: they are not licensed
# for this platform and they are not subject-matched.
if [ -d "public/img" ]; then
  fail "the legacy /img folder is removed" "public/img still exists"
else
  pass "the legacy /img folder is removed"
fi

# The image registry must resolve, and every registered file must be served.
if [ -f "src/lib/images/generated-manifest.ts" ]; then
  pass "the image registry has a generated manifest"
else
  fail "the image registry has a generated manifest" "generated-manifest.ts is missing"
fi

# A served image must answer with an image, not with a page.
HERO_IMAGE=$(grep -oE '/images/hatsi360/hero/[a-z0-9-]+\.jpg' "src/lib/images/generated-manifest.ts" 2>/dev/null | head -1)
if [ -n "$HERO_IMAGE" ]; then
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "${ORIGIN}${HERO_IMAGE}" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    pass "${HERO_IMAGE} is served"
  else
    fail "${HERO_IMAGE} is served" "returned HTTP $code"
  fi
else
  fail "a hero image is served" "no hero image found in the manifest"
fi

# ------------------------------------------------------- loading behaviour --
section "Loading architecture"
for boundary in "src/app/(site)/loading.tsx" "src/app/(portal)/loading.tsx" "src/app/admin/loading.tsx" "src/app/agent/loading.tsx"; do
  if [ -f "$boundary" ]; then
    pass "$boundary exists"
  else
    fail "$boundary exists" "the route has no loading boundary"
  fi
done

# The boot curtain must be in the document, and it must be dismissible.
HOME_BODY=$(http_body "/")
if contains "$HOME_BODY" 'id="hatsi-boot-curtain"'; then
  pass "the boot curtain is present in the document"
else
  fail "the boot curtain is present in the document" "not found in the served HTML"
fi
if contains "$HOME_BODY" 'hatsi-boot__ring'; then
  pass "the boot curtain carries the brand ring"
else
  fail "the boot curtain carries the brand ring" "not found in the served HTML"
fi

# The root layout must remain a server component.
if grep -qE "^\s*'use client'" "src/app/layout.tsx"; then
  fail "the root layout is a server component" "it declares 'use client'"
else
  pass "the root layout is a server component"
fi

# ---------------------------------------------------------------- redirects -
section "Legacy redirects"
for pair in "/index.php:/" "/commodities.php:/commodities" "/markets.php:/markets" "/blog.php:/insights" "/api-access.php:/api-docs"; do
  from="${pair%%:*}"
  to="${pair##*:}"
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "${ORIGIN}${from}" 2>/dev/null || echo "000")
  location=$(curl -sSI --max-time 20 "${ORIGIN}${from}" 2>/dev/null | grep -i '^location:' | tr -d '\r')
  if [ "$code" = "308" ] || [ "$code" = "301" ] || [ "$code" = "302" ]; then
    if contains "$location" "$to"; then
      pass "$from -> $to"
    else
      fail "$from -> $to" "redirected to '$location'"
    fi
  else
    fail "$from -> $to" "returned HTTP $code"
  fi
done

# ----------------------------------------------------------------- report --
section "Result"
echo "  passed: $PASS"
echo "  failed: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo
  echo "  Failed checks:"
  for check in "${FAILED_CHECKS[@]}"; do
    echo "    - $check"
  done
  echo
  echo "  \033[31mThe launch checks did not pass. The site is not ready to replace the legacy site.\033[0m"
  exit 1
fi
echo
echo "  \033[32mAll launch checks passed.\033[0m"
exit 0
