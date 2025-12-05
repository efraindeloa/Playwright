# 📧 Guía de Configuración SMTP

Esta guía te ayudará a configurar el envío de emails cuando las pruebas automatizadas fallen.

## 🎯 Objetivo

Configurar SMTP para recibir notificaciones por email en `efraindeloa@hotmail.com` cuando las pruebas fallen después de 3 intentos.

---

## 🔧 Configuración para Hotmail/Outlook

### Paso 1: Obtener Contraseña de Aplicación

Si tienes **autenticación de dos factores** habilitada (recomendado), necesitas crear una "Contraseña de aplicación":

1. Ve a: https://account.microsoft.com/security
2. Inicia sesión con tu cuenta de Hotmail/Outlook
3. Busca la sección **"Seguridad"**
4. Haz clic en **"Contraseñas de aplicación"** o **"App passwords"**
5. Si no aparece, busca **"Seguridad adicional"** o **"Advanced security options"**
6. Haz clic en **"Crear una nueva contraseña de aplicación"**
7. Dale un nombre (ej: "Fiestamas Tests")
8. **Copia la contraseña generada** (solo se muestra una vez)

### Paso 2: Configurar en .env

Abre el archivo `.env` en la raíz del proyecto y completa las siguientes líneas:

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=tu-email@hotmail.com
SMTP_PASSWORD=la-contraseña-de-aplicación-generada
EMAIL_FROM=fiestamas-tests@fiestamas.com
```

**Ejemplo**:
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=efraindeloa@hotmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=fiestamas-tests@fiestamas.com
```

**Nota**: Si la contraseña de aplicación tiene espacios, puedes dejarlos o quitarlos.

---

## 🔧 Configuración para Gmail

Si prefieres usar Gmail:

### Paso 1: Habilitar Contraseña de Aplicación

1. Ve a: https://myaccount.google.com/apppasswords
2. Inicia sesión con tu cuenta de Gmail
3. Selecciona **"Aplicación"**: Correo
4. Selecciona **"Dispositivo"**: Otro (personalizado)
5. Escribe: "Fiestamas Tests"
6. Haz clic en **"Generar"**
7. **Copia la contraseña generada** (16 caracteres sin espacios)

### Paso 2: Configurar en .env

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=la-contraseña-de-aplicación-generada
EMAIL_FROM=fiestamas-tests@fiestamas.com
```

---

## 🧪 Probar la Configuración

Una vez configurado, prueba que funciona:

```bash
npm run test:smtp
```

O directamente:

```bash
node scripts/test-smtp.js
```

Este script:
1. ✅ Verifica que las credenciales estén configuradas
2. ✅ Prueba la conexión SMTP
3. ✅ Envía un email de prueba a `efraindeloa@hotmail.com`
4. ✅ Te confirma si todo está funcionando

### Resultado Esperado

Si todo está bien configurado, verás:

```
✅ Variables de entorno cargadas desde .env

============================================================
📧 PRUEBA DE CONFIGURACIÓN SMTP
============================================================

Configuración SMTP:
  Host: smtp.office365.com
  Port: 587
  User: tu-email@hotmail.com
  Password: ***mnop

Email de destino: efraindeloa@hotmail.com
Email de origen: tu-email@hotmail.com

🔍 Verificando conexión SMTP...
✅ Conexión SMTP verificada exitosamente

📤 Enviando email de prueba...
✅ Email de prueba enviado exitosamente!

Detalles:
  Message ID: <...>
  Response: 250 2.0.0 OK

📬 Revisa tu bandeja de entrada (y spam) en: efraindeloa@hotmail.com
```

---

## ❌ Solución de Problemas

### Error: "SMTP_USER y SMTP_PASSWORD deben estar configurados"

**Solución**: Asegúrate de que las variables estén en el archivo `.env` sin espacios alrededor del `=`:

```bash
# ✅ Correcto
SMTP_USER=tu-email@hotmail.com

# ❌ Incorrecto
SMTP_USER = tu-email@hotmail.com
SMTP_USER= tu-email@hotmail.com
```

### Error: "Invalid login" o "Authentication failed"

**Causas posibles**:
1. Usas tu contraseña normal en lugar de una contraseña de aplicación
2. La contraseña de aplicación es incorrecta
3. El email no es correcto

**Solución**:
1. Crea una nueva contraseña de aplicación
2. Asegúrate de copiarla completa sin espacios adicionales
3. Verifica que el email sea correcto

### Error: "Connection timeout" o "ECONNREFUSED"

**Causas posibles**:
1. Firewall bloqueando conexiones SMTP
2. Puerto incorrecto
3. Host incorrecto

**Solución**:
1. Verifica que el firewall permite conexiones salientes en el puerto 587
2. Para Hotmail/Outlook usa: `smtp.office365.com:587`
3. Para Gmail usa: `smtp.gmail.com:587`

### Error: "Self signed certificate"

**Solución**: Esto generalmente no debería pasar con los servidores oficiales. Si ocurre, verifica que estés usando el host correcto.

### No recibo el email

**Verifica**:
1. ✅ Revisa la carpeta de **spam** o **correo no deseado**
2. ✅ Verifica que el email de destino sea correcto (`efraindeloa@hotmail.com`)
3. ✅ Ejecuta el script de prueba nuevamente
4. ✅ Revisa los logs del script para ver si hubo errores

---

## 📋 Resumen de Configuración

### Para Hotmail/Outlook:

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=tu-email@hotmail.com
SMTP_PASSWORD=contraseña-de-aplicación
EMAIL_FROM=fiestamas-tests@fiestamas.com
```

### Para Gmail:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=contraseña-de-aplicación
EMAIL_FROM=fiestamas-tests@fiestamas.com
```

---

## ✅ Verificación Final

Una vez configurado, puedes probar el sistema completo:

1. **Probar SMTP**:
   ```bash
   npm run test:smtp
   ```

2. **Verificar que recibes emails** cuando las pruebas fallan

---

## 🔒 Seguridad

- ✅ El archivo `.env` está en `.gitignore` y **NO** se subirá al repositorio
- ✅ Usa **contraseñas de aplicación** en lugar de contraseñas normales
- ✅ No compartas tu archivo `.env` con nadie
- ✅ Si comprometes una contraseña de aplicación, elimínala y crea una nueva

---

## 📚 Referencias

- [Microsoft - Contraseñas de aplicación](https://support.microsoft.com/es-es/account-billing/usar-contrase%C3%B1as-de-aplicaci%C3%B3n-con-aplicaciones-que-no-admiten-la-verificaci%C3%B3n-en-dos-pasos-5896ed9b-4263-e681-128a-a6f2979a7944)
- [Google - Contraseñas de aplicación](https://support.google.com/accounts/answer/185833)
- [Nodemailer Documentation](https://nodemailer.com/about/)

---

**Última actualización**: Diciembre 2024

