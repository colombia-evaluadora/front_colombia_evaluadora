## ADDED Requirements

### Requirement: Sagas reanudables de actividad
Crear y editar una actividad SHALL ejecutarse como operaciones encadenadas de la outbox con el orden real del código, cada paso con su `Idempotency-Key` fija, de modo que se reanuden tras cerrar el navegador sin duplicar pasos.

#### Scenario: Reinicio a mitad de la saga
- **WHEN** el equipo se reinicia después de crear la actividad y antes del instrumento
- **THEN** al reconectar se envían solo los pasos faltantes, en orden

#### Scenario: Criterio rechazado
- **WHEN** uno de varios criterios es rechazado por el servidor
- **THEN** ese criterio queda "No guardado" y los demás se guardan

#### Scenario: Paso rechazado
- **WHEN** un paso intermedio es rechazado
- **THEN** sus dependientes quedan "En espera", la saga se muestra como "Guardado parcial" y el docente puede reintentar desde ese paso u omitirlo

### Requirement: Ids temporales
Una actividad o unidad creada offline SHALL tener id `tmp:<uuid>`, mostrarse como pendiente hasta sincronizar, y su id MUST reemplazarse por el real en los payloads dependientes al enviar; un `tmp:` MUST NOT llegar nunca al backend.

#### Scenario: Paso dependiente de una creación
- **WHEN** se envía el paso de materiales de una actividad creada offline
- **THEN** la URL lleva el id real devuelto por la creación

#### Scenario: Creación fallida
- **WHEN** la creación queda `rejected`
- **THEN** sus dependientes quedan "En espera" y al descartar se descartan los pasos que faltan

### Requirement: Concurrencia optimista de ediciones encoladas
Las ediciones encoladas de actividad y unidad SHALL verificar, antes de escribir, que la versión del servidor sea la que vio el docente; si cambió MUST quedar en conflicto, y si la actividad ya tiene calificaciones (regla 37) MUST quedar rechazada con el motivo.

#### Scenario: Cambio de método de cálculo de la unidad
- **WHEN** el servidor cambió la unidad mientras el docente la editaba offline
- **THEN** la op queda en conflicto y "Conservar mis cambios" la reenvía sobre la versión actual

#### Scenario: Actividad calificada mientras tanto
- **WHEN** la actividad recibió calificaciones antes de sincronizar la edición
- **THEN** el paso queda rechazado con el código `ACTIVIDAD_NO_EDITABLE` y el motivo

### Requirement: Adjuntos de pasos de reemplazo total
Los PUT de reemplazo total (materiales, adaptaciones) SHALL reenviar los archivos ya guardados por su id y guardar los nuevos como blobs dentro de las cuotas offline, subiéndolos una sola vez aunque el paso se reintente.

#### Scenario: Reintento tras subir el archivo
- **WHEN** el PUT de materiales falla después de subir un archivo nuevo
- **THEN** el reintento reutiliza el id subido y no vuelve a subirlo
