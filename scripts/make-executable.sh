#!/bin/bash

# Script para hacer todos los scripts ejecutables
# Útil después de clonar el repositorio o en Windows

echo "🔧 Haciendo scripts ejecutables..."

# Hacer todos los scripts ejecutables
chmod +x scripts/*.sh

# Verificar que se aplicaron los permisos
if [ -x scripts/deploy.sh ] && [ -x scripts/setup.sh ] && [ -x scripts/destroy.sh ]; then
    echo "✅ Todos los scripts son ahora ejecutables"
    echo ""
    echo "Scripts disponibles:"
    echo "• ./scripts/setup.sh    - Configuración inicial"
    echo "• ./scripts/deploy.sh   - Deploy completo"
    echo "• ./scripts/destroy.sh  - Limpiar recursos"
    echo ""
else
    echo "❌ Error: No se pudieron hacer ejecutables todos los scripts"
    exit 1
fi

echo "🎉 ¡Listo! Puedes ejecutar los scripts ahora." 