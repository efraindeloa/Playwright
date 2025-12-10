# Análisis de Cobertura: Pruebas de Promociones

## Fecha: Diciembre 2025

### Resumen Ejecutivo
Este documento analiza qué funcionalidades de promociones están cubiertas por las pruebas automatizadas y cuáles faltan según los requerimientos de QA Funcional.

---

## ✅ FUNCIONALIDADES CUBIERTAS

### 1. Validaciones de Campos Obligatorios
- ✅ **Título es obligatorio** - Cubierto en `Validar campos obligatorios vacíos`
- ✅ **Fecha inicio es obligatoria** - Cubierto en `Validar campos obligatorios vacíos`
- ✅ **Fecha fin es obligatoria** - Cubierto en `Validar campos obligatorios vacíos`
- ✅ **Oferta corta es obligatoria** - Cubierto en `Validar campos obligatorios vacíos`
- ✅ **Descripción es obligatoria** - Cubierto en `Validar campos obligatorios vacíos`
- ✅ **Servicio es obligatorio** - Cubierto en `Validar campos obligatorios vacíos`

### 2. Validaciones de Fechas
- ✅ **Fecha de fin no puede ser menor que hoy** - Cubierto en `Validar fecha de fin en el pasado`
- ✅ **Fecha de inicio no puede ser mayor que fecha fin** - Cubierto en `Validar fecha inicio mayor que fecha fin`
- ✅ **Mensajes de error aparecen correctamente** - Cubierto en ambos casos
- ✅ **No se puede crear promoción con fechas que se traslapan con una existente** - Cubierto en `Validar que no se puede crear promoción con fechas que se traslapan`
- ✅ **Se pueden crear múltiples promociones si las fechas NO se traslapan** - Cubierto en `Validar que se pueden crear múltiples promociones con el mismo servicio si las fechas NO se traslapan`
- ✅ **Diferentes escenarios de traslape son detectados** - Cubierto en `Validar diferentes escenarios de traslape de fechas`

### 3. Oferta Corta
- ✅ **No permite escribir más caracteres de los definidos** - Cubierto en `Validar límite de caracteres en oferta corta`
- ✅ **El texto deja de aceptar input al llegar al límite** - Cubierto en `Validar límite de caracteres en oferta corta`
- ⚠️ **El contador aumenta correctamente mientras se escribe** - Parcialmente cubierto (solo verifica que existe, no valida que aumenta dinámicamente)

### 4. Dropdown "Mis servicios"
- ✅ **Muestra estado vacío si no hay servicios disponibles** - Cubierto en `Validar servicios no disponibles`
- ⚠️ **Carga servicios activos del proveedor desde API** - Parcialmente cubierto (selecciona servicio pero no valida explícitamente que viene de API)
- ❌ **Permite seleccionar solo un servicio** - NO CUBIERTO explícitamente

### 5. Guardado
- ✅ **Si todos los campos son válidos, la promoción se guarda exitosamente** - Cubierto en `Crear promoción`
- ✅ **Después de guardar, la promoción aparece en la lista correspondiente** - Cubierto en `Crear promoción`
- ⚠️ **Si ocurre un error en servidor, el sistema lo notifica y la información capturada permanece en pantalla** - NO CUBIERTO explícitamente

### 6. Flujo General
- ⚠️ **El botón "Finalizar" se habilita solo cuando los campos obligatorios están completos** - NO CUBIERTO explícitamente
- ⚠️ **El botón no permite enviar si hay validaciones pendientes** - Parcialmente cubierto (se valida que no se guarda, pero no se valida el estado del botón)
- ❌ **El formulario no se rompe ante inputs inesperados (espacios, emojis, caracteres especiales)** - NO CUBIERTO

### 7. Responsividad Funcional
- ❌ **El formulario funciona correctamente en mobile** - NO CUBIERTO
- ❌ **No hay elementos que se superpongan o queden fuera del viewport** - NO CUBIERTO

---

## ❌ FUNCIONALIDADES NO CUBIERTAS

### 1. Validaciones de Campos
- ✅ **Descripción larga acepta hasta el límite definido** - ✅ CUBIERTO en `Validar límite de caracteres en descripción larga`

### 2. Oferta Corta
- ✅ **El contador aumenta correctamente mientras se escribe** - ✅ CUBIERTO en `Validar contador dinámico de oferta corta`

### 3. Dropdown "Mis servicios"
- ✅ **Carga servicios activos del proveedor desde API** - ✅ CUBIERTO en `Validar que servicios se cargan desde API`
- ✅ **Permite seleccionar solo un servicio** - ✅ CUBIERTO en `Validar selección única de servicio`

