# Documentación de Pruebas - rutas-categorias.spec.ts

## 📋 Descripción

Pruebas que validan la estructura, navegación y funcionalidad de las rutas de categorías de Fiestamas, incluyendo familias, categorías y subcategorías.

## 🎯 Objetivo

Asegurar que todas las rutas de categorías tienen la estructura correcta, son navegables y funcionan como se espera.

## 📄 Archivo

`tests/common/rutas-categorias.spec.ts`

---

## 🏗️ Estructura de Categorías

Las categorías en Fiestamas están organizadas en una jerarquía de tres niveles:

1. **Familia** (`/c/[familia-slug]`) - Nivel superior
   - Ejemplo: `/c/alimentos`

2. **Categoría** (`/c/[familia-slug]-[categoria-slug]`) - Nivel medio
   - Ejemplo: `/c/alimentos-after-party`

3. **Sub-categoría** (`/c/[subcategoria-slug]`) - Nivel inferior
   - Ejemplo: `/c/hamburguesas`

---

## 🧪 Pruebas Incluidas

### Grupo 1: Validar estructura de rutas de Familia

#### 1.1. Validar estructura de la ruta de Familia (/c/alimentos)

**Línea**: `295`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que la familia "Alimentos" tiene la estructura correcta.

**URL**: `/c/alimentos`

**Elementos validados**:
- ✅ Título "Categorías" visible
- ✅ Breadcrumb/Tag "Alimentos" visible
- ✅ Instrucción: "Selecciona la categoría de Alimentos"
- ✅ Enlace "Ver todos los servicios"
- ✅ Categorías esperadas visibles:
  - After Party
  - Desayunos
  - Comidas
  - Postres
  - Y más...

---

#### 1.2. Validar estructura de la ruta de Familia (/c/decoracion)

**Línea**: `376`  
**Timeout**: 60 segundos

**URL**: `/c/decoracion`

**Elementos validados**: Similar a Alimentos, con categorías de Decoración.

---

#### 1.3. Validar estructura de la ruta de Familia (/c/entretenimiento)

**Línea**: `396`  
**Timeout**: 60 segundos

**URL**: `/c/entretenimiento`

**Elementos validados**: Similar a Alimentos, con categorías de Entretenimiento.

---

#### 1.4. Validar estructura de la ruta de Familia (/c/lugares)

**Línea**: `430`  
**Timeout**: 60 segundos

**URL**: `/c/lugares`

**Elementos validados**: Similar a Alimentos, con categorías de Lugares.

---

#### 1.5. Validar estructura de la ruta de Familia (/c/bebidas)

**Línea**: `456`  
**Timeout**: 60 segundos

**URL**: `/c/bebidas`

**Elementos validados**: Similar a Alimentos, con categorías de Bebidas.

---

#### 1.6. Validar estructura de la ruta de Familia (/c/musica)

**Línea**: `474`  
**Timeout**: 60 segundos

**URL**: `/c/musica`

**Elementos validados**: Similar a Alimentos, con categorías de Música.

---

#### 1.7. Validar estructura de la ruta de Familia (/c/mesa-de-regalos)

**Línea**: `506`  
**Timeout**: 60 segundos

**URL**: `/c/mesa-de-regalos`

**Elementos validados**: Similar a Alimentos, con categorías de Mesa de Regalos.

---

#### 1.8. Validar estructura de la ruta de Familia (/c/servicios-especializados)

**Línea**: `519`  
**Timeout**: 60 segundos

**URL**: `/c/servicios-especializados`

**Elementos validados**: Similar a Alimentos, con categorías de Servicios Especializados.

---

### Grupo 2: Validar estructura de rutas de Categoría

#### 2.1. Validar estructura de la ruta de Categoría (/c/alimentos-after-party)

**Línea**: `548`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que la categoría "After Party" dentro de "Alimentos" tiene la estructura correcta.

**URL**: `/c/alimentos-after-party`

**Elementos validados**:
- ✅ Título con el nombre de la categoría
- ✅ Breadcrumb con "Alimentos" y "After Party"
- ✅ Instrucción principal
- ✅ Subcategorías esperadas visibles
- ✅ Enlace "Ver todos los servicios"

**Subcategorías esperadas**:
- Hamburguesas
- Tacos
- Pizza
- Y más...

---

### Grupo 3: Navegación entre niveles

#### 3.1. Navegar desde Familia a Categoría (/c/alimentos -> /c/alimentos-after-party)

**Línea**: `649`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que la navegación desde una familia a una categoría funciona correctamente.

**Proceso**:
1. Navegar a `/c/alimentos`
2. Encontrar la categoría "After Party"
3. Hacer clic en la categoría
4. Verificar que se navega a `/c/alimentos-after-party`
5. Verificar que la página carga correctamente

**Validaciones**:
- ✅ URL cambia a la categoría
- ✅ Página de categoría carga correctamente
- ✅ Breadcrumb muestra la jerarquía correcta

