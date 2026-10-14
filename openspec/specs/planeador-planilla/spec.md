# planeador-planilla Specification

## Purpose
Describe la planilla de calificación del planeador (`src/features/planeador`, ruta `planeador/planilla`).

## Requirements

### Requirement: Calificar celda
El sistema SHALL calificar una celda (actividad × estudiante) con un PUT idempotente y mostrar la `calificacion` que devuelve el servidor; las notas definitivas y proyectadas MUST venir del servidor.

#### Scenario: Calificación online
- **WHEN** el docente escribe una nota en una celda
- **THEN** se envía el PUT y la planilla muestra el valor y la nota recalculada por el servidor

### Requirement: Calificación masiva
El sistema SHALL permitir calificar varias celdas en bloque e inferir si se creó una solicitud cuando el periodo está cerrado.

#### Scenario: Periodo cerrado
- **WHEN** el docente califica en bloque con el periodo cerrado
- **THEN** los cambios quedan como solicitud al coordinador y se informa

### Requirement: Observaciones y soportes
El sistema SHALL permitir observaciones por estudiante con hasta 3 evidencias de 10 MB cada una, subidas por multipart.

#### Scenario: Adjuntar evidencia
- **WHEN** el docente adjunta un archivo de hasta 10 MB a una observación
- **THEN** se sube al file-service y se asocia a la observación

### Requirement: Invalidación tras calificar
Calificar celda, bulk y observar SHALL invalidar las queries de planilla, de nota y `actividad.calificaciones(id)` de las actividades afectadas, de modo que todas las vistas abiertas reflejen el valor del servidor (X2 del plan).

#### Scenario: Panel de detalle abierto
- **WHEN** se califica desde la planilla con el `ActividadDetallePanel` en `?modo=grades`
- **THEN** el panel se refresca y muestra la nota nueva

#### Scenario: Calificación masiva
- **WHEN** se califican varias celdas en bloque
- **THEN** se invalida `actividad.calificaciones(id)` una vez por actividad afectada
