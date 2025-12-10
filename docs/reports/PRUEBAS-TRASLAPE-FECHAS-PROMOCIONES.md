# Pruebas de Validación de Traslape de Fechas en Promociones

## Fecha: Diciembre 2025

### Objetivo
Validar que el sistema impide la creación de promociones con fechas que se traslapan para el mismo servicio, y permite crear múltiples promociones cuando las fechas NO se traslapan.

---

## Reglas de Negocio Validadas

1. ✅ **Cada servicio solo puede tener una promoción activa por rango de fechas**
2. ✅ **Es posible crear múltiples promociones para un mismo servicio siempre que sus periodos NO se traslapen**
3. ✅ **Si las fechas se traslapan, el sistema debe impedir la creación automáticamente**

---

## Pruebas Agregadas

### 1. ✅ Validar que no se puede crear promoción con fechas que se traslapan con una existente

**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~2200)

**Descripción**: 
- Crea una primera promoción con fechas específicas (día actual hasta 30 días después)
- Intenta crear una segunda promoción con el mismo servicio pero fechas que se traslapan (empiezan 15 días después, dentro del rango de la primera)
- Valida que el sistema impide la creación y muestra un error de traslape

**Cobertura**:
- ✅ Creación de promoción base
- ✅ Intento de crear promoción con fechas traslapadas
- ✅ Validación de mensaje de error de traslape
- ✅ Verificación de que la promoción NO se creó

---

### 2. ✅ Validar que se pueden crear múltiples promociones con el mismo servicio si las fechas NO se traslapan

**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~2350)

**Descripción**:
- Crea una primera promoción para días 1-15 del mes
- Crea una segunda promoción para días 16-30 del mes (mismo servicio, fechas NO traslapadas)
- Valida que ambas promociones se crean exitosamente y aparecen en la lista

**Cobertura**:
- ✅ Creación de primera promoción (Mes 1: días 1-15)
- ✅ Creación de segunda promoción (Mes 2: días 16-30)
- ✅ Validación de que ambas promociones existen en la lista
- ✅ Verificación de que NO aparece error de traslape

**Ejemplo de fechas**:
- Promoción 1: 01-12-2025 a 15-12-2025
- Promoción 2: 16-12-2025 a 30-12-2025
- ✅ NO se traslapan → Ambas se crean exitosamente

---

### 3. ✅ Validar diferentes escenarios de traslape de fechas

**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~2450)

**Descripción**:
Prueba múltiples escenarios de traslape para validar que el sistema detecta correctamente todos los casos:

1. **Traslape completo (nueva dentro de base)**
   - Nueva promoción está completamente dentro del rango de la base
   - ✅ Debe fallar

2. **Traslape parcial inicio (nueva empieza antes, termina dentro)**
   - Nueva promoción empieza antes de la base pero termina dentro
   - ✅ Debe fallar

3. **Traslape parcial fin (nueva empieza dentro, termina después)**
   - Nueva promoción empieza dentro de la base pero termina después
   - ✅ Debe fallar

4. **Traslape completo (nueva contiene a base)**
   - Nueva promoción contiene completamente a la base
   - ✅ Debe fallar

**Cobertura**:
- ✅ Creación de promoción base
- ✅ Prueba de 4 escenarios diferentes de traslape
- ✅ Validación de error en cada escenario
- ✅ Verificación de que ninguna promoción traslapada se crea

---

## Funciones Helper Agregadas

### `crearPromocionCompleta()`
**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~2118)

**Propósito**: Helper reutilizable para crear una promoción completa con todos los campos.

**Parámetros**:
- `page: Page` - Página de Playwright
- `titulo: string` - Título de la promoción
- `fechaInicio: string` - Fecha de inicio (formato DD-MM-YYYY)
- `fechaFin: string` - Fecha de fin (formato DD-MM-YYYY)
- `servicioIndex: number` - Índice del servicio a seleccionar (default: 0)
- `descripcion?: string` - Descripción (opcional)
- `ofertaCorta?: string` - Oferta corta (opcional)

**Retorna**: `Promise<boolean>` - `true` si se creó exitosamente, `false` si falló

---

### `verificarErrorTraslape()`
**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~2190)

**Propósito**: Busca y detecta mensajes de error relacionados con traslape de fechas.

**Retorna**: `Promise<{ encontrado: boolean; mensaje?: string }>`

