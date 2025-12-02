# Documentación de Pruebas: Registro de Proveedor

## 1. Propósito

El propósito de las pruebas de registro de proveedor es validar que el flujo completo de registro de un nuevo usuario como proveedor de servicios funcione correctamente en la aplicación web. Estas pruebas aseguran que todos los pasos del proceso de registro se ejecuten de manera adecuada, desde la selección del tipo de usuario hasta la finalización del registro con todos los datos personales requeridos.

## 2. Objetivos

### 2.1 Objetivos Generales
- Verificar que el proceso de registro de proveedor funciona correctamente de extremo a extremo
- Validar que todos los formularios del flujo de registro se completan y envían exitosamente
- Asegurar que las validaciones de seguridad (código de verificación, Cloudflare Turnstile) funcionan adecuadamente
- Confirmar que la navegación entre pasos del registro es fluida y sin errores

### 2.2 Objetivos Específicos
- Validar la selección del tipo de usuario "Proveedor"
- Verificar el ingreso y validación del correo electrónico
- Confirmar el proceso de verificación mediante código de verificación
- Validar la creación y confirmación de contraseña
- Verificar el ingreso de datos personales (nombre, apellido, teléfono)
- Asegurar que la verificación de Cloudflare Turnstile se completa correctamente
- Confirmar que el registro se finaliza exitosamente

## 3. Contenido de las Pruebas

### 3.1 Alcance de las Pruebas

Las pruebas cubren el siguiente flujo completo:

1. **Navegación inicial**: Acceso a la página de login/registro
2. **Selección de tipo de usuario**: Selección de la opción "Proveedor"
3. **Registro de email**: Ingreso y validación del correo electrónico
4. **Verificación de código**: Ingreso del código de verificación enviado por email
5. **Creación de contraseña**: Definición y confirmación de contraseña
6. **Datos personales**: Ingreso de información personal del proveedor
7. **Verificación de seguridad**: Validación mediante Cloudflare Turnstile
8. **Finalización**: Completar el proceso de registro

### 3.2 Componentes Probados

#### 3.2.1 Interfaz de Usuario
- Botón "Regístrate" en la página de login
- Selección de tipo de usuario (botón "Proveedor" con ícono `icon-briefcase`)
- Botón "Continuar" para avanzar después de seleccionar el tipo de usuario
- Formularios de registro en cada paso del proceso
- Botones de navegación ("Siguiente", "Finalizar")

#### 3.2.2 Formularios
- **Formulario de Email** (`RegisterEmailForm`):
  - Campo de entrada de email (`input[id="Email"]`)
  - Botón "Siguiente" (`button[type="submit"][form="RegisterEmailForm"]`)

- **Formulario de Código de Verificación**:
  - Seis campos de entrada para código de 6 dígitos (`input[id="VerificationCode_0"]` a `input[id="VerificationCode_5"]`)
  - Validación automática al completar todos los dígitos

- **Formulario de Contraseña** (`CreatePasswordForm`):
  - Campo de contraseña (`input[id="Password"]`)
  - Campo de confirmación de contraseña (`input[id="RepeatPassword"]`)
  - Botón "Siguiente" (`button[type="submit"][form="CreatePasswordForm"]`)

- **Formulario de Datos Personales** (`RegisterPersonalDataForm`):
  - Campo de nombre (`input[id="Name"]`)
  - Campo de apellido (`input[id="LastName"]`)
  - Campo de teléfono (`input[id="PhoneNumber"]`)
  - Widget de Cloudflare Turnstile para verificación humana
  - Botón "Finalizar" (`button[type="submit"][form="RegisterPersonalDataForm"]`)

#### 3.2.3 Validaciones y Seguridad
- Verificación de email mediante código de 6 dígitos
- Validación de contraseña (requisitos de seguridad)
- Verificación humana mediante Cloudflare Turnstile
- Validación de campos requeridos en cada formulario

