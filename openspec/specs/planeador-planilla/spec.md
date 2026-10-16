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

### Requirement: Calificación sin conexión
Calificar celda, bulk, estado de resultado, observación y soportes SHALL encolarse como ops de la outbox; dos ediciones de la misma celda MUST fusionarse conservando la `BASE` de la primera para el CAS (BE-2).

#### Scenario: Bulk de 40 celdas offline
- **WHEN** el docente califica 40 celdas sin red y luego reconecta
- **THEN** se envían con concurrencia 3 y, si 2 fallan, el resumen dice "38 de 40"

### Requirement: Nunca inventar notas calculadas
Sin conexión, las notas definitivas y proyectadas SHALL mostrar el último valor conocido con el badge "Por recalcular" y MUST NOT calcularse en el front; la vista previa de nota muestra "La nota se calculará al sincronizar."

#### Scenario: Celda calificada offline
- **WHEN** el docente califica sin red
- **THEN** la celda muestra su valor con "Pendiente" y la definitiva queda "Por recalcular"

### Requirement: Periodo cerrado al sincronizar
Si el periodo se cerró mientras el docente estaba offline, la op SHALL terminar `done` con el aviso "El periodo se cerró antes de sincronizar: tus cambios quedaron como solicitud al coordinador." usando el estado del servidor al enviar.

#### Scenario: Solicitud generada
- **WHEN** el servidor responde con `solicitudes_pendientes`
- **THEN** no se trata como error
