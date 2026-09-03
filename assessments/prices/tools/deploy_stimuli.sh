#!/usr/bin/env bash
# Deploy the (gitignored) prices-task stimulus images to a private-by-obscurity
# Netlify site. Same pattern as assessments/fname-pairs/tools/deploy_stimuli.sh.
#
# Reads tools/netlify.local.env (gitignored) for the site name and secret path,
# stages the THINGS / THINGSplus-CC0 / MultiPic image folders under the secret
# path with CORS + noindex headers, and deploys. The resulting base URL is:
#   https://$NETLIFY_SITE_NAME.netlify.app/$SECRET_PATH/
# Pages then load e.g. $BASE/things_best/battery_05n.jpg via the
# stimuli_base_url query parameter.
#
# Usage: ./deploy_stimuli.sh   (run from anywhere; requires `netlify login` done)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/netlify.local.env"
# Image sources; currently the stimulus-audit staging area in temp/.
SRC_DIRS=("$REPO_ROOT/temp/things_best" "$REPO_ROOT/temp/things_cc0" "$REPO_ROOT/temp/multipic" "$REPO_ROOT/assessments/prices/assets/prices/images")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE (see repo README, FNAME-Pairs section for the pattern)" >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

n_imgs=0
for d in "${SRC_DIRS[@]}"; do
  if [[ ! -d "$d" ]]; then
    echo "Missing image dir: $d" >&2
    exit 1
  fi
  n=$(find "$d" -type f \( -name '*.jpg' -o -name '*.png' \) | wc -l | tr -d ' ')
  n_imgs=$((n_imgs + n))
done
if [[ "$n_imgs" -eq 0 ]]; then
  echo "No images found in: ${SRC_DIRS[*]}" >&2
  exit 1
fi

STAGE_DIR=$(mktemp -d)
trap 'rm -rf "$STAGE_DIR"' EXIT
mkdir -p "$STAGE_DIR/$SECRET_PATH"
for d in "${SRC_DIRS[@]}"; do
  cp -R "$d" "$STAGE_DIR/$SECRET_PATH/$(basename "$d")"
done

# Root: nothing to see; discourage indexing everywhere.
printf 'User-agent: *\nDisallow: /\n' > "$STAGE_DIR/robots.txt"
printf '<!doctype html><title>-</title>' > "$STAGE_DIR/index.html"
cat > "$STAGE_DIR/_headers" <<HEADERS
/*
  X-Robots-Tag: noindex

/$SECRET_PATH/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=31536000, immutable
HEADERS

# Create the site if it doesn't exist yet, then deploy.
if ! netlify api getSite --data "{\"site_id\": \"$NETLIFY_SITE_NAME.netlify.app\"}" >/dev/null 2>&1; then
  echo "Creating site $NETLIFY_SITE_NAME..."
  netlify sites:create --name "$NETLIFY_SITE_NAME" --account-slug "$NETLIFY_ACCOUNT_SLUG" >/dev/null
fi

netlify deploy --prod --no-build \
  --site "$NETLIFY_SITE_NAME" \
  --dir "$STAGE_DIR" \
  --message "prices stimuli ($n_imgs images)"

echo
echo "stimuli_base_url: https://$NETLIFY_SITE_NAME.netlify.app/$SECRET_PATH/"
