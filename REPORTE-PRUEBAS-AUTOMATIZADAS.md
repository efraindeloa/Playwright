# 📊 Reporte de Pruebas Automatizadas

**Fecha de generación:** 2025-12-03  
**Total de pruebas:** 130 pruebas

---

## 📋 Resumen Ejecutivo

| Categoría | Número de Pruebas | Archivos |
|----------|-------------------|----------|
| **Cliente** | 29 pruebas | 4 archivos |
| **Proveedor** | 83 pruebas | 9 archivos |
| **Comunes** | 8 pruebas | 2 archivos |
| **TOTAL** | **120 pruebas** | **15 archivos** |

*Nota: El total de pruebas individuales es 120, pero el grep encontró 130 líneas debido a que algunos tests están dentro de bloques `test.describe()`.*

---

## 👤 Pruebas de Cliente (29 pruebas)

### 📁 `tests/client/cotizacion.spec.ts` (7 pruebas)
1. Validar que se muestran todos los elementos de una cotización
2. Interactuar Con Elementos De Una Cotización No Cancelada
3. Cancelar Una Negociación
4. Agregar Una Nota
5. Probar Funcionalidad Completa Del Chat
6. Mostrar Datos De La Cotización Que Coinciden Con La Notificación Seleccionada
7. Se deshabilita la interacción cuando un evento está cancelado

### 📁 `tests/client/perfil.spec.ts` (5 pruebas)
1. Se muestran todos los elementos de la página de perfil
2. Se pueden editar los datos personales
3. Se actualiza la foto de perfil
4. Se puede eliminar la foto de perfil
5. Se puede cambiar la contraseña

### 📁 `tests/client/dashboard.spec.ts` (15 pruebas)
1. Se muestran todas las secciones principales del dashboard
2. Se muestran todos los elementos de la barra superior
3. Navega a Chats, Favoritos y Perfil desde la barra superior
4. Se muestran conversaciones en la sección Fiestachat
5. Se muestran todos los elementos de la sección Fiestachat
6. Navega a la página de cotización al hacer clic en una notificación
7. Se muestran las fiestas del cliente en la sección de eventos
8. Se muestran todos los elementos de la sección Elige Tu Fiesta
9. Se muestran todos los elementos de la sección de servicios
10. Se muestra el botón Agregar Servicios y se prueba su funcionalidad
11. Los servicios se ordenan correctamente
12. Los filtros de servicios se aplican correctamente
13. Se muestran todos los elementos del calendario en vista desktop
14. Crear una nueva fiesta desde el dashboard

### 📁 `tests/client/cliente-eventos.spec.ts` (2 pruebas)
1. Nueva fiesta
2. Crear eventos - Bloque 1-5 (5 bloques dinámicos, cada uno prueba 3 tipos de eventos)

---

## 🏢 Pruebas de Proveedor (83 pruebas)

### 📁 `tests/provider/registro.spec.ts` (1 prueba)
1. Registrar nuevo Proveedor

### 📁 `tests/provider/servicios.spec.ts` (10 pruebas)
1. Crear servicio
2. Editar servicio
3. Eliminar servicio
4. Activar servicio
5. Desactivar servicio
6. Buscar servicios
7. Filtrar servicios
8. Navegar a chats desde servicios
9. Navegar a perfil desde servicios
10. Navegar a home desde servicios

### 📁 `tests/provider/profile.spec.ts` (9 pruebas)
1. Login
2. Datos personales
3. Datos del negocio
4. Presencia digital
5. Foto de perfil
6. Sección Opciones
7. Cambiar contraseña
8. Métodos de pago
9. Cerrar sesión

### 📁 `tests/provider/promotions.spec.ts` (14 pruebas)
1. crear promoción
2. validar campos obligatorios vacíos
3. validar límite de caracteres en oferta corta
4. validar fecha de fin en el pasado
5. validar fecha inicio mayor que fecha fin
6. validar servicios no disponibles
7. ordenar promociones
8. filtrar promociones
9. buscar promociones
10. editar promoción
11. eliminar promoción
12. navegar a chats desde promociones
13. navegar a perfil desde promociones
14. navegar a dashboard desde promociones

### 📁 `tests/provider/negotiation.spec.ts` (11 pruebas)
1. navegar a página de negociación
2. validar información del evento en negociación
3. validar información del servicio en negociación
4. validar información del cliente en negociación
5. validar sección de cotización
6. validar campos de cotización
7. validar sección de notas personales
8. validar sección de chat/mensajes
9. navegar de regreso desde negociación
10. validación completa de elementos interactivos en estado NUEVA
11. validación completa: tipo de evento, estado de cotización y elementos según contexto

