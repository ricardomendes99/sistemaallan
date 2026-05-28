#!/bin/sh
set -e

# Inject runtime Supabase credentials into config.js
# Remove /rest/v1 suffix if present (JS client precisa só da URL base)
SUPABASE_BASE_URL=$(echo "${VITE_SUPABASE_URL}" | sed 's|/rest/v1||g')

cat > /usr/share/nginx/html/assets/js/config.js << EOF
window.SUPABASE_URL = '${SUPABASE_BASE_URL}';
window.SUPABASE_ANON_KEY = '${VITE_SUPABASE_ANON_KEY}';
window.ASSINAFY_ACCOUNT_ID = '10302ff66221619276ec2c0953ce';
EOF

# Write Assinafy API key as nginx proxy header snippet (key never reaches the browser)
mkdir -p /etc/nginx/snippets
printf 'proxy_set_header X-Api-Key "%s";\n' "${ASSINAFY_API_KEY:-}" \
  > /etc/nginx/snippets/assinafy_key.conf

exec nginx -g 'daemon off;'
