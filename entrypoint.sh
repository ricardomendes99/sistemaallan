#!/bin/sh
set -e

# Inject runtime Supabase credentials into config.js
# Remove /rest/v1 suffix if present (JS client precisa só da URL base)
SUPABASE_BASE_URL=$(echo "${VITE_SUPABASE_URL}" | sed 's|/rest/v1||g')

cat > /usr/share/nginx/html/assets/js/config.js << EOF
window.SUPABASE_URL = '${SUPABASE_BASE_URL}';
window.SUPABASE_ANON_KEY = '${VITE_SUPABASE_ANON_KEY}';
EOF

exec nginx -g 'daemon off;'
