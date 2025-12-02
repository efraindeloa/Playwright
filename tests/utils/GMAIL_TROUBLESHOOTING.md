# Troubleshooting: Errores de Conexión IMAP a Gmail

## Error: "Error de conexión IMAP, reintentando..."

Si estás viendo este error repetidamente, sigue estos pasos para diagnosticar y resolver el problema:

## 1. Verificar que IMAP esté habilitado en Gmail

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Navega a **Seguridad**
3. Busca la sección **Acceso de aplicaciones menos seguras** o **Contraseñas de aplicaciones**
4. Si tienes verificación en dos pasos activada:
   - Ve a **Contraseñas de aplicaciones**
   - Genera una nueva contraseña para "Correo"
   - Usa esta contraseña en lugar de tu contraseña normal

## 2. Habilitar IMAP en Gmail

1. Ve a Gmail: https://mail.google.com/
2. Haz clic en el ícono de configuración (⚙️)
3. Selecciona **Ver todas las configuraciones**
4. Ve a la pestaña **Reenvío y correo POP/IMAP**
5. En la sección **Acceso IMAP**, selecciona **Habilitar IMAP**
6. Guarda los cambios

## 3. Verificar Credenciales

Las credenciales configuradas son:
- **Usuario**: `fiestamasqaprv@gmail.com`
- **Contraseña**: `Fiesta2025$`

**Si la contraseña ha cambiado o no funciona:**
1. Verifica que la contraseña sea correcta
2. Si tienes verificación en dos pasos, usa una contraseña de aplicación
3. Actualiza la contraseña en `tests/utils/gmail-helper.ts` en la constante `GMAIL_CONFIG`

## 4. Errores Comunes y Soluciones

### Error: "Application-specific password required" ⚠️ MÁS COMÚN

**Causa**: La cuenta tiene verificación en dos pasos habilitada y requiere una contraseña de aplicación

**Solución** (Sigue estos pasos exactos):

1. **Ve a**: https://myaccount.google.com/apppasswords
   - Si no puedes acceder directamente, ve a: https://myaccount.google.com/ → Seguridad → Contraseñas de aplicaciones

2. **Verifica tu identidad** si Google lo solicita

3. **En el campo "App name"**, ingresa un nombre descriptivo:
   - Ejemplo: `Playwright Tests` o `Gmail IMAP` o `Automated Tests`

4. **Haz clic en el botón "Create"** (se habilitará cuando ingreses un nombre)

5. **Copia la contraseña**: Google mostrará una contraseña de 16 caracteres
   - Formato mostrado: `xxxx xxxx xxxx xxxx` (con espacios)
   - **Quita los espacios** al usarla: `xxxxxxxxxxxxxxxx`

6. **Actualiza el código**: Abre `tests/utils/gmail-helper.ts` y reemplaza:
   ```typescript
   pass: 'kaytprvguiwekjrr', // ← Reemplaza con tu nueva contraseña de aplicación
   ```
   Por:
   ```typescript
   pass: 'xxxxxxxxxxxxxxxx', // ← Tu nueva contraseña de aplicación de 16 caracteres (sin espacios)
   ```

7. **También actualiza** `tests/utils/test-gmail-connection.js` con la misma contraseña

8. **Guarda y vuelve a ejecutar** las pruebas

**Nota importante**: 
- La contraseña de aplicación es diferente de tu contraseña de Gmail
- Solo se muestra una vez, así que guárdala en un lugar seguro
- Puedes generar múltiples contraseñas de aplicación si es necesario

### Error: "Invalid credentials" o "Authentication failed"

**Causa**: Credenciales incorrectas

**Solución**:
1. Si tienes verificación en dos pasos, usa una contraseña de aplicación (ver arriba)
2. Si no tienes verificación en dos pasos, verifica que la contraseña sea correcta
3. Asegúrate de no tener espacios extra al copiar la contraseña

### Error: "ECONNREFUSED" o "ETIMEDOUT"

**Causa**: Problemas de conexión o firewall bloqueando el puerto 993

**Solución**:
1. Verifica tu conexión a internet
2. Verifica que el puerto 993 (IMAP SSL) no esté bloqueado por un firewall
3. Intenta desde otra red si es posible
4. Verifica que tu ISP no esté bloqueando conexiones IMAP

### Error: "self-signed certificate"

**Causa**: Advertencia de certificado SSL (normal con la configuración actual)

**Solución**: Este error es normal y no debería impedir la conexión. La configuración actual (`rejectUnauthorized: false`) permite conexiones con certificados autofirmados.

### Error: "IMAP not enabled"

**Causa**: IMAP no está habilitado en la cuenta de Gmail

**Solución**: Sigue los pasos en la sección "Habilitar IMAP en Gmail" arriba.

## 5. Probar la Conexión Manualmente

Puedes probar la conexión IMAP usando un cliente de correo como Thunderbird o Outlook:

1. Configura una nueva cuenta de correo
2. Usa estos parámetros:
   - **Tipo**: IMAP
   - **Servidor entrante**: `imap.gmail.com`
   - **Puerto**: 993
   - **Seguridad**: SSL/TLS
   - **Usuario**: `fiestamasqaprv@gmail.com`
   - **Contraseña**: `Fiesta2025$` (o contraseña de aplicación)

Si la conexión funciona en el cliente de correo pero no en las pruebas, el problema puede estar en el código.

## 6. Usar Variables de Entorno (Recomendado para Producción)

Para mayor seguridad, considera usar variables de entorno en lugar de credenciales hardcodeadas:

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
export GMAIL_PASSWORD="tu_contraseña_o_app_password"
```

## 7. Verificar Logs Detallados

El código ahora muestra información detallada sobre los errores. Revisa los logs para ver:
- El mensaje de error específico
- Sugerencias sobre qué verificar
- El tiempo transcurrido antes de cada reintento

## 8. Contacto y Soporte

Si después de seguir estos pasos el problema persiste:
1. Verifica los logs completos de la ejecución
2. Intenta conectar manualmente usando un cliente de correo
3. Verifica que la cuenta de Gmail no esté bloqueada o suspendida
4. Considera crear una nueva contraseña de aplicación

## Notas Adicionales

- **Límite de intentos**: El código reintentará durante 2 minutos (120 segundos) por defecto
- **Intervalo de reintentos**: 5 segundos entre cada intento
- **Timeout**: Si después de 2 minutos no se puede conectar, la prueba fallará con un error descriptivo

