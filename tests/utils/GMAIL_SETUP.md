# Configuración de Gmail IMAP para Pruebas Automatizadas

## Descripción

Este documento describe cómo configurar el acceso IMAP a Gmail para obtener automáticamente los códigos de verificación durante las pruebas automatizadas.

## Credenciales Configuradas

- **Email IMAP**: `fiestamasqaprv@gmail.com` (cuenta principal para acceso IMAP)
- **Contraseña**: `Fiesta2025$`
- **Servidor IMAP**: `imap.gmail.com`
- **Puerto**: 993 (SSL/TLS)

### Nota sobre Emails con Sufijo

Los emails de registro pueden usar formato `fiestamasqaprv+47@gmail.com` (con sufijo +número). Gmail entrega estos emails a la cuenta principal (`fiestamasqaprv@gmail.com`), pero la función de búsqueda verifica los headers del email para asegurar que el código corresponde al email específico usado en el registro.

**Ejemplo**:
- Email de registro: `fiestamasqaprv+47@gmail.com`
- Email IMAP: `fiestamasqaprv@gmail.com`
- El código de verificación se busca en emails enviados a `fiestamasqaprv+47@gmail.com`

## Configuración Requerida en Gmail

### Opción 1: Habilitar Acceso de Aplicaciones Menos Seguras (No recomendado para producción)

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Navega a **Seguridad**
3. Busca la sección **Acceso de aplicaciones menos seguras**
4. Activa esta opción (si está disponible)

**Nota**: Google puede haber deshabilitado esta opción en cuentas nuevas.

### Opción 2: Usar Contraseña de Aplicación (REQUERIDO si tienes verificación en dos pasos)

**⚠️ IMPORTANTE**: Si ves el error "Application-specific password required", debes usar una contraseña de aplicación.

Pasos para generar una contraseña de aplicación:

1. Ve directamente a: **https://myaccount.google.com/apppasswords**
   - O ve a: https://myaccount.google.com/ → Seguridad → Contraseñas de aplicaciones

2. Si es la primera vez, Google puede pedirte que verifiques tu identidad

3. En "Seleccionar aplicación", elige **"Correo"**

4. En "Seleccionar dispositivo", elige **"Otro (nombre personalizado)"**

5. Ingresa un nombre descriptivo como: **"Playwright Tests"** o **"Automated Tests"**

6. Haz clic en **"Generar"**

7. Google te mostrará una contraseña de **16 caracteres** (sin espacios)
   - Ejemplo: `abcd efgh ijkl mnop` → usa `abcdefghijklmnop`

8. **Copia esta contraseña** (solo se muestra una vez)

9. Actualiza `tests/utils/gmail-helper.ts`:
   ```typescript
   const GMAIL_CONFIG = {
     user: 'fiestamasqaprv@gmail.com',
     password: 'abcdefghijklmnop', // ← Pega aquí la contraseña de aplicación
     // ...
   };
   ```

10. **No uses tu contraseña normal** - solo funciona la contraseña de aplicación

**Nota**: La contraseña de aplicación es diferente de tu contraseña de Gmail. Es específica para aplicaciones que no pueden usar verificación en dos pasos.

### Opción 3: Habilitar IMAP en Gmail

1. Ve a Gmail: https://mail.google.com/
2. Haz clic en el ícono de configuración (⚙️)
3. Selecciona **Ver todas las configuraciones**
4. Ve a la pestaña **Reenvío y correo POP/IMAP**
5. En la sección **Acceso IMAP**, selecciona **Habilitar IMAP**
6. Guarda los cambios

## Verificación de la Configuración

Para verificar que IMAP está habilitado:

1. Intenta conectarte usando un cliente de correo (como Thunderbird o Outlook)
2. O ejecuta las pruebas y verifica los logs

## Troubleshooting

Si estás experimentando errores de conexión IMAP, consulta el documento detallado:
**[GMAIL_TROUBLESHOOTING.md](./GMAIL_TROUBLESHOOTING.md)**

### Error: "Authentication failed"

- Verifica que la contraseña sea correcta
- Si tienes verificación en dos pasos, usa una contraseña de aplicación
- Asegúrate de que IMAP esté habilitado en Gmail

### Error: "Connection timeout"

- Verifica tu conexión a internet
- Verifica que el puerto 993 no esté bloqueado por un firewall
- Intenta desde otra red si es posible

### Error: "Cannot find module 'imap'"

- Ejecuta `npm install` para instalar las dependencias
- Verifica que `imap` y `mailparser` estén en `package.json`

### El código no se encuentra

- Verifica que el email de verificación haya llegado a la bandeja de entrada
- Revisa los logs para ver qué emails se están buscando
- Aumenta el `maxWaitTime` si los emails tardan en llegar

## Seguridad

⚠️ **IMPORTANTE**: Las credenciales están almacenadas en texto plano en el código. Para producción:

1. Usa variables de entorno para las credenciales
2. No commits las credenciales al repositorio
3. Usa un servicio de gestión de secretos (como AWS Secrets Manager o Azure Key Vault)
4. Considera usar OAuth2 en lugar de contraseñas

## Ejemplo de Uso con Variables de Entorno

```typescript
const GMAIL_CONFIG = {
  user: process.env.GMAIL_USER || 'fiestamasqaprv@gmail.com',
  password: process.env.GMAIL_PASSWORD || 'Fiesta2025$',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};
```

Luego configura las variables de entorno:

```bash
export GMAIL_USER="fiestamasqaprv@gmail.com"
export GMAIL_PASSWORD="Fiesta2025$"
```

