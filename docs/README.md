# 📚 Documentación del Proyecto

Esta carpeta contiene la documentación del sistema de pruebas automatizadas de Fiestamas.

## 📄 Documentos Disponibles

### [Configuración SMTP](./CONFIGURAR-SMTP.md)

Guía completa para configurar el envío de emails:
- Configuración para Gmail
- Configuración para Hotmail/Outlook
- Obtención de contraseñas de aplicación
- Pruebas de configuración

### [Scripts](./SCRIPTS.md)

Documentación de los scripts disponibles:
- `test-smtp.js` - Prueba de configuración SMTP

### [Reporte de Pruebas Automatizadas](./REPORTE-PRUEBAS-AUTOMATIZADAS.md)

Reporte y documentación adicional sobre las pruebas automatizadas.

### [Comandos de Pruebas de Promociones](./COMANDOS-PRUEBAS-PROMOCIONES.md)

Comandos para ejecutar cada prueba individual de promociones.

## 🔗 Enlaces Rápidos

- **Probar configuración SMTP**: `npm run test:smtp`
- **Ver reporte HTML**: `npm run test:report`

## 📁 Estructura de Documentación

```
docs/
├── README.md                      # Este archivo (índice)
├── CONFIGURAR-SMTP.md             # Guía de configuración SMTP
├── SCRIPTS.md                     # Documentación de scripts
└── REPORTE-PRUEBAS-AUTOMATIZADAS.md # Reporte de pruebas automatizadas

scripts/
└── test-smtp.js                  # Script de prueba SMTP

tests/common/
├── README.md                      # Documentación general de pruebas Common
├── HOME.md                        # Documentación de pruebas de home
├── RUTAS-CATEGORIAS.md            # Documentación de pruebas de rutas
└── SCREENSHOTS.md                 # Documentación de pruebas de screenshots
```

---

**Última actualización**: Diciembre 2024