**Mensajes de error buscados**:
- "ya existe promoción activa"
- "fechas traslapan"
- "fechas se superponen"
- "período ya existe"
- "promoción activa mismo servicio"
- "rango fechas ocupado"
- "ya tiene promoción activa"
- "traslape"
- "superposición"

**Lugares donde busca**:
- Modales (`div[role="dialog"]`, `div[class*="modal"]`)
- Toasts/Notificaciones (`div[class*="toast"]`, `div[class*="notification"]`)
- Cualquier texto visible en la página

---

### `cerrarModalError()`
**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~2250)

**Propósito**: Cierra cualquier modal o mensaje de error que pueda estar abierto.

**Métodos**:
1. Presiona `Escape`
2. Busca y hace clic en botones de cerrar (X, "Cerrar", "OK")

---

## Ejemplos de Uso

### Ejemplo 1: Crear promoción y validar traslape
```typescript
// Crear primera promoción
const exito1 = await crearPromocionCompleta(
  page, 
  'Promo Base', 
  '01-12-2025', 
  '30-12-2025'
);

// Intentar crear segunda con fechas traslapadas
const exito2 = await crearPromocionCompleta(
  page, 
  'Promo Traslapada', 
  '15-12-2025',  // Se traslapa con la primera
  '10-01-2026'
);

// Validar error
const error = await verificarErrorTraslape(page);
expect(error.encontrado).toBe(true);
```

### Ejemplo 2: Crear múltiples promociones sin traslape
```typescript
// Promoción 1: Primera quincena
await crearPromocionCompleta(
  page, 
  'Promo Mes 1', 
  '01-12-2025', 
  '15-12-2025'
);

// Promoción 2: Segunda quincena (NO se traslapan)
await crearPromocionCompleta(
  page, 
  'Promo Mes 2', 
  '16-12-2025',  // Empieza después de que termina la primera
  '31-12-2025'
);

// Ambas deben crearse exitosamente
```

---

## Casos de Traslape Validados

### ✅ Caso 1: Traslape completo (nueva dentro)
```
Base:     [==========]
Nueva:       [====]
Resultado: ❌ ERROR
```

### ✅ Caso 2: Traslape parcial inicio
```
Base:     [==========]
Nueva:  [====]
Resultado: ❌ ERROR
```

### ✅ Caso 3: Traslape parcial fin
```
Base:     [==========]
Nueva:           [====]
Resultado: ❌ ERROR
```

### ✅ Caso 4: Nueva contiene a base
```
Base:       [====]
Nueva:    [==========]
Resultado: ❌ ERROR
```

### ✅ Caso 5: NO traslape (permitido)
```
Base:     [====]
Nueva:            [====]
Resultado: ✅ ÉXITO
```

---

## Validaciones Realizadas

1. ✅ **Detección de traslape**: El sistema detecta correctamente cuando las fechas se traslapan
2. ✅ **Mensaje de error**: Se muestra un mensaje de error apropiado
3. ✅ **Prevención de creación**: La promoción NO se crea cuando hay traslape
4. ✅ **Permitir no traslape**: Las promociones se crean exitosamente cuando NO hay traslape
5. ✅ **Múltiples escenarios**: Se validan diferentes tipos de traslape (completo, parcial, etc.)

---

## Notas Técnicas

- Las pruebas se ejecutan en modo serial (`test.describe.configure({ mode: 'serial' })`)
- Se esperan 5 segundos después de cada prueba para evitar problemas de estado compartido
- Las fechas se formatean como `DD-MM-YYYY` para usar con `pickDateSmart()`
- Los títulos de promociones incluyen timestamp para evitar duplicados
- Se manejan errores gracefully para no fallar toda la suite si una promoción no se puede crear

---

## Ejecución

Para ejecutar todas las pruebas de traslape:
```bash
npm run test:proveedor:promociones
```

Para ejecutar una prueba específica:
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Validar que no se puede crear promoción con fechas que se traslapan"
```

---

## Resultados Esperados

- ✅ **Prueba 1**: Debe fallar al intentar crear promoción con fechas traslapadas
- ✅ **Prueba 2**: Debe crear exitosamente ambas promociones sin traslape
- ✅ **Prueba 3**: Debe fallar en los 4 escenarios de traslape probados

---

## Mejoras Futuras

- [ ] Agregar validación de traslape en edición de promociones (no solo creación)
- [ ] Validar que se puede editar una promoción sin cambiar las fechas (mismo rango)
- [ ] Probar con diferentes servicios (cada servicio debe tener su propia validación)
- [ ] Validar mensajes de error específicos por tipo de traslape

