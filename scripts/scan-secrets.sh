#!/bin/sh
# Procura credenciais em todo o histórico Git (todas as branches) antes de publicar o repositório.
# Uso: sh scripts/scan-secrets.sh   — sem saída de "ENCONTRADO" significa que nada foi detectado.
set -e
echo "Commits analisados: $(git rev-list --all | wc -l)"
if git log --all --name-only --pretty=format: | sort -u | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$'; then
  echo "ENCONTRADO: arquivo .env versionado em algum commit (acima)."
fi
if git log --all -p --no-color | grep -nE 'gsk_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|sb_secret_[A-Za-z0-9_-]{10,}|eyJhbGciOi[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}|(PLUGGY_CLIENT_SECRET|GROQ_API_KEY|GEMINI_API_KEY|SUPABASE_SECRET_KEY|BRAPI_API_KEY)[[:space:]]*=[[:space:]]*[A-Za-z0-9_-]{8,}' | grep -vE '_\.\.\.|=[[:space:]]*<'; then
  echo "ENCONTRADO: possível credencial no histórico (acima)."
fi
echo "Varredura concluída."
