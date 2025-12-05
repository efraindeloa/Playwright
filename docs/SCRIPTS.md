# Scripts de Automatización

Este directorio contiene scripts para automatizar la ejecución de pruebas.

## 📄 Scripts Disponibles

### `test-smtp.js`

Script para probar la configuración SMTP y enviar un email de prueba.

**Características**:
- ✅ Verifica la configuración SMTP desde `.env`
- ✅ Prueba la conexión con el servidor SMTP
- ✅ Envía un email de prueba
- ✅ Muestra información detallada de errores

**Uso**:
```bash
# Ejecutar manualmente
node scripts/test-smtp.js

# O usando npm
npm run test:smtp
```

**Configuración**:
Configura las variables de entorno en `.env`:
- `SMTP_HOST`: Servidor SMTP (ej: smtp.gmail.com)
- `SMTP_PORT`: Puerto SMTP (ej: 587)
- `SMTP_USER`: Usuario SMTP
- `SMTP_PASSWORD`: Contraseña de aplicación SMTP
- `EMAIL_TO`: Email de destino para pruebas

## 📚 Documentación

Para más información sobre cómo configurar SMTP, consulta:
- [`CONFIGURAR-SMTP.md`](../docs/CONFIGURAR-SMTP.md) - Guía de configuración SMTP

## 🔧 Requisitos

- Node.js instalado
- Dependencias instaladas: `npm install`
- Configuración SMTP en `.env`
