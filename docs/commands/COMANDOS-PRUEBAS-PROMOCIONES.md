# 🧪 Comandos para Ejecutar Pruebas de Promociones

Este documento contiene los comandos para ejecutar cada prueba individual del archivo `promotions.spec.ts` usando Chrome (headed).

## 📋 Pruebas Disponibles

### 1. Crear promoción
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Crear promoción" --project=chrome
```

### 2. Validar campos obligatorios vacíos
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Validar campos obligatorios vacíos" --project=chrome
```

### 3. Validar límite de caracteres en oferta corta
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Validar límite de caracteres en oferta corta" --project=chrome
```

### 4. Validar fecha de fin en el pasado
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Validar fecha de fin en el pasado" --project=chrome
```

### 5. Validar fecha inicio mayor que fecha fin
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Validar fecha inicio mayor que fecha fin" --project=chrome
```

### 6. Validar servicios no disponibles
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Validar servicios no disponibles" --project=chrome
```

### 7. Ordenar promociones
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Ordenar promociones" --project=chrome
```

### 8. Filtrar promociones
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Filtrar promociones" --project=chrome
```

### 9. Buscar promociones
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Buscar promociones" --project=chrome
```

### 10. Editar promoción
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Editar promoción" --project=chrome
```

### 11. Eliminar promoción
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Eliminar promoción" --project=chrome
```

### 12. Navegar a chats desde promociones
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Navegar a chats desde promociones" --project=chrome
```

### 13. Navegar a perfil desde promociones
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Navegar a perfil desde promociones" --project=chrome
```

### 14. Navegar a dashboard desde promociones
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Navegar a dashboard desde promociones" --project=chrome
```

## 🚀 Ejecutar Todas las Pruebas

Para ejecutar todas las pruebas de promociones:

```bash
npx playwright test tests/provider/promotions.spec.ts --project=chrome
```

## 🔧 Opciones Adicionales

### Ejecutar en modo headless (sin abrir navegador)
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Crear promoción" --project=chromium
```

### Ejecutar con UI de Playwright
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Crear promoción" --ui
```

### Ejecutar en modo debug
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Crear promoción" --debug
```

### Ejecutar con headed (ver navegador)
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Crear promoción" --project=chromium-headed
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