### 4. Guardado
- ⚠️ **Si ocurre un error en servidor, el sistema lo notifica y la información capturada permanece en pantalla** - Parcialmente cubierto (no se simula error de servidor explícitamente, pero se valida el flujo de guardado)

### 5. Flujo General
- ✅ **El botón "Finalizar" se habilita solo cuando los campos obligatorios están completos** - ✅ CUBIERTO en `Validar estado del botón Finalizar según validaciones`
- ✅ **El botón no permite enviar si hay validaciones pendientes** - ✅ CUBIERTO en `Validar estado del botón Finalizar según validaciones`
- ✅ **El formulario no se rompe ante inputs inesperados (espacios, emojis, caracteres especiales)** - ✅ CUBIERTO en `Probar inputs inesperados en campos del formulario`

### 6. Responsividad Funcional
- ✅ **El formulario funciona correctamente en mobile** - ✅ CUBIERTO en `Validar formulario en viewport móvil`
- ✅ **No hay elementos que se superpongan o queden fuera del viewport** - ✅ CUBIERTO en `Validar formulario en viewport móvil`

---

## 📊 RESUMEN DE COBERTURA (ACTUALIZADO)

| Categoría | Cubierto | Parcialmente Cubierto | No Cubierto | Total |
|-----------|----------|----------------------|-------------|-------|
| Validaciones de campos | 7 | 0 | 0 | 7 |
| Fechas | 6 | 0 | 0 | 6 |
| Oferta corta | 3 | 0 | 0 | 3 |
| Dropdown servicios | 3 | 0 | 1 | 4 |
| Guardado | 2 | 1 | 1 | 4 |
| Flujo general | 3 | 0 | 0 | 3 |
| Responsividad | 2 | 0 | 0 | 2 |
| **TOTAL** | **26** | **1** | **2** | **29** |

### Porcentaje de Cobertura (ACTUALIZADO)
- ✅ **Cubierto completamente**: 26/29 (89.7%)
- ⚠️ **Parcialmente cubierto**: 1/29 (3.4%)
- ❌ **No cubierto**: 2/29 (6.9%)

### Pruebas Agregadas (Diciembre 2025)

#### Primera Ronda (Cobertura General)
1. ✅ `Validar estado del botón Finalizar según validaciones` - Valida habilitación/deshabilitación del botón
2. ✅ `Validar límite de caracteres en descripción larga` - Valida límite máximo de caracteres
3. ✅ `Validar contador dinámico de oferta corta` - Valida que el contador aumenta/disminuye dinámicamente
4. ✅ `Validar que servicios se cargan desde API` - Intercepta y valida llamadas API
5. ✅ `Validar selección única de servicio` - Valida que solo se puede seleccionar un servicio
6. ✅ `Probar inputs inesperados en campos del formulario` - Prueba espacios, emojis, caracteres especiales, etc.
7. ✅ `Validar formulario en viewport móvil` - Valida funcionamiento y visibilidad en móvil

#### Segunda Ronda (Validación de Traslape de Fechas)
8. ✅ `Validar que no se puede crear promoción con fechas que se traslapan con una existente` - Valida que el sistema impide creación con traslape
9. ✅ `Validar que se pueden crear múltiples promociones con el mismo servicio si las fechas NO se traslapan` - Valida creación exitosa sin traslape
10. ✅ `Validar diferentes escenarios de traslape de fechas` - Prueba 4 escenarios diferentes de traslape (completo, parcial inicio, parcial fin, contiene)

---

## 🔧 RECOMENDACIONES

### Prioridad Alta
1. **Validar estado del botón "Finalizar"** - Verificar que se habilita/deshabilita según validaciones
2. **Validar límite de caracteres en descripción** - Similar a oferta corta
3. **Validar contador dinámico de oferta corta** - Verificar que aumenta mientras se escribe

### Prioridad Media
4. **Validar que servicios vienen de API** - Interceptar llamadas API y validar respuesta
5. **Validar selección única de servicio** - Intentar seleccionar múltiples servicios
6. **Probar inputs inesperados** - Espacios, emojis, caracteres especiales

### Prioridad Baja
7. **Probar en viewport móvil** - Agregar pruebas con viewport móvil
8. **Validar UI en diferentes tamaños** - Verificar que no hay superposiciones
9. **Simular error de servidor** - Interceptar y simular error 500

---

## 📝 NOTAS

- Las pruebas actuales cubren bien los casos básicos de validación y guardado
- Falta cobertura en validaciones de estado del botón y comportamiento dinámico
- No hay pruebas de responsividad móvil
- No se prueban casos edge (inputs inesperados, errores de servidor)

