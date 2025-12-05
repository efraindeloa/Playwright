# Reporte Formal de Pruebas - Página Principal (Home)

## Información General

**Proyecto:** Fiestamas - Plataforma de Gestión de Eventos  
**Módulo:** Página de inicio (Home)  
**Archivo de Pruebas:** `tests/home.spec.ts`  
**Ambiente de Pruebas:** Staging (`https://staging.fiestamas.com`)  
**Framework de Pruebas:** Playwright Test  
**Fecha de Generación:** 2025  
**Versión del Reporte:** 1.0  
**Última Actualización:** Validación extendida de categorías y subcategorías

---

## Resumen Ejecutivo

El archivo `home.spec.ts` automatiza la validación integral de la página principal de Fiestamas. La prueba confirma que los elementos clave del home (hero banner, slider principal y catálogo de categorías) se muestran correctamente, que los CTA navegan a las rutas esperadas y que las jerarquías de categorías, subcategorías y sub-subcategorías coinciden con lo publicado en el sitio.

### Cobertura Principal

- Hero banner y CTA inicial
- Slider promocional con llamadas a la acción hacia registro y login
- Catálogo completo de 10 categorías con sus subcategorías
- Validación profunda de las subcategorías anidadas de "After Party" y "Snacks Botanas"
- Validación fija de la lista de "Servicios Especializados"

---

## Configuración del Entorno de Pruebas

### Configuración Técnica

```typescript
- Framework: Playwright Test
- Timeout de test: 120000 ms
- Navegador: Chromium (por defecto)
- Viewport: configuración por defecto de Playwright
- Modo: Headless/Headed configurable vía CLI
```

### URLs Dinámicas

- `HOME_BASE_URL` (por defecto `https://staging.fiestamas.com`)
- Construcción dinámica de URLs para `home`, `register` y `login`
- La prueba permite apuntar a otros ambientes modificando `HOME_BASE_URL`

### Datos y Constantes

El archivo define:

- **`categorias`**: objeto maestro con todas las categorías y subcategorías esperadas.
- **`serviciosEspecializados`**: lista fija de 17 opciones publicada en el ambiente de pruebas.
- **`nested`**: mapa con sub-subcategorías esperadas para "After Party" y "Snacks Botanas".
- Helpers reutilizables para navegación (`gotoHome`), clic genérico (`clickButton`), espera (`wait`) y validación de listas (`validateList`).

---

## Caso de Prueba Detallado

### TC-HOME-001 – Validación integral del Home

**Prioridad:** Crítica  
**Timeout:** 120 segundos  
**Descripción:** Verificar que la página principal despliegue correctamente el hero, el slider, los CTA y la estructura completa de categorías.

#### Precondiciones
- Sitio disponible en el ambiente configurado (`HOME_BASE_URL`).
- Usuario anónimo (la página no requiere autenticación).

#### Pasos Principales
1. **Hero y CTA:** Verificar que el hero banner sea visible y que el CTA "Empieza ya" redirija a la ruta de registro.
2. **Slider promocional:** Recorrer los dos slides con CTA a login y validar redirecciones correctas.
3. **Catálogo de categorías:**
   - Confirmar que existan 10 categorías.
   - Recorrer cada categoría, validar sus subcategorías.
   - Para "Alimentos" realizar validaciones adicionales:
     - Abrir "After Party" y confirmar sub-subcategorías (`Hamburguesas`, `Taquizas`, `Chilaquiles`).
     - Abrir "Snacks Botanas" y confirmar sub-subcategorías (`Hamburguesas`, `Pizzas`, `Tortas`, `Frutas y/o Verduras`, `Helados`, `Frituras`, `Cafés`).
4. **Servicios Especializados:** Validar 17 subcategorías publicadas en el catálogo.

#### Validaciones Clave
- Hero y botones visibles con timeout extendido (10 s).
- Redirecciones precisas a `/register?role=PRVD` y `/login`.
- Conteo exacto de categorías: `await expect(buttons).toHaveCount(10)`.
- Conteo y nombres de subcategorías mediante `validateList` (espera hasta 15 s).
- Navegación por UI para subcategorías anidadas (sin uso de URLs directas).
- Restablecimiento del estado navegando al home entre iteraciones.

#### Datos Esperados
- Todas las etiquetas deben coincidir exactamente (sin tolerancia a dobles espacios).
- Todas las subcategorías de "Servicios Especializados" deben estar presentes (17 elementos publicados en staging).

---

## Técnicas de Validación

- **Asserts de visibilidad:** `expect(locator).toBeVisible()` con timeouts personalizados.
- **Validación de URLs:** `expect(page).toHaveURL(expectedUrl)` después de cada CTA.
- **Conteo exacto:** `expect(locator).toHaveCount(n)` para categorías y subcategorías.
- **Comparación estricta de texto:** Se usa `normalize()` (trim) evitando normalización de espacios internos.
- **Navegación controlada:** Uso de helpers para reproducir clics reales en la interfaz, sin rutas profundas.

---

## Recomendaciones y Próximos Pasos

1. **Cobertura móvil:** Replicar validaciones en la versión mobile (`fiestamas-mobile.spec.ts`) aprovechando la misma estructura de datos.
2. **Pruebas visuales opcionales:** Incorporar capturas del hero/slider para detectar cambios visuales relevantes.
3. **Alertas de contenido:** Integrar notificaciones cuando falte alguna subcategoría crítica (ej. cambios en catálogo).

---

## Historial de Cambios

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2025 | Creación del reporte formal para `home.spec.ts` (validación extendida de categorías y subcategorías anidadas). |
