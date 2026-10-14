## ADDED Requirements

### Requirement: Sagas reanudables de actividad
Crear y editar una actividad SHALL ejecutarse como operaciones encadenadas de la outbox con el orden real del código, cada paso con su `Idempotency-Key`, de modo que se reanuden tras cerrar el navegador sin duplicar pasos.

#### Scenario: Reinicio a mitad de la saga
- **WHEN** el equipo se reinicia después de crear la actividad y antes del instrumento
- **THEN** al reconectar se envían solo los pasos faltantes, en orden

#### Scenario: Criterio rechazado
- **WHEN** uno de varios criterios es rechazado por el servidor
- **THEN** ese criterio queda "No guardado" y los demás se guardan

### Requirement: Ids temporales
Una actividad creada offline SHALL tener id `tmp:<uuid>`, aparecer en listas y calendario con el badge "Pendiente", y su id MUST reemplazarse por el real en los payloads dependientes al enviar; un `tmp:` MUST NOT llegar nunca al backend.

#### Scenario: Editar una actividad creada offline
- **WHEN** el docente edita una actividad `tmp:` aún no sincronizada
- **THEN** la edición se fusiona en el payload de creación

#### Scenario: Creación fallida
- **WHEN** la creación queda `rejected`
- **THEN** sus dependientes quedan "En espera" y al descartarla se ofrece descartarlos

### Requirement: Concurrencia optimista por versión
Los PUT de actividad y unidad SHALL enviar la versión leída (BE-3B) y un 409 MUST tratarse como conflicto.

#### Scenario: Cambio de método de cálculo de la unidad
- **WHEN** el servidor reconvierte ponderaciones mientras el docente editaba offline
- **THEN** la op con versión vieja queda en conflicto

### Requirement: Borradores persistentes con archivos
El formulario de actividad SHALL guardar borradores en IndexedDB incluyendo los Blobs de los adjuntos.

#### Scenario: Recarga durante la vista previa de un recurso
- **WHEN** la pestaña se recarga con un borrador con imágenes
- **THEN** el borrador y sus imágenes se recuperan

## REMOVED Requirements

### Requirement: Borrador de formulario en sessionStorage
**Reason**: Las URLs `blob:` mueren al recargar y se perdían los adjuntos.
**Migration**: Reemplazado por "Borradores persistentes con archivos" (store `drafts`).