---

#### 3.2. Navegar desde Categoría a Sub-categoría (/c/alimentos-after-party -> servicios)

**Línea**: `691`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que la navegación desde una categoría a una subcategoría funciona correctamente.

**Proceso**:
1. Navegar a `/c/alimentos-after-party`
2. Encontrar una subcategoría (ej: servicios de hamburguesas)
3. Hacer clic en la subcategoría
4. Verificar que se navega correctamente
5. Verificar que la página carga correctamente

**Validaciones**:
- ✅ Navegación funciona correctamente
- ✅ Página de subcategoría carga correctamente
- ✅ Contenido de la subcategoría visible

---

#### 3.3. Navegar usando breadcrumb desde Sub-categoría a Categoría

**Línea**: `734`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que los breadcrumbs permiten navegar hacia atrás en la jerarquía.

**Proceso**:
1. Navegar a una subcategoría
2. Encontrar el breadcrumb de la categoría padre
3. Hacer clic en el breadcrumb
4. Verificar que se navega a la categoría padre
5. Verificar que la URL es correcta

**Validaciones**:
- ✅ Breadcrumb es clicable
- ✅ Navegación hacia atrás funciona
- ✅ URL correcta después de la navegación
- ✅ Backdrop no bloquea el clic (usa `waitForBackdropToDisappear()`)

**Notas**:
- Se manejan tanto elementos `<a>` como `<button>` en breadcrumbs
- Se usa JavaScript click como fallback si el clic normal falla

---

#### 3.4. Navegar usando breadcrumb desde Categoría a Familia

**Línea**: `872`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que los breadcrumbs permiten navegar desde una categoría a su familia padre.

**Proceso**:
1. Navegar a una categoría (ej: `/c/alimentos-after-party`)
2. Encontrar el breadcrumb de la familia padre (Alimentos)
3. Hacer clic en el breadcrumb
4. Verificar que se navega a la familia
5. Verificar que la URL es correcta

**Validaciones**:
- ✅ Breadcrumb es clicable
- ✅ Navegación hacia atrás funciona
- ✅ URL correcta después de la navegación
- ✅ Página de familia carga correctamente

---

### Grupo 4: Validar funcionalidad de búsqueda

#### 4.1. Validar funcionalidad de búsqueda en Sub-categoría (servicios de hamburguesas)

**Línea**: `911`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que la búsqueda dentro de una subcategoría funciona correctamente.

**Proceso**:
1. Navegar a una subcategoría con servicios (ej: `/c/hamburguesas`)
2. Encontrar el campo de búsqueda
3. Escribir un término de búsqueda
4. Verificar que los resultados se filtran
5. Limpiar la búsqueda
6. Verificar que los resultados se restauran

**Validaciones**:
- ✅ Campo de búsqueda visible y funcional
- ✅ Búsqueda filtra resultados correctamente
- ✅ Resultados relevantes al término buscado
- ✅ Limpieza de búsqueda restaura resultados originales

**Selectores utilizados**:
- Campo de búsqueda: `input[placeholder*="Buscar" i], input[type="search"]`
- Botón de búsqueda: `button:has(i.icon-search), button[type="submit"]`

---

### Grupo 5: Validar accesibilidad de rutas

#### 5.1. Validar que todas las rutas de familias principales son accesibles

**Línea**: `1097`  
**Timeout**: 60 segundos

**Objetivo**: Verificar que todas las rutas de familias principales responden correctamente.

**Familias validadas**:
- `/c/alimentos`
- `/c/decoracion`
- `/c/entretenimiento`
- `/c/lugares`
- `/c/bebidas`
- `/c/musica`
- `/c/mesa-de-regalos`
- `/c/servicios-especializados`

**Validaciones**:
- ✅ Todas las URLs responden correctamente
- ✅ No hay errores 404
- ✅ Las páginas cargan correctamente
- ✅ Status code 200 o redirección válida

---

## 🛠️ Funciones Helper

### `validarEstructuraFamilia(page, familiaSlug, familiaNombre, categoriasEsperadas)`

Valida la estructura completa de una página de familia de categorías.

**Parámetros**:
- `page`: Instancia de Page de Playwright
- `familiaSlug`: Slug de la familia (ej: "alimentos")
- `familiaNombre`: Nombre legible de la familia (ej: "Alimentos")
- `categoriasEsperadas`: Array con nombres de categorías esperadas

**Retorna**: 
```typescript
{
  categoriasEncontradas: number,
  countCategorias: number
}
```

**Elementos validados**:
- Título "Categorías"
- Breadcrumb/Tag con el nombre de la familia
- Instrucción principal
- Enlace "Ver todos los servicios"
- Categorías esperadas

**Uso**:
```typescript
await validarEstructuraFamilia(
  page,
  'alimentos',
  'Alimentos',
  ['After Party', 'Desayunos', 'Comidas', 'Postres']
);
```

