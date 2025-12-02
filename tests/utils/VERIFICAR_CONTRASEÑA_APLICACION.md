# Cómo Verificar y Usar Correctamente la Contraseña de Aplicación

## Problema Actual

Estás recibiendo el error "Invalid credentials" incluso con una contraseña de aplicación. Esto puede deberse a varios factores.

## Pasos para Verificar la Contraseña de Aplicación

### 1. Generar una Nueva Contraseña de Aplicación

1. **Ve a**: https://myaccount.google.com/apppasswords
2. **Elimina** cualquier contraseña de aplicación anterior (opcional, para evitar confusión)
3. **Genera una nueva**:
   - **Aplicación**: Selecciona "Correo"
   - **Dispositivo**: Selecciona "Otro (nombre personalizado)"
   - **Nombre**: Ingresa "Playwright Tests" o "Automated Tests"
   - Haz clic en **"Generar"**

### 2. Copiar la Contraseña Correctamente

Cuando Google muestre la contraseña, aparecerá así:
```
xxxx xxxx xxxx xxxx
```

**IMPORTANTE**: 
- La contraseña tiene **16 caracteres** divididos en 4 grupos de 4
- **NO incluyas los espacios** al copiarla
- Ejemplo: Si Google muestra `kayt prvg uiwe kjrr`, usa `kaytprvguiwekjrr`

### 3. Verificar la Contraseña

Antes de usarla en el código, verifica:
- ✅ Tiene exactamente **16 caracteres** (sin espacios)
- ✅ Solo contiene **letras minúsculas** (a-z)
- ✅ No tiene espacios, guiones, ni otros caracteres especiales
- ✅ La copiaste completamente desde Google

### 4. Actualizar el Código

Actualiza la contraseña en estos archivos:

**Archivo 1**: `tests/utils/gmail-helper.ts`
```typescript
const GMAIL_CONFIG = {
  // ...
  auth: {
    user: 'fiestamasqaprv@gmail.com',
    pass: 'TU_CONTRASEÑA_AQUI', // ← Pega la contraseña de 16 caracteres SIN ESPACIOS
  }
};
```

**Archivo 2**: `tests/utils/test-gmail-connection.js`
```javascript
const GMAIL_CONFIG = {
  // ...
  auth: {
    user: 'fiestamasqaprv@gmail.com',
    pass: 'TU_CONTRASEÑA_AQUI' // ← Misma contraseña aquí también
  }
};
```

### 5. Probar la Conexión

Ejecuta el script de prueba:
```bash
node tests/utils/test-gmail-connection.js
```

Si funciona, deberías ver:
```
✅ Conexión exitosa!
✅ INBOX abierta exitosamente
```

## Problemas Comunes

### La contraseña tiene espacios
**Solución**: Quita todos los espacios. `kayt prvg uiwe kjrr` → `kaytprvguiwekjrr`

### La contraseña tiene menos de 16 caracteres
**Solución**: Verifica que copiaste la contraseña completa. Debe tener exactamente 16 caracteres.

### La contraseña tiene caracteres especiales
**Solución**: Las contraseñas de aplicación de Google solo contienen letras minúsculas. Si ves otros caracteres, puede que hayas copiado algo incorrecto.

### La contraseña es para otra aplicación
**Solución**: Asegúrate de generar la contraseña para **"Correo"**, no para otra aplicación.

### Acabas de generar la contraseña
**Solución**: Espera 1-2 minutos después de generar la contraseña antes de usarla. Google puede necesitar tiempo para activarla.

## Verificación Adicional

Si después de seguir estos pasos el problema persiste:

1. **Verifica que IMAP esté habilitado** (ya lo verificaste ✅)
2. **Genera una nueva contraseña de aplicación** y prueba con esa
3. **Verifica que estés usando la cuenta correcta**: `fiestamasqaprv@gmail.com`
4. **Intenta desde otro dispositivo/red** para descartar problemas de firewall

## Nota sobre Seguridad

⚠️ **IMPORTANTE**: Las contraseñas de aplicación son sensibles. No las compartas ni las subas a repositorios públicos. Considera usar variables de entorno para mayor seguridad.

