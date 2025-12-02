# Cómo Verificar que IMAP está Habilitado en Gmail

## Método 1: Desde la Configuración de Gmail (Recomendado)

### Pasos:

1. **Abre Gmail en tu navegador**
   - Ve a: https://mail.google.com/
   - Inicia sesión con la cuenta: `fiestamasqaprv@gmail.com`

2. **Abre la Configuración**
   - Haz clic en el ícono de **configuración** (⚙️) en la esquina superior derecha
   - Selecciona **"Ver todas las configuraciones"** o **"See all settings"**

3. **Ve a la pestaña de POP/IMAP**
   - Haz clic en la pestaña **"Reenvío y correo POP/IMAP"** o **"Forwarding and POP/IMAP"**
   - Esta pestaña está al final de las pestañas de configuración

4. **Verifica el estado de IMAP**
   - Busca la sección **"Acceso IMAP"** o **"IMAP access"**
   - Debe estar seleccionada la opción: **"Habilitar IMAP"** o **"Enable IMAP"**
   - Si dice **"Deshabilitar IMAP"** o **"Disable IMAP"**, significa que está habilitado ✅
   - Si dice **"Habilitar IMAP"** o **"Enable IMAP"**, haz clic en esa opción para activarlo

5. **Guarda los cambios**
   - Desplázate hacia abajo y haz clic en **"Guardar cambios"** o **"Save Changes"**

## Método 2: Verificación Visual Rápida

Si IMAP está habilitado, verás algo como esto en la configuración:

```
┌─────────────────────────────────────────┐
│ Acceso IMAP                              │
│                                          │
│ ○ Deshabilitar IMAP                     │
│ ● Habilitar IMAP  ← Esta debe estar     │
│                      seleccionada        │
└─────────────────────────────────────────┘
```

## Método 3: Probar con un Cliente de Correo

Si puedes configurar Gmail en un cliente de correo (como Outlook o Thunderbird), IMAP está habilitado:

1. **Configuración para Outlook/Thunderbird:**
   - Servidor entrante: `imap.gmail.com`
   - Puerto: 993
   - Seguridad: SSL/TLS
   - Usuario: `fiestamasqaprv@gmail.com`
   - Contraseña: Tu contraseña de aplicación

2. **Si la conexión funciona**, IMAP está habilitado ✅

## Método 4: Usar el Script de Prueba

Ejecuta el script de prueba que creamos:

```bash
node tests/utils/test-gmail-connection.js
```

Si el script se conecta exitosamente, IMAP está habilitado ✅

## Solución de Problemas

### Si no puedes encontrar la opción de IMAP:

1. **Asegúrate de estar en la cuenta correcta**
   - Verifica que estés usando `fiestamasqaprv@gmail.com`

2. **Verifica que no estés en una cuenta de organización**
   - Las cuentas de Google Workspace pueden tener restricciones diferentes

3. **Intenta desde otro navegador**
   - A veces la interfaz puede variar

### Si IMAP está deshabilitado:

1. **Habilítalo** siguiendo los pasos del Método 1
2. **Espera unos minutos** después de habilitarlo
3. **Vuelve a ejecutar las pruebas**

## Enlaces Directos

- **Gmail**: https://mail.google.com/
- **Configuración de Gmail**: https://mail.google.com/mail/u/0/#settings/fwdandpop
- **Configuración de Cuenta de Google**: https://myaccount.google.com/

## Nota Importante

Después de habilitar IMAP, puede tomar unos minutos para que los cambios surtan efecto. Si acabas de habilitarlo, espera 2-3 minutos antes de probar la conexión nuevamente.

