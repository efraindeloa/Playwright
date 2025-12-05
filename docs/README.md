# 📚 Documentación del Proyecto

Esta carpeta contiene toda la documentación del sistema de pruebas automatizadas de Fiestamas.

## 📁 Estructura de Documentación

```
docs/
├── README.md                    # Este archivo (índice)
├── guides/                      # Guías de configuración y uso
│   ├── CONFIGURAR-SMTP.md      # Configuración SMTP
│   └── SCRIPTS.md              # Documentación de scripts
├── commands/                    # Comandos para ejecutar pruebas
│   ├── COMANDOS-NPM.txt        # Todos los comandos npm disponibles
│   ├── COMANDOS-PRUEBAS-CLIENTE.md
│   └── COMANDOS-PRUEBAS-PROMOCIONES.md
├── reports/                     # Reportes de pruebas y análisis
│   ├── REPORTE_FINAL_PRUEBAS.md
│   ├── REPORTE-PRUEBAS-HOME.md
│   ├── REPORTE-PRUEBA-DASHBOARD-CLIENTE.md
│   └── ... (otros reportes)
└── utils-docs/                  # Documentación de utilidades
    ├── GMAIL_SETUP.md
    ├── GMAIL_TROUBLESHOOTING.md
    └── ... (otra documentación de utils)
```

## 📄 Documentos Disponibles

### 🔧 Guías de Configuración (`guides/`)

- **[Configuración SMTP](./guides/CONFIGURAR-SMTP.md)**
  - Guía completa para configurar el envío de emails
  - Configuración para Gmail y Hotmail/Outlook
  - Obtención de contraseñas de aplicación

- **[Scripts](./guides/SCRIPTS.md)**
  - Documentación de los scripts disponibles
  - `test-smtp.js` - Prueba de configuración SMTP

### 🎯 Comandos de Pruebas (`commands/`)

- **[Comandos NPM](./commands/COMANDOS-NPM.txt)**
  - Lista completa de todos los comandos npm disponibles
  - Organizados por categoría (Promociones, Cliente, Provider, Common)

- **[Comandos de Pruebas de Cliente](./commands/COMANDOS-PRUEBAS-CLIENTE.md)**
  - Comandos para ejecutar cada prueba individual de cliente

- **[Comandos de Pruebas de Promociones](./commands/COMANDOS-PRUEBAS-PROMOCIONES.md)**
  - Comandos para ejecutar cada prueba individual de promociones

### 📊 Reportes (`reports/`)

- **[Reporte Final de Pruebas](./reports/REPORTE_FINAL_PRUEBAS.md)**
- **[Reporte de Pruebas de Home](./reports/REPORTE-PRUEBAS-HOME.md)**
- **[Reporte de Dashboard Cliente](./reports/REPORTE-PRUEBA-DASHBOARD-CLIENTE.md)**
- Y otros reportes de pruebas específicas...

### 🛠️ Documentación de Utilidades (`utils-docs/`)

- Documentación sobre configuración de Gmail
- Guías de troubleshooting
- Documentación de helpers y utilidades

## 🔗 Enlaces Rápidos

- **Probar configuración SMTP**: `npm run test:smtp`
- **Ver reporte HTML**: `npm run test:report`
- **Ver todos los comandos**: Ver `commands/COMANDOS-NPM.txt`

## 📖 Documentación Adicional

### Pruebas Common
- `tests/common/README.md` - Documentación general de pruebas Common
- `tests/common/HOME.md` - Documentación de pruebas de home
- `tests/common/RUTAS-CATEGORIAS.md` - Documentación de pruebas de rutas
- `tests/common/SCREENSHOTS.md` - Documentación de pruebas de screenshots

---

**Última actualización**: Diciembre 2024
