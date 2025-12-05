# 🧪 Sistema de Pruebas Automatizadas - Fiestamas

Sistema completo de pruebas automatizadas usando Playwright para la plataforma Fiestamas.

## 📁 Estructura del Proyecto

```
Playwright/
├── README.md                    # Este archivo
├── package.json                 # Dependencias y scripts npm
├── playwright.config.ts         # Configuración de Playwright
├── .env                         # Variables de entorno (no versionado)
│
├── docs/                        # 📚 Documentación completa
│   ├── README.md               # Índice de documentación
│   ├── guides/                 # Guías de configuración
│   ├── commands/               # Comandos para ejecutar pruebas
│   ├── reports/                # Reportes de pruebas
│   └── utils-docs/             # Documentación de utilidades
│
├── scripts/                     # 🔧 Scripts auxiliares
│   └── test-smtp.js           # Script para probar SMTP
│
├── tests/                       # 🧪 Pruebas automatizadas
│   ├── common/                 # Pruebas comunes (home, rutas, screenshots)
│   ├── client/                 # Pruebas de cliente
│   ├── provider/               # Pruebas de proveedor
│   ├── utils/                  # Utilidades y helpers
│   ├── test-images/            # Imágenes de prueba
│   ├── test-documents/         # Documentos de prueba
│   ├── config.ts               # Configuración de pruebas
│   └── utils.ts                # Utilidades compartidas
│
├── playwright-report/          # 📊 Reportes HTML de Playwright
├── test-results/               # Resultados temporales de pruebas
└── logs/                       # Logs del sistema
```

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
```

### Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
npm run test

# Ejecutar pruebas con UI interactiva
npm run test:ui

# Ejecutar pruebas en Chrome
npm run test:chrome

# Ver reporte HTML
npm run test:report
```

### Comandos Principales

Ver **[docs/commands/COMANDOS-NPM.txt](./docs/commands/COMANDOS-NPM.txt)** para la lista completa de comandos disponibles.

## 📚 Documentación

Toda la documentación está en la carpeta `docs/`:

- **[Guías de Configuración](./docs/guides/)** - Configuración SMTP, scripts, etc.
- **[Comandos de Pruebas](./docs/commands/)** - Cómo ejecutar cada prueba
- **[Reportes](./docs/reports/)** - Reportes y análisis de pruebas
- **[Documentación de Utilidades](./docs/utils-docs/)** - Helpers y utilidades

## 🧪 Tipos de Pruebas

### Pruebas Comunes (`tests/common/`)
- Home - Validación de página principal
- Rutas y Categorías - Navegación y estructura
- Screenshots - Comparación visual de banners

### Pruebas de Cliente (`tests/client/`)
- Dashboard - Funcionalidades del dashboard
- Cotización - Gestión de cotizaciones
- Perfil - Configuración de perfil
- Eventos - Creación y gestión de eventos

### Pruebas de Proveedor (`tests/provider/`)
- Promociones - Gestión completa de promociones
- Chats - Funcionalidad de mensajería
- Dashboard - Panel de proveedor
- Negociación - Gestión de negociaciones
- Servicios - CRUD de servicios
- Estadísticas - Visualizaciones y métricas
- Perfil - Configuración de perfil
- Calendario - Gestión de calendario
- Registro - Registro de nuevos proveedores

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con:

```bash
# Credenciales de proveedor
FIESTAMAS_PROVIDER_EMAIL=tu-email@ejemplo.com
FIESTAMAS_PROVIDER_PASSWORD=tu-contraseña

# Configuración SMTP (opcional, para notificaciones)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
EMAIL_FROM=tu-email@gmail.com
```

Ver **[docs/guides/CONFIGURAR-SMTP.md](./docs/guides/CONFIGURAR-SMTP.md)** para más detalles.

## 📊 Reportes

Después de ejecutar las pruebas, puedes ver el reporte HTML con:

```bash
npm run test:report
```

Los reportes también se generan automáticamente en `playwright-report/`.

## 🛠️ Scripts Disponibles

- `npm run test` - Ejecutar todas las pruebas
- `npm run test:ui` - Ejecutar con UI interactiva
- `npm run test:chrome` - Ejecutar en Chrome
- `npm run test:report` - Ver reporte HTML
- `npm run test:smtp` - Probar configuración SMTP

Ver **[docs/commands/COMANDOS-NPM.txt](./docs/commands/COMANDOS-NPM.txt)** para comandos específicos de cada prueba.

## 📝 Notas

- Las pruebas se ejecutan en Chrome por defecto (headed)
- Para ejecutar en modo headless, usa `--project=chromium`
- Los screenshots de referencia se guardan en `tests/common/screenshots.spec.ts-snapshots/`
- Los archivos de prueba (imágenes y documentos) se generan automáticamente

## 🔗 Enlaces Útiles

- [Documentación de Playwright](https://playwright.dev)
- [Guía de Configuración SMTP](./docs/guides/CONFIGURAR-SMTP.md)
- [Comandos de Pruebas](./docs/commands/COMANDOS-NPM.txt)

---

**Última actualización**: Diciembre 2024

