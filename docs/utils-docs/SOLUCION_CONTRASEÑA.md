# Solución: Error "Invalid credentials" con Contraseña de Aplicación

## Problema Actual

La contraseña de aplicación `kaytprvguiwekjrr` está siendo rechazada por Gmail con el error "Invalid credentials".

## Solución Paso a Paso

### Paso 1: Generar una Nueva Contraseña de Aplicación

1. **Ve a**: https://myaccount.google.com/apppasswords
2. **Elimina** la contraseña anterior si existe (opcional, para evitar confusión)
   - Haz clic en el ícono de papelera (🗑️) junto a la contraseña existente
3. **En el campo "App name"**, ingresa un nombre descriptivo:
   - Ejemplo: `Playwright Tests` o `Gmail IMAP` o `Automated Tests`
4. **Haz clic en el botón "Create"** (se habilitará cuando ingreses un nombre)
5. **Google mostrará la contraseña de aplicación** (16 caracteres)
6. **Copia la contraseña inmediatamente** (solo se muestra una vez)

### Paso 2: Verificar la Contraseña

Cuando Google muestre la contraseña, aparecerá así:
```
xxxx xxxx xxxx xxxx
```

**IMPORTANTE**:
- ✅ Copia **SOLO los caracteres**, sin espacios
- ✅ Debe tener exactamente **16 caracteres**
- ✅ Solo contiene **letras minúsculas** (a-z)
- ❌ NO incluyas los espacios
- ❌ NO incluyas guiones ni otros caracteres

**Ejemplo**:
- Google muestra: `abcd efgh ijkl mnop`
- Usa en el código: `abcdefghijklmnop`

### Paso 3: Actualizar el Código

Una vez que tengas la nueva contraseña, actualiza estos archivos:

**Archivo 1**: `tests/utils/gmail-helper.ts` (línea 33)
```typescript
pass: 'TU_NUEVA_CONTRASEÑA_AQUI', // Sin espacios, 16 caracteres
```

**Archivo 2**: `tests/utils/test-gmail-connection.js` (línea 10)
```javascript
pass: 'TU_NUEVA_CONTRASEÑA_AQUI' // Sin espacios, 16 caracteres
```

### Paso 4: Probar la Conexión

Ejecuta el script de prueba:
```bash
node tests/utils/verificar-app-password.js
```

Si funciona, deberías ver:
```
✅ Conexión TCP establecida
✅ Autenticación exitosa!
✅ Bandeja de entrada abierta
```

## Verificaciones Adicionales

### ✅ Verificar que IMAP esté habilitado
- Ve a: https://mail.google.com/mail/u/0/#settings/fwdandpop
- Asegúrate de que "Habilitar IMAP" esté seleccionado

### ✅ Verificar que la cuenta sea correcta
- Usuario configurado: `fiestamasqaprv@gmail.com`
- Verifica que esta sea la cuenta donde generaste la contraseña de aplicación

### ✅ Esperar después de generar
- Si acabas de generar la contraseña, espera 1-2 minutos antes de probarla
- Google puede necesitar tiempo para activarla

## Si el Problema Persiste

1. **Genera una nueva contraseña** siguiendo los pasos arriba
2. **Verifica que sea para "Correo"**, no para otra aplicación
3. **Copia la contraseña exactamente** como Google la muestra (sin espacios)
4. **Espera 1-2 minutos** después de generarla
5. **Prueba nuevamente** con el script de verificación

## Contacto

Si después de seguir estos pasos el problema persiste, puede ser necesario:
- Verificar que la cuenta no tenga restricciones adicionales
- Contactar al administrador si es una cuenta de Google Workspace
- Considerar usar OAuth2 en lugar de contraseñas de aplicación