## 4. Flujo Detallado de la Prueba

### 4.1 Paso 1: Navegación Inicial
- **Acción**: Navegar a la página de login (`/login`)
- **Validación**: La página se carga correctamente
- **Timeout**: Configurado en 90 segundos para todo el test

### 4.2 Paso 2: Inicio del Registro
- **Acción**: Hacer clic en el botón "Regístrate"
- **Selector**: `button[type="button"].font-bold.underline.text-primary-neutral` con texto "Regístrate"
- **Validación**: Aparece la página de selección de tipo de usuario
- **Espera**: 2 segundos después del clic

### 4.3 Paso 3: Selección de Tipo de Usuario
- **Acción**: Seleccionar la opción "Proveedor"
- **Selector**: Botón que contiene:
  - Texto "Proveedor" en `p.text-medium.font-extrabold`
  - Ícono `i.icon-briefcase`
- **Validación**: La opción se selecciona correctamente
- **Espera**: 500ms después de la selección

### 4.4 Paso 4: Continuar al Formulario de Email
- **Acción**: Hacer clic en el botón "Continuar"
- **Selector**: `button` con texto "Continuar" y `span.font-bold`
- **Validación**: Aparece el formulario de email
- **Espera**: 2 segundos después del clic

### 4.5 Paso 5: Ingreso de Email
- **Acción**: Ingresar el correo electrónico
- **Campo**: `input[id="Email"]`
- **Valor**: Email configurado en `REGISTRATION_EMAIL_DEFAULT` (desde configuración)
- **Validación**: El email se ingresa correctamente
- **Espera**: 500ms después de ingresar el email

### 4.6 Paso 6: Envío del Formulario de Email
- **Acción**: Hacer clic en el botón "Siguiente"
- **Selector**: `button[type="submit"][form="RegisterEmailForm"]` con texto "Siguiente"
- **Validación**: Se envía el formulario y aparece la página de código de verificación
- **Espera**: 2 segundos después del clic

### 4.7 Paso 7: Verificación de Código
- **Acción**: Obtener automáticamente el código de verificación desde Gmail e ingresarlo
- **Campos**: Seis inputs (`VerificationCode_0` a `VerificationCode_5`)
- **Proceso Automatizado**:
  1. Se conecta a Gmail usando IMAP (servidor: `imap.gmail.com`, puerto: 993)
  2. Busca emails con subject "Código de verificación" en la bandeja de entrada
  3. Filtra emails de las últimas 24 horas
  4. **Verifica el destinatario**: Si el email de registro tiene formato `usuario+algo@gmail.com` (ej: `fiestamasqaprv+47@gmail.com`), verifica que el email fue enviado a esa dirección específica revisando los headers del email (To, Delivered-To, Envelope-To)
  5. Extrae el código de 6 dígitos del contenido del email (formato: código en línea separada)
  6. Ingresa automáticamente el código en los campos correspondientes
- **Configuración Gmail**:
  - **Cuenta IMAP**: `fiestamasqaprv@gmail.com` (cuenta principal para acceso IMAP)
  - **Contraseña**: `Fiesta2025$`
  - **Protocolo**: IMAP con SSL/TLS
  - **Nota importante**: Los emails de registro pueden usar formato `fiestamasqaprv+47@gmail.com` (con sufijo +número). Gmail entrega estos emails a la cuenta principal, pero la función verifica los headers del email para asegurar que el código corresponde al email específico usado en el registro.
- **Validación**: 
  - Busca emails con subject exacto: "Código de verificación"
  - Extrae el código de 6 dígitos del contenido del email
  - Formato esperado del email:
    - Subject: "Código de verificación"
    - Contenido: El código está en una línea separada (ej: "938170")
    - El código aparece después de "Verifica tu correo"
  - Estrategias de búsqueda (en orden de prioridad):
    1. Líneas con exactamente 6 dígitos
    2. Código después de "Verifica tu correo"
    3. Búsqueda en HTML parseado
    4. Último recurso: cualquier código de 6 dígitos
  - Timeout máximo: 2 minutos (120,000ms)
  - Intervalo de verificación: 5 segundos
