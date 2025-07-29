# ⚡ Quick Start - MediVoice AI

## 🎯 Objetivo
Desplegar MediVoice AI en AWS en **menos de 15 minutos**.

---

## ✅ Checklist Previo

- [ ] Cuenta de AWS creada
- [ ] Node.js 18+ instalado
- [ ] Git instalado
- [ ] 15 minutos disponibles

---

## 🚀 Pasos Rápidos

### 1. Descargar el proyecto
```bash
git clone [repository-url]
cd MediVoiceAI_v1_0
```

### 2. Configuración automática
```bash
chmod +x scripts/make-executable.sh
./scripts/make-executable.sh
./scripts/setup.sh
```

### 3. Configurar AWS
```bash
# Instalar AWS CLI si no lo tienes
# Windows: https://awscli.amazonaws.com/AWSCLIV2.msi
# macOS: brew install awscli
# Linux: sudo apt install awscli

# Configurar credenciales
aws configure
```

### 4. Editar configuración mínima
```bash
nano infra/terraform.tfvars
```

**Cambiar solo esto:**
```hcl
cognito_domain_prefix = "medivoice-tu-nombre-unico"
```

### 5. Deploy automático
```bash
./scripts/deploy.sh
```
⏰ **Tiempo estimado**: 8-12 minutos

### 6. Habilitar Claude 3 en AWS
Mientras el deploy corre:
1. Ve a: https://console.aws.amazon.com/bedrock/
2. Región: **us-east-1**
3. "Model access" → "Manage model access"
4. Habilitar **Claude 3 Sonnet**
5. Submit request

### 7. Crear usuario de prueba
```bash
# Después del deploy exitoso
aws cognito-idp admin-create-user \
  --user-pool-id [USER_POOL_ID] \
  --username doctor@test.com \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

### 8. Iniciar aplicación
```bash
cd frontend
npm run dev
```

🎉 **¡Listo!** Ve a: http://localhost:5173

---

## 🧪 Prueba Rápida

1. **Login**: `doctor@test.com` / `TempPass123!`
2. **Cambiar contraseña** cuando te lo pida
3. **Ir a "Grabación"**
4. **Grabar audio de prueba** (di algo médico)
5. **Procesar audio** y ver transcripción
6. **Ver análisis de IA** generado
7. **Generar PDF** de receta médica

---

## 🆘 Problemas Comunes

### Error: "Command not found"
```bash
# Asegúrate de que los scripts sean ejecutables
chmod +x scripts/*.sh
```

### Error: "Access denied" en AWS
```bash
# Verificar configuración
aws sts get-caller-identity
```

### Error: "Domain already exists" en Cognito
```bash
# Cambiar el domain prefix en terraform.tfvars
cognito_domain_prefix = "medivoice-tu-nombre-diferente"
```

### Error: "Claude 3 access denied"
- Ve a consola de Bedrock
- Habilita modelo Claude 3 Sonnet
- Espera aprobación (puede tardar minutos u horas)

---

## 🧹 Limpiar Todo (Opcional)

```bash
./scripts/destroy.sh
```
⚠️ **Peligro**: Elimina TODOS los recursos de AWS

---

## 📞 Ayuda

- 📋 [Manual Completo](MANUAL_DEPLOY.md)
- 🐛 [Troubleshooting](TROUBLESHOOTING.md)
- 📧 Email: soporte@medivoice.ai

---

**¡En menos de 15 minutos tendrás un sistema médico con IA funcionando!** 🎉 