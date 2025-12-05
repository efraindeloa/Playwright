# 🧪 Comandos para Ejecutar Pruebas de Cliente

Este documento contiene los comandos para ejecutar cada prueba individual de los archivos de cliente usando Chrome (headed).

## 📋 Pruebas Disponibles

### 📁 Dashboard (`tests/client/dashboard.spec.ts`)

#### 1. Se muestran todas las secciones principales del dashboard
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todas las secciones principales del dashboard" --project=chrome
```

#### 2. Se muestran todos los elementos de la barra superior
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todos los elementos de la barra superior" --project=chrome
```

#### 3. Se muestran conversaciones en la sección Fiestachat (navegación)
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran conversaciones en la sección Fiestachat \\(navegación\\)" --project=chrome
```

#### 4. Navega a Chats, Favoritos y Perfil desde la barra superior
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Navega a Chats, Favoritos y Perfil desde la barra superior" --project=chrome
```

#### 5. Se muestran todos los elementos de la sección Fiestachat (desktop)
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todos los elementos de la sección Fiestachat \\(desktop\\)" --project=chrome
```

#### 6. Se muestran todos los elementos de la sección Fiestachat (completo)
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todos los elementos de la sección Fiestachat \\(completo\\)" --project=chrome
```

#### 7. Navega a la página de cotización al hacer clic en una notificación
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Navega a la página de cotización al hacer clic en una notificación" --project=chrome
```

#### 8. Se muestran las fiestas del cliente en la sección de eventos
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran las fiestas del cliente en la sección de eventos" --project=chrome
```

#### 9. Se muestran todos los elementos de la sección Elige Tu Fiesta
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todos los elementos de la sección Elige Tu Fiesta" --project=chrome
```

#### 10. Se muestran todos los elementos de la sección de servicios
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todos los elementos de la sección de servicios" --project=chrome
```

#### 11. Se muestra el botón Agregar Servicios y se prueba su funcionalidad
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestra el botón Agregar Servicios y se prueba su funcionalidad" --project=chrome
```

#### 12. Los servicios se ordenan correctamente
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Los servicios se ordenan correctamente" --project=chrome
```

#### 13. Los filtros de servicios se aplican correctamente
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Los filtros de servicios se aplican correctamente" --project=chrome
```

#### 14. Se muestran todos los elementos del calendario en vista desktop
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todos los elementos del calendario en vista desktop" --project=chrome
```

#### 15. Crear una nueva fiesta desde el dashboard
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Crear una nueva fiesta desde el dashboard" --project=chrome
```

### 📁 Cotización (`tests/client/cotizacion.spec.ts`)

#### 15. Validar que se muestran todos los elementos de una cotización
```bash
npx playwright test tests/client/cotizacion.spec.ts -g "Validar que se muestran todos los elementos de una cotización" --project=chrome
```

#### 16. Interactuar Con Elementos De Una Cotización No Cancelada
```bash
npx playwright test tests/client/cotizacion.spec.ts -g "Interactuar Con Elementos De Una Cotización No Cancelada" --project=chrome
```

#### 17. Cancelar Una Negociación
```bash
npx playwright test tests/client/cotizacion.spec.ts -g "Cancelar Una Negociación" --project=chrome
```

#### 18. Agregar Una Nota
```bash
npx playwright test tests/client/cotizacion.spec.ts -g "Agregar Una Nota" --project=chrome
```

#### 19. Probar Funcionalidad Completa Del Chat
```bash
npx playwright test tests/client/cotizacion.spec.ts -g "Probar Funcionalidad Completa Del Chat" --project=chrome
```

#### 20. Mostrar Datos De La Cotización Que Coinciden Con La Notificación Seleccionada
```bash
npx playwright test tests/client/cotizacion.spec.ts -g "Mostrar Datos De La Cotización Que Coinciden Con La Notificación Seleccionada" --project=chrome
```

#### 21. Se deshabilita la interacción cuando un evento está cancelado
```bash
npx playwright test tests/client/cotizacion.spec.ts -g "Se deshabilita la interacción cuando un evento está cancelado" --project=chrome
```

### 📁 Perfil (`tests/client/perfil.spec.ts`)

#### 22. Se muestran todos los elementos de la página de perfil
```bash
npx playwright test tests/client/perfil.spec.ts -g "Se muestran todos los elementos de la página de perfil" --project=chrome
```

#### 23. Se pueden editar los datos personales
```bash
npx playwright test tests/client/perfil.spec.ts -g "Se pueden editar los datos personales" --project=chrome
```

#### 24. Se actualiza la foto de perfil
```bash
npx playwright test tests/client/perfil.spec.ts -g "Se actualiza la foto de perfil" --project=chrome
```

#### 25. Se puede eliminar la foto de perfil
```bash
npx playwright test tests/client/perfil.spec.ts -g "Se puede eliminar la foto de perfil" --project=chrome
```

#### 26. Se puede cambiar la contraseña
```bash
npx playwright test tests/client/perfil.spec.ts -g "Se puede cambiar la contraseña" --project=chrome
```

### 📁 Eventos (`tests/client/cliente-eventos.spec.ts`)

#### 27. Nueva fiesta
```bash
npx playwright test tests/client/cliente-eventos.spec.ts -g "Nueva fiesta" --project=chrome
```

#### 28. Crear eventos (Bloques dinámicos)
```bash
npx playwright test tests/client/cliente-eventos.spec.ts -g "Crear eventos" --project=chrome
```

## 🚀 Ejecutar Todas las Pruebas

### Todas las pruebas de Dashboard
```bash
npx playwright test tests/client/dashboard.spec.ts --project=chrome
```

### Todas las pruebas de Cotización
```bash
npx playwright test tests/client/cotizacion.spec.ts --project=chrome
```

### Todas las pruebas de Perfil
```bash
npx playwright test tests/client/perfil.spec.ts --project=chrome
```

### Todas las pruebas de Eventos
```bash
npx playwright test tests/client/cliente-eventos.spec.ts --project=chrome
```

### Todas las pruebas de Cliente
```bash
npx playwright test tests/client/ --project=chrome
```

## 🔧 Opciones Adicionales

### Ejecutar en modo headless (sin abrir navegador)
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todas las secciones principales del dashboard" --project=chromium
```

### Ejecutar con UI de Playwright
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todas las secciones principales del dashboard" --ui
```

### Ejecutar en modo debug
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todas las secciones principales del dashboard" --debug
```

### Ejecutar con headed (ver navegador)
```bash
npx playwright test tests/client/dashboard.spec.ts -g "Se muestran todas las secciones principales del dashboard" --project=chromium-headed
```

## 📝 Notas

- `--project=chrome`: Ejecuta en Chrome real del sistema (headed)
- `--project=chromium`: Ejecuta en Chromium (headless por defecto)
- `--project=chromium-headed`: Ejecuta en Chromium con navegador visible
- `-g`: Filtra pruebas por nombre (grep)
- `--ui`: Abre la interfaz gráfica de Playwright
- `--debug`: Abre el inspector de Playwright

## 🔗 Ver Reporte HTML

Después de ejecutar las pruebas, puedes ver el reporte HTML con:

```bash
npx playwright show-report
```

---

**Última actualización**: Diciembre 2024