- **Comportamiento**: 
  - Muestra mensajes de progreso durante la búsqueda
  - Falla si no se encuentra el código en el tiempo límite
  - Ingresa cada dígito del código con una pausa de 200ms entre dígitos
- **Espera**: 2 segundos después de ingresar el código completo

### 4.8 Paso 8: Validación del Código
- **Validación**: Verificar que el formulario de contraseña aparece
- **Campo esperado**: `input[id="Password"]` debe estar visible
- **Comportamiento**: 
  - Si el código no se ingresó, la prueba falla con error crítico
  - Si el formulario de contraseña no aparece, la prueba falla
- **Espera**: 2 segundos adicionales para asegurar actualización de la página

### 4.9 Paso 9: Creación de Contraseña
- **Acción**: Ingresar la contraseña
- **Campo**: `input[id="Password"]`
- **Valor**: Contraseña configurada en `DEFAULT_ACCOUNT_PASSWORD` (desde configuración)
- **Validación**: La contraseña se ingresa correctamente
- **Espera**: 500ms después de ingresar la contraseña

### 4.10 Paso 10: Confirmación de Contraseña
- **Acción**: Confirmar la contraseña
- **Campo**: `input[id="RepeatPassword"]`
- **Valor**: Misma contraseña que en el paso anterior
- **Validación**: La confirmación se ingresa correctamente
- **Espera**: 1 segundo para validación de requisitos de contraseña

### 4.11 Paso 11: Envío del Formulario de Contraseña
- **Acción**: Hacer clic en el botón "Siguiente"
- **Selector**: `button[type="submit"][form="CreatePasswordForm"]` con texto "Siguiente"
- **Validación**: Se envía el formulario y aparece el formulario de datos personales
- **Espera**: 2 segundos después del clic

### 4.12 Paso 12: Ingreso de Datos Personales

#### 4.12.1 Nombre
- **Acción**: Ingresar el nombre
- **Campo**: `input[id="Name"]`
- **Valor**: "Carlos" (valor de prueba)
- **Validación**: El nombre se ingresa correctamente
- **Espera**: 500ms después de ingresar el nombre

#### 4.12.2 Apellido
- **Acción**: Ingresar el apellido
- **Campo**: `input[id="LastName"]`
- **Valor**: "González" (valor de prueba)
- **Validación**: El apellido se ingresa correctamente
- **Espera**: 500ms después de ingresar el apellido

#### 4.12.3 Teléfono
- **Acción**: Ingresar el número de teléfono
- **Campo**: `input[id="PhoneNumber"]`
- **Valor**: "5559876543" (valor de prueba)
- **Validación**: El teléfono se ingresa correctamente
- **Espera**: 500ms después de ingresar el teléfono

### 4.13 Paso 13: Verificación Cloudflare Turnstile
- **Acción**: Esperar a que se complete la verificación de Cloudflare Turnstile
- **Validaciones**:
  - Buscar mensaje "Por favor verifica que eres humano"
  - Esperar a que el mensaje desaparezca (timeout: 60 segundos)
  - Verificar que aparece el texto "Success!" en el widget (`#success-text`)
- **Comportamiento**:
  - Si no hay mensaje de verificación, verifica directamente el estado del Turnstile
  - Si el Turnstile ya está validado, continúa
  - Si hay error, registra advertencia pero continúa
- **Espera**: 1 segundo adicional después de la verificación

### 4.14 Paso 14: Finalización del Registro
- **Acción**: Hacer clic en el botón "Finalizar"
- **Selector**: `button[type="submit"][form="RegisterPersonalDataForm"]` con texto "Finalizar"
- **Validación**: Se envía el formulario y se completa el registro
- **Resultado esperado**: Registro exitoso del proveedor

