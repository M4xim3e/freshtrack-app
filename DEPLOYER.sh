#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FreshTrack App — Déploiement automatique
# Lance : bash DEPLOYER.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e
cd "$(dirname "$0")"

echo ""
echo "🌿 FreshTrack App — Déploiement automatique"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Prérequis ──────────────────────────────
for cmd in node npm git; do
  command -v $cmd &>/dev/null || { echo "❌ '$cmd' introuvable. Installe Node.js via https://nodejs.org"; exit 1; }
done
if ! command -v gh &>/dev/null; then
  echo "❌ GitHub CLI absent. Lance : brew install gh && gh auth login"
  exit 1
fi
if ! command -v vercel &>/dev/null; then
  echo "📦 Installation de Vercel CLI..."
  npm install -g vercel
fi

echo "✅ Prérequis OK"

# ── npm install ────────────────────────────
echo ""
echo "📦 Installation des dépendances..."
npm install --legacy-peer-deps
echo "✅ Dépendances installées"

# ── Build ──────────────────────────────────
echo ""
echo "🔨 Build Next.js..."
npm run build
echo "✅ Build réussi"

# ── Git ────────────────────────────────────
echo ""
echo "📦 Git..."
[ ! -d ".git" ] && git init && git branch -M main
git add .
git commit -m "feat: FreshTrack SaaS v1 - Next.js 14 + Supabase" 2>/dev/null || echo "  (rien de nouveau à committer)"
echo "✅ Commit OK"

# ── GitHub ─────────────────────────────────
echo ""
echo "🐙 Création du repo GitHub..."
gh repo create freshtrack-app --public --push --source=. 2>/dev/null \
  || { git remote get-url origin &>/dev/null && git push -u origin main || true; }
echo "✅ Code pushé sur GitHub"

# ── Vercel env vars ────────────────────────
echo ""
echo "⚙️  Configuration des variables Vercel..."

add_env() {
  local key=$1 val=$2
  if [[ "$val" != A_REMPLIR* ]]; then
    printf '%s' "$val" | vercel env add "$key" production --yes 2>/dev/null || true
    printf '%s' "$val" | vercel env add "$key" preview    --yes 2>/dev/null || true
    printf '%s' "$val" | vercel env add "$key" development --yes 2>/dev/null || true
    echo "  ✅ $key"
  else
    echo "  ⚠️  $key ignoré (valeur placeholder — à remplir depuis le dashboard Vercel)"
  fi
}

# Lire .env.local
export $(grep -v '^#' .env.local | xargs)

add_env "NEXT_PUBLIC_SUPABASE_URL"      "$NEXT_PUBLIC_SUPABASE_URL"
add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
add_env "SUPABASE_SERVICE_ROLE_KEY"     "$SUPABASE_SERVICE_ROLE_KEY"
add_env "RESEND_API_KEY"                "$RESEND_API_KEY"

# ── Vercel deploy ──────────────────────────
echo ""
echo "🚀 Déploiement sur Vercel..."
vercel --prod --yes
VERCEL_URL=$(vercel ls freshtrack-app --yes 2>/dev/null | grep 'https' | head -1 | awk '{print $2}' || echo "")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FreshTrack App est EN LIGNE !"
echo ""
echo "⚠️  2 étapes sur Supabase (déjà fait par Claude) :"
echo "   → Base de données : tables restaurants, products,"
echo "     alert_logs + RLS configurés ✅"
echo ""
echo "   → Reste à faire : Supabase Dashboard → Auth →"
echo "     URL Configuration → mets l'URL Vercel comme"
echo "     Site URL + Redirect URL (/auth/callback)"
echo ""
if [[ "$SUPABASE_SERVICE_ROLE_KEY" == A_REMPLIR* ]]; then
echo "   → Service Role Key : Supabase Dashboard → Settings"
echo "     → API → Service Role Key → copie dans .env.local"
echo "     puis dans Vercel Dashboard → Settings → Env Vars"
fi
if [[ "$RESEND_API_KEY" == A_REMPLIR* ]]; then
echo "   → Resend API Key : resend.com → API Keys → copie"
echo "     dans .env.local puis Vercel Dashboard → Env Vars"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
