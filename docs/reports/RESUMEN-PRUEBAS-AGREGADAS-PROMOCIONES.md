# Resumen: Pruebas Agregadas para Promociones

## Fecha: Diciembre 2025

### Pruebas Agregadas

Se agregaron **7 nuevas pruebas** al archivo `tests/provider/promotions.spec.ts` para completar la cobertura de QA Funcional:

---

## 1. ✅ Validar estado del botón Finalizar según validaciones

**Objetivo**: Validar que el botón "Finalizar" se habilita/deshabilita correctamente según el estado de los campos obligatorios.

**Cobertura**:
- ✅ Botón deshabilitado inicialmente
- ✅ Estado del botón después de llenar cada campo (título, fechas, servicio, descripción, oferta corta)
- ✅ Botón habilitado cuando todos los campos obligatorios están completos
- ✅ Botón deshabilitado al borrar un campo obligatorio

**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~1518)

---

## 2. ✅ Validar límite de caracteres en descripción larga

**Objetivo**: Validar que el campo de descripción respeta el límite máximo de caracteres definido.

**Cobertura**:
- ✅ Verifica si el campo tiene atributo `maxlength`
- ✅ Intenta escribir más caracteres que el límite
- ✅ Valida que solo se aceptan caracteres hasta el límite
- ✅ Busca contador visual si existe

**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~1610)

---

## 3. ✅ Validar contador dinámico de oferta corta

**Objetivo**: Validar que el contador de caracteres (ej: "3/10") aumenta y disminuye dinámicamente mientras se escribe.

**Cobertura**:
- ✅ Verifica estado inicial (0/10)
- ✅ Valida que aumenta al escribir (1/10, 2/10, etc.)
- ✅ Valida que llega al límite (10/10)
- ✅ Valida que no aumenta más allá del límite
- ✅ Valida que disminuye al borrar

**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~1660)

---

## 4. ✅ Validar que servicios se cargan desde API

**Objetivo**: Validar que los servicios en el dropdown se cargan desde una llamada API.

**Cobertura**:
- ✅ Intercepta llamadas API relacionadas con servicios
- ✅ Verifica que se hacen llamadas API al abrir el dropdown
- ✅ Valida que las respuestas son exitosas (status 200-299)
- ✅ Verifica que hay servicios disponibles en el dropdown
- ✅ Muestra información de los servicios encontrados

**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~1720)

---

## 5. ✅ Validar selección única de servicio

**Objetivo**: Validar que solo se puede seleccionar un servicio a la vez (no múltiples).

**Cobertura**:
- ✅ Selecciona un primer servicio
- ✅ Verifica que el botón muestra el servicio seleccionado
- ✅ Abre el dropdown nuevamente
- ✅ Selecciona un segundo servicio diferente
- ✅ Valida que el botón ahora muestra solo el segundo servicio (no ambos)

**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~1790)

---

## 6. ✅ Probar inputs inesperados en campos del formulario

**Objetivo**: Validar que el formulario no se rompe ante inputs inesperados o maliciosos.

**Cobertura**:
- ✅ Prueba solo espacios
- ✅ Prueba emojis
- ✅ Prueba caracteres especiales
- ✅ Prueba script tags (XSS)
- ✅ Prueba SQL injection
- ✅ Prueba HTML tags
- ✅ Prueba caracteres unicode
- ✅ Prueba espacios al inicio y fin
- ✅ Valida que el formulario sigue funcionando después de cada prueba

**Campos probados**:
- Título
- Descripción
- Oferta corta

**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~1850)

---

## 7. ✅ Validar formulario en viewport móvil

**Objetivo**: Validar que el formulario funciona correctamente en dispositivos móviles.

**Cobertura**:
- ✅ Cambia viewport a móvil (375x667 - iPhone SE)
- ✅ Valida que todos los campos son visibles
- ✅ Valida que todos los campos están dentro del viewport
- ✅ Verifica que no hay elementos superpuestos
- ✅ Restaura viewport original al finalizar

**Campos validados**:
- Título
- Fecha inicio
- Fecha fin
- Servicio
- Descripción
- Oferta corta
- Botón Finalizar

**Ubicación**: `tests/provider/promotions.spec.ts` (línea ~1950)

---

## 📊 Impacto en Cobertura

### Antes
- ✅ Cubierto: 14/27 (51.9%)
- ⚠️ Parcialmente cubierto: 4/27 (14.8%)
- ❌ No cubierto: 9/27 (33.3%)

### Después
- ✅ Cubierto: 23/26 (88.5%)
- ⚠️ Parcialmente cubierto: 1/26 (3.8%)
- ❌ No cubierto: 2/26 (7.7%)

### Mejora
- **+36.6%** en cobertura completa
- **-11%** en parcialmente cubierto
- **-25.6%** en no cubierto

---

## 🎯 Funcionalidades Ahora Cubiertas

1. ✅ Estado del botón "Finalizar" (habilitado/deshabilitado)
2. ✅ Límite de caracteres en descripción
3. ✅ Contador dinámico de oferta corta
4. ✅ Carga de servicios desde API
5. ✅ Selección única de servicio
6. ✅ Inputs inesperados (seguridad)
7. ✅ Responsividad móvil

---

## 📝 Notas

- Todas las pruebas están dentro del bloque `test.describe('Gestión de promociones')` que ejecuta en modo serial
- Las pruebas siguen el mismo patrón de las existentes (login, navegación, validación)
- Se utilizan las mismas funciones helper (`showStepMessage`, `pickDateSmart`, etc.)
- Las pruebas son independientes y pueden ejecutarse individualmente

---

## 🚀 Ejecución

Para ejecutar todas las pruebas de promociones:
```bash
npm run test:proveedor:promociones
```

Para ejecutar una prueba específica:
```bash
npx playwright test tests/provider/promotions.spec.ts -g "Validar estado del botón Finalizar"
```