## 5. Datos de Prueba Utilizados

### 5.1 Configuración
- **Email**: Valor desde `REGISTRATION_EMAIL_DEFAULT` (archivo de configuración)
  - Puede tener formato `fiestamasqaprv+47@gmail.com` (con sufijo +número)
  - Gmail entrega estos emails a `fiestamasqaprv@gmail.com` pero mantiene el email completo en los headers
- **Contraseña**: Valor desde `DEFAULT_ACCOUNT_PASSWORD` (archivo de configuración)
- **Nombre**: "Carlos"
- **Apellido**: "González"
- **Teléfono**: "5559876543"

### 5.2 Viewport
- **Ancho**: 1280px
- **Alto**: 720px

### 5.3 Timeouts
- **Timeout general del test**: 90 segundos (90,000ms)
- **Timeout para código de verificación**: 5 minutos (300,000ms)
- **Timeout para Cloudflare Turnstile**: 60 segundos
- **Timeouts individuales de elementos**: 10 segundos (10,000ms)

## 6. Funciones Auxiliares

### 6.1 `safeFill(page, label, value, timeout)`
- **Propósito**: Llenar un input de forma segura, esperando que esté visible y editable
- **Parámetros**:
  - `page`: Instancia de Page de Playwright
  - `label`: Etiqueta del campo a llenar
  - `value`: Valor a ingresar
  - `timeout`: Tiempo máximo de espera (default: 10 segundos)
- **Comportamiento**: Reintenta cada 200ms hasta que el campo esté visible y se pueda llenar

### 6.2 `registerProvider(page, email)`
- **Propósito**: Ejecutar el flujo completo de registro de proveedor
- **Parámetros**:
  - `page`: Instancia de Page de Playwright
  - `email`: Email a utilizar (default: `REGISTRATION_EMAIL_DEFAULT`)
- **Comportamiento**: Ejecuta todos los pasos del registro desde la selección de tipo de usuario hasta la finalización
- **Integración Gmail**: Utiliza automáticamente `waitForVerificationCode()` para obtener el código de verificación desde Gmail

### 6.3 `waitForVerificationCode(emailAddress, maxWaitTime)` (Gmail Helper)
- **Propósito**: Obtener el código de verificación desde Gmail usando IMAP
- **Parámetros**:
  - `emailAddress`: Dirección de email para buscar el código
  - `maxWaitTime`: Tiempo máximo de espera en milisegundos (default: 120,000ms / 2 minutos)
- **Comportamiento**: 
  - Se conecta a Gmail usando IMAP
  - Busca emails recientes (últimas 24 horas)
  - Extrae el código de 6 dígitos del contenido del email
  - Reintenta cada 5 segundos hasta encontrar el código o alcanzar el timeout
- **Retorna**: El código de verificación de 6 dígitos o lanza un error si no se encuentra

### 6.4 `getVerificationCodeFromGmail(emailAddress, maxWaitTime, checkInterval)` (Gmail Helper)
- **Propósito**: Función interna para buscar el código de verificación en Gmail
- **Parámetros**:
  - `emailAddress`: Dirección de email opcional para filtrar emails
  - `maxWaitTime`: Tiempo máximo de espera en milisegundos (default: 120,000ms)
  - `checkInterval`: Intervalo entre verificaciones en milisegundos (default: 5,000ms)
- **Comportamiento**: 
  - Conecta a Gmail usando IMAP
  - Busca en los últimos 10 emails recibidos
  - Parsea el contenido del email (texto y HTML)
  - Busca patrones de código de 6 dígitos
  - Retorna el código encontrado o null si no se encuentra

## 7. Validaciones y Verificaciones

### 7.1 Validaciones de Visibilidad
- Todos los elementos deben estar visibles antes de interactuar con ellos
- Se verifica la visibilidad de cada formulario antes de proceder al siguiente paso
- Se valida que los botones estén habilitados antes de hacer clic

### 7.2 Validaciones de Estado
- Verificación de que el código de verificación se ingresó completamente
- Verificación de que Cloudflare Turnstile se completó exitosamente
- Validación de que se avanzó correctamente entre pasos del registro

### 7.3 Manejo de Errores
- **Código de verificación no ingresado**: La prueba falla con error crítico
- **Formulario de contraseña no visible**: La prueba falla indicando que el código no fue validado
- **Timeout en verificación Turnstile**: Se registra advertencia pero se continúa
- **Elementos no encontrados**: Se lanzan errores descriptivos con información del elemento faltante

## 8. Consideraciones Técnicas

### 8.1 Interactividad del Usuario
- El código de verificación requiere entrada manual del usuario
- La prueba espera de forma no intrusiva (verifica cada 2 segundos)
- No interfiere con la entrada del usuario durante el ingreso del código

### 8.2 Verificaciones de Seguridad
- Cloudflare Turnstile requiere verificación humana interactiva
- La prueba espera a que se complete la verificación antes de continuar
- Se manejan casos donde la verificación ya está completa o no es necesaria

### 8.3 Robustez
- Múltiples estrategias de espera para elementos dinámicos
- Manejo de timeouts extensos para procesos que requieren interacción humana
- Validaciones redundantes para asegurar que el flujo avanza correctamente

### 8.4 Logging
- Mensajes de consola informativos en cada paso
- Indicadores de progreso durante esperas largas
- Mensajes de error descriptivos cuando algo falla

## 9. Casos de Prueba Cubiertos

### 9.1 Caso de Éxito
- **Descripción**: Registro completo de un nuevo proveedor con todos los datos válidos
- **Cobertura**: Todos los pasos del flujo se ejecutan correctamente
- **Resultado esperado**: Registro exitoso

### 9.2 Casos de Validación
- Validación de código de verificación (requiere entrada manual)
- Validación de contraseña (requisitos de seguridad)
- Validación de Cloudflare Turnstile (verificación humana)

### 9.3 Casos de Error
- Código de verificación no ingresado (timeout después de 5 minutos)
- Formulario de contraseña no aparece (indica código no validado)
- Elementos no encontrados (errores descriptivos)

## 10. APIs y Endpoints Utilizados

### 10.1 Gmail IMAP API
- **Protocolo**: IMAP (Internet Message Access Protocol)
- **Servidor**: `imap.gmail.com`
- **Puerto**: 993 (SSL/TLS)
- **Autenticación**: Usuario y contraseña
- **Credenciales**:
  - Usuario: `fiestamasqaprv@gmail.com`
  - Contraseña: `Fiesta2025$`
- **Funcionalidad**: 
  - Conexión segura mediante SSL/TLS
  - Acceso a la bandeja de entrada (INBOX)
  - Búsqueda de emails recientes (últimas 24 horas)
  - Lectura y parseo del contenido de emails
- **Librerías utilizadas**:
  - `imap`: Cliente IMAP para Node.js
  - `mailparser`: Parser para contenido de emails (texto y HTML)

### 10.2 Endpoints de la Aplicación
- **Login/Registro**: `${DEFAULT_BASE_URL}/login`
- **Formulario de Email**: Formulario `RegisterEmailForm`
- **Formulario de Código**: Página de verificación con 6 campos de entrada
- **Formulario de Contraseña**: Formulario `CreatePasswordForm`
- **Formulario de Datos Personales**: Formulario `RegisterPersonalDataForm`

## 11. Dependencias y Requisitos

### 11.1 Configuración Requerida
- Archivo de configuración con:
  - `DEFAULT_BASE_URL`: URL base de la aplicación
  - `REGISTRATION_EMAIL_DEFAULT`: Email por defecto para registro
  - `DEFAULT_ACCOUNT_PASSWORD`: Contraseña por defecto para registro
