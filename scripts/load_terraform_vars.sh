#!/bin/bash

# Script para cargar variables de terraform.tfvars
# y convertirlas en variables de entorno

# Verificar que el archivo terraform.tfvars existe
if [ ! -f "infra/terraform.tfvars" ]; then
    echo "Error: infra/terraform.tfvars no encontrado"
    exit 1
fi

# Leer variables de terraform.tfvars y exportarlas
while IFS= read -r line; do
    # Ignorar líneas vacías y comentarios
    if [[ ! "$line" =~ ^[[:space:]]*$ ]] && [[ ! "$line" =~ ^[[:space:]]*# ]]; then
        # Extraer nombre y valor de la variable
        if [[ "$line" =~ ^[[:space:]]*([^[:space:]]+)[[:space:]]*=[[:space:]]*\"?([^\"]*)\"?[[:space:]]*$ ]]; then
            var_name="${BASH_REMATCH[1]}"
            var_value="${BASH_REMATCH[2]}"
            
            # Convertir nombre de variable a formato de entorno
            env_var_name=$(echo "$var_name" | tr '[:lower:]' '[:upper:]')
            
            # Exportar variable
            export "$env_var_name"="$var_value"
            
            echo "Cargada variable: $env_var_name=$var_value"
        fi
    fi
done < "infra/terraform.tfvars"

echo "Variables de Terraform cargadas como variables de entorno" 