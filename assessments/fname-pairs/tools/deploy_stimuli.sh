#!/usr/bin/env bash
# Deploy the (gitignored) CFD face images to a private-by-obscurity Netlify site.
#
# Reads tools/netlify.local.env (gitignored) for the site name and secret path,
# stages images under the secret path with CORS + noindex headers, and deploys.
# The resulting stimuli_base_url is:
#   https://$NETLIFY_SITE_NAME.netlify.app/$SECRET_PATH/
#
# Usage: ./deploy_stimuli.sh   (run from anywhere; requires `netlify login` done)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGES_DIR="$SCRIPT_DIR/../assets/fname-pairs/images"
ENV_FILE="$SCRIPT_DIR/netlify.local.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE (see repo README, FNAME-Pairs section)" >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

n_imgs=$(find "$IMAGES_DIR" -name 'CFD-*.jpg' | wc -l | tr -d ' ')
if [[ "$n_imgs" -eq 0 ]]; then
  echo "No images in $IMAGES_DIR — run build_stimuli.py first" >&2
  exit 1
fi

STAGE_DIR=$(mktemp -d)
trap 'rm -rf "$STAGE_DIR"' EXIT
mkdir -p "$STAGE_DIR/$SECRET_PATH"
cp "$IMAGES_DIR"/CFD-*.jpg "$STAGE_DIR/$SECRET_PATH/"

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
  --message "fname-pairs stimuli ($n_imgs images)"

echo
echo "stimuli_base_url: https://$NETLIFY_SITE_NAME.netlify.app/$SECRET_PATH/"