- **Configuración Gmail** (en `tests/utils/gmail-helper.ts`):
  - Cuenta Gmail: `fiestamasqaprv@gmail.com`
  - Contraseña: `Fiesta2025$`
  - Servidor IMAP: `imap.gmail.com`
  - Puerto: 993 (SSL/TLS)

### 11.2 Servicios Externos
- **Gmail IMAP**: Acceso a la cuenta de Gmail para obtener el código de verificación automáticamente
  - Requiere acceso IMAP habilitado en la cuenta de Gmail
  - La cuenta debe tener permisos para recibir emails de verificación
- Servicio de envío de emails (para código de verificación)
- Cloudflare Turnstile (para verificación humana)

### 11.3 Dependencias NPM
- **imap**: `^0.8.19` - Cliente IMAP para Node.js
- **mailparser**: `^3.6.5` - Parser para contenido de emails
- **@types/imap**: `^0.8.40` - Tipos TypeScript para imap

**Instalación**:
```bash
npm install imap mailparser
npm install --save-dev @types/imap
```

### 11.4 Entorno de Prueba
- Navegador configurado (Chromium, Firefox, WebKit según configuración)
- Viewport de 1280x720px
- Timeout de 90 segundos para el test completo

## 12. Ejecución de las Pruebas

### 12.1 Instalación de Dependencias
Antes de ejecutar las pruebas, asegúrate de instalar las dependencias necesarias:

```bash
npm install
```

Esto instalará automáticamente:
- `imap` y `mailparser` para acceso a Gmail
- `@types/imap` para soporte TypeScript

### 12.2 Comando de Ejecución
```bash
npm run test:registro-proveedor
```

O con interfaz visual:
```bash
npm run test:registro-proveedor:headed
```

### 12.3 Precondiciones
- La aplicación debe estar ejecutándose y accesible en la URL configurada
- El servicio de emails debe estar funcionando para enviar códigos de verificación
- **Gmail IMAP debe estar habilitado** en la cuenta `fiestamasqaprv@gmail.com`
  - Verificar configuración en: https://myaccount.google.com/security
  - Habilitar "Acceso de aplicaciones menos seguras" o usar "Contraseña de aplicación" si está habilitada la verificación en dos pasos
- Cloudflare Turnstile debe estar configurado y funcionando
- **Dependencias npm instaladas**: `imap` y `mailparser` (ejecutar `npm install` antes de las pruebas)

### 12.4 Postcondiciones
- Se crea un nuevo usuario proveedor en el sistema
- El usuario puede iniciar sesión con las credenciales utilizadas en la prueba

## 13. Mantenimiento y Actualizaciones

### 13.1 Selectores
- Los selectores CSS pueden cambiar con actualizaciones de la UI
- Se recomienda revisar y actualizar selectores si la interfaz cambia
- Los selectores están diseñados para ser específicos y robustos

### 13.2 Valores de Prueba
- Los valores de prueba (nombre, apellido, teléfono) pueden modificarse según necesidades
- Se recomienda usar datos de prueba que no interfieran con datos reales

### 13.3 Timeouts
- Los timeouts pueden ajustarse según la velocidad de la aplicación
- El timeout de código de verificación desde Gmail (2 minutos) puede ajustarse según la velocidad de entrega de emails
- Si los emails tardan más en llegar, aumentar `maxWaitTime` en `waitForVerificationCode()`

### 13.4 Configuración Gmail
- **Credenciales**: Las credenciales de Gmail están en `tests/utils/gmail-helper.ts`
- **Actualización de contraseña**: Si la contraseña de Gmail cambia, actualizar `GMAIL_CONFIG.password`
- **IMAP habilitado**: Verificar que IMAP esté habilitado en la cuenta de Gmail
- **Patrones de código**: Si el formato del código de verificación cambia, actualizar los patrones regex en `getVerificationCodeFromGmail()`

---

**Última actualización**: Generado automáticamente basado en el código de pruebas actual
**Archivo de prueba**: `tests/provider/registro.spec.ts`

