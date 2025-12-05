# 📋 Reorganización del Proyecto

Este documento describe la reorganización de la estructura de archivos del proyecto realizada en Diciembre 2024.

## 🎯 Objetivo

Reorganizar los archivos del proyecto para mejorar la navegación, mantener una estructura clara y facilitar el mantenimiento futuro.

## 📁 Nueva Estructura

### Antes
```
/
├── COMANDOS-NPM.txt (raíz)
├── REPORTE*.md (raíz - múltiples archivos)
├── docs/
│   ├── CONFIGURAR-SMTP.md
│   ├── SCRIPTS.md
│   └── COMANDOS-*.md
└── tests/
    ├── utils/*.md (documentación mezclada con código)
    └── provider/DOCUMENTACION_*.md
```

### Después
```
/
├── README.md (nuevo - documentación principal)
├── docs/
│   ├── README.md (índice de documentación)
│   ├── guides/                  # Guías de configuración
│   │   ├── CONFIGURAR-SMTP.md
│   │   └── SCRIPTS.md
│   ├── commands/                # Comandos de pruebas
│   │   ├── COMANDOS-NPM.txt
│   │   ├── COMANDOS-PRUEBAS-CLIENTE.md
│   │   └── COMANDOS-PRUEBAS-PROMOCIONES.md
│   ├── reports/                 # Reportes de pruebas
│   │   ├── REPORTE_FINAL_PRUEBAS.md
│   │   ├── REPORTE-PRUEBAS-*.md
│   │   └── REPORTE-QA-AUTO-*.md
│   └── utils-docs/              # Documentación de utilidades
│       ├── GMAIL_SETUP.md
│       └── ... (otros docs de utils)
└── tests/
    └── (solo código, sin documentación)
```

## 📝 Cambios Realizados

### 1. Archivos Movidos

#### De raíz a `docs/commands/`
- `COMANDOS-NPM.txt`

#### De `docs/` a `docs/guides/`
- `CONFIGURAR-SMTP.md`
- `SCRIPTS.md`

#### De `docs/` a `docs/commands/`
- `COMANDOS-PRUEBAS-CLIENTE.md`
- `COMANDOS-PRUEBAS-PROMOCIONES.md`

#### De raíz a `docs/reports/`
- `REPORTE_FINAL_PRUEBAS.md`
- `REPORTE-PRUEBAS-HOME.md`
- `REPORTE-PRUEBA-DASHBOARD-CLIENTE.md`
- `REPORTE-PRUEBA-CLIENTE-EVENTOS.md`
- `REPORTE-PRUEBAS-PROMOCIONES.md`
- `REPORTE-PRUEBAS-SERVICIOS.md`
- `REPORTE-QA-AUTO-CLIENTE-*.md` (múltiples archivos)
- `COMPARACION-VALIDACIONES-EVENTOS.md`

#### De `tests/utils/` a `docs/utils-docs/`
- `GMAIL_SETUP.md`
- `GMAIL_TROUBLESHOOTING.md`
- `REPORTE_SOLUCION_GMAIL.md`
- `SOLUCION_CONTRASEÑA.md`
- `VERIFICAR_CONTRASEÑA_APLICACION.md`
- `VERIFICAR_IMAP.md`

#### De `tests/provider/` a `docs/reports/`
- `DOCUMENTACION_REGISTRO_PROVEEDOR.md`

### 2. Archivos Creados

- `README.md` (raíz) - Documentación principal del proyecto
- `docs/README.md` - Índice de documentación actualizado
- `docs/REORGANIZACION.md` - Este archivo

### 3. Referencias Actualizadas

#### Enlaces corregidos en:
- `docs/guides/SCRIPTS.md` - Referencia a CONFIGURAR-SMTP.md
- `docs/reports/REPORTE-QA-AUTO-CLIENTE-PERFIL-CONFIGURACION.md`
- `docs/reports/REPORTE-QA-AUTO-CLIENTE-FIESTACHAT-NOTIFICACIONES.md`
- `docs/reports/REPORTE-QA-AUTO-CLIENTE-BUSQUEDA-CONTRATACION-SERVICIOS.md`
- `docs/reports/REPORTE-QA-AUTO-CLIENTE-DASHBOARD.md`
- `docs/reports/REPORTE-PRUEBA-CLIENTE-EVENTOS.md`

### 4. `.gitignore` Actualizado

- Limpiado duplicados
- Agregadas reglas para archivos de prueba (imágenes y documentos)
- Mantenidas exclusiones para snapshots y archivos de prueba necesarios

## ✅ Verificación

### Rutas Actualizadas Correctamente
- ✅ Todos los enlaces en documentos apuntan a las nuevas ubicaciones
- ✅ Referencias relativas corregidas
- ✅ `.gitignore` actualizado sin duplicados

### Estructura Verificada
- ✅ Todas las carpetas creadas correctamente
- ✅ Archivos movidos a sus nuevas ubicaciones
- ✅ Documentación principal creada

## 📚 Beneficios

1. **Organización Clara**: Cada tipo de archivo tiene su lugar específico
2. **Navegación Fácil**: Estructura intuitiva y lógica
3. **Mantenimiento Simplificado**: Fácil encontrar y actualizar documentos
4. **Escalabilidad**: Estructura preparada para crecer
5. **Raíz Limpia**: Solo archivos esenciales en la raíz del proyecto

## 🔄 Migración

Si tienes referencias hardcodeadas a las rutas antiguas, actualízalas:

### Antes → Después

```
COMANDOS-NPM.txt → docs/commands/COMANDOS-NPM.txt
docs/CONFIGURAR-SMTP.md → docs/guides/CONFIGURAR-SMTP.md
docs/SCRIPTS.md → docs/guides/SCRIPTS.md
REPORTE*.md → docs/reports/REPORTE*.md
tests/utils/*.md → docs/utils-docs/*.md
```

## 📅 Fecha de Reorganización

Diciembre 2024

---

**Nota**: Esta reorganización no afecta el código de las pruebas, solo la organización de la documentación y reportes.