---

### `validarEstructuraCategoria(page, familiaSlug, familiaNombre, categoriaSlug, categoriaNombre, subcategoriasEsperadas)`

Valida la estructura completa de una página de categoría.

**Parámetros**:
- `page`: Instancia de Page de Playwright
- `familiaSlug`: Slug de la familia padre (ej: "alimentos")
- `familiaNombre`: Nombre de la familia padre (ej: "Alimentos")
- `categoriaSlug`: Slug de la categoría (ej: "after-party")
- `categoriaNombre`: Nombre legible de la categoría (ej: "After Party")
- `subcategoriasEsperadas`: Array con nombres de subcategorías esperadas

**Elementos validados**:
- Título con el nombre de la categoría
- Breadcrumb con familia y categoría
- Instrucción principal
- Subcategorías esperadas
- Enlace "Ver todos los servicios"

**Uso**:
```typescript
await validarEstructuraCategoria(
  page,
  'alimentos',
  'Alimentos',
  'after-party',
  'After Party',
  ['Hamburguesas', 'Tacos', 'Pizza']
);
```

---

## 🚀 Ejecución

### Ejecutar todas las pruebas de rutas-categorias
```bash
npx playwright test tests/common/rutas-categorias.spec.ts
```

### Ejecutar una prueba específica
```bash
# Por nombre
npx playwright test tests/common/rutas-categorias.spec.ts -g "Validar estructura de la ruta de Familia"

# Por número de línea
npx playwright test tests/common/rutas-categorias.spec.ts:295
```

### Ejecutar pruebas de una familia específica
```bash
npx playwright test tests/common/rutas-categorias.spec.ts -g "alimentos"
```

### Ejecutar en modo UI
```bash
npx playwright test tests/common/rutas-categorias.spec.ts --ui
```

---

## ⚙️ Configuración

### Variables de Entorno

- `HOME_BASE_URL`: URL base para las pruebas (por defecto: `DEFAULT_BASE_URL`)

### Timeouts

- **Timeout por defecto**: 60 segundos por prueba
- **Timeouts de elementos**: 5-10 segundos según el elemento

---

## 🔍 Debugging

### Problemas Comunes

#### 1. Backdrop bloqueando clics en breadcrumbs
**Solución**: 
- Las pruebas utilizan `waitForBackdropToDisappear()` antes de hacer clics
- Se presiona ESC si el backdrop no desaparece

#### 2. Breadcrumb no navega correctamente
**Solución**: 
- Se manejan tanto elementos `<a>` como `<button>`
- Se usa JavaScript click como fallback
- Se verifica el atributo `href` antes de hacer clic

#### 3. Campo de búsqueda no encontrado
**Solución**: 
- Se usan múltiples selectores alternativos
- Se busca en diferentes ubicaciones de la página
- Se espera a que el elemento esté visible

#### 4. Modal de registro bloqueando
**Solución**: 
- Se usa `closeRegistrationModal()` al inicio de las pruebas
- Se cierra el modal antes de interactuar con elementos

---

## 📝 Mantenimiento

### Agregar Nueva Familia

Para agregar validación de una nueva familia:

1. Agregar el slug y nombre de la familia
2. Definir las categorías esperadas
3. Crear una nueva prueba usando `validarEstructuraFamilia()`:

```typescript
test('Validar estructura de la ruta de Familia (/c/nueva-familia)', async ({ page }) => {
  test.setTimeout(60000);
  
  await validarEstructuraFamilia(
    page,
    'nueva-familia',
    'Nueva Familia',
    ['Categoría 1', 'Categoría 2', 'Categoría 3']
  );
});
```

### Agregar Nueva Categoría

Para agregar validación de una nueva categoría:

1. Agregar el slug y nombre de la categoría
2. Definir las subcategorías esperadas
3. Crear una nueva prueba usando `validarEstructuraCategoria()`:

```typescript
test('Validar estructura de la ruta de Categoría (/c/familia-nueva-categoria)', async ({ page }) => {
  test.setTimeout(60000);
  
  await validarEstructuraCategoria(
    page,
    'familia',
    'Familia',
    'nueva-categoria',
    'Nueva Categoría',
    ['Subcategoría 1', 'Subcategoría 2']
  );
});
```

### Actualizar Selectores

Si la estructura HTML cambia:

1. Actualizar selectores en las funciones helper
2. Actualizar selectores en las pruebas individuales
3. Probar en staging antes de producción
4. Verificar que todas las pruebas pasan

---

## 📚 Referencias

- [README.md](./README.md) - Documentación general de pruebas Common
- [HOME.md](./HOME.md) - Documentación de pruebas de home
- [Configuración del proyecto](../config.ts)
- [Utilidades comunes](../utils.ts)
- [Documentación de Playwright](https://playwright.dev/)

---

**Última actualización**: Diciembre 2024