### 📁 `tests/provider/chats.spec.ts` (6 pruebas)
1. navegar a página de chats
2. validar elementos de la página de chats
3. buscar conversaciones
4. filtrar conversaciones
5. seleccionar conversación y navegar a negociación
6. navegar de regreso desde chats al dashboard

### 📁 `tests/provider/calendar.spec.ts` (13 pruebas)
1. navegar a calendario y validar estructura básica
2. navegar entre meses del calendario
3. validar estructura de días del calendario
4. seleccionar día del calendario
5. validar días con eventos (indicadores de color)
6. validar estado vacío cuando no hay eventos
7. validar botón agendar evento desde calendario
8. navegar de regreso desde calendario
9. seleccionar día con eventos del mes siguiente
10. validar eventos agendados cuando hay eventos
11. Agendar evento
12. seleccionar evento de un día con eventos y validar redirección a negociación
13. validar responsividad y elementos visuales

### 📁 `tests/provider/dashboard.spec.ts` (11 pruebas)
1. mostrar las secciones principales del dashboard
2. accesos rápidos navegan a las secciones correspondientes
3. barra superior navega a chats y perfil
4. tarjetas de estadísticas redirigen a sus secciones
5. controles adicionales del listado de eventos están visibles
6. filtros de eventos permiten cambiar la vista
7. botón Fecha ordena los eventos
8. botón Ver eventos pasados muestra eventos pasados
9. calendario filtra eventos al seleccionar un día con eventos
10. calendario muestra estado vacío al seleccionar un día sin eventos
11. botón Nuevo evento navega a la página de creación de evento

### 📁 `tests/provider/estadisticas.spec.ts` (8 pruebas)
1. navegar a página de visualizaciones desde dashboard
2. validar elementos de la página de visualizaciones
3. interactuar con botón de filtro en visualizaciones
4. navegar de regreso desde visualizaciones al dashboard
5. navegar a página de solicitudes desde dashboard
6. validar elementos de la página de solicitudes
7. interactuar con botón de filtro en solicitudes
8. navegar de regreso desde solicitudes al dashboard

---

## 🌐 Pruebas Comunes (8 pruebas)

### 📁 `tests/common/home.spec.ts` (7 pruebas)
1. Validar elementos técnicos únicos de la página de inicio
2. Validar funcionalidad del navbar superior
3. Validar funcionalidad del hero banner
4. Validar funcionalidad de la sección de categorías
5. Validar funcionalidad de los botones de tipos de eventos
6. Validar funcionalidad de los botones de estímulos
7. Validar funcionalidad del footer

### 📁 `tests/common/screenshots.spec.ts` (1 prueba)
1. captura y valida página completa (desktop)

---

## 📈 Estadísticas por Módulo

### Módulos con más pruebas:
1. **Dashboard de Proveedor** - 11 pruebas
2. **Dashboard de Cliente** - 15 pruebas
3. **Calendario de Proveedor** - 13 pruebas
4. **Promociones** - 14 pruebas
5. **Servicios** - 10 pruebas

### Módulos con menos pruebas:
1. **Registro de Proveedor** - 1 prueba
2. **Screenshots** - 1 prueba
3. **Perfil de Cliente** - 5 pruebas
4. **Chats de Proveedor** - 6 pruebas
5. **Estadísticas de Proveedor** - 8 pruebas

---

## 🔍 Distribución por Tipo de Prueba

### Pruebas de Validación de Elementos (UI)
- Validación de presencia de elementos
- Validación de estructura HTML
- Validación de elementos visibles

### Pruebas de Funcionalidad
- Navegación entre páginas
- Interacciones con formularios
- Operaciones CRUD (Crear, Leer, Actualizar, Eliminar)
- Filtros y búsquedas
- Ordenamiento

### Pruebas de Integración
- Flujos completos de usuario
- Integración entre módulos
- Validación de datos entre páginas

---

## 📝 Notas

- Las pruebas están organizadas por rol (Cliente/Proveedor) y por funcionalidad común
- Algunas pruebas son dinámicas (como los bloques de eventos en `cliente-eventos.spec.ts`)
- Las pruebas utilizan Playwright como framework de automatización
- Todas las pruebas están escritas en TypeScript

---

**Última actualización:** 2025-12-03

