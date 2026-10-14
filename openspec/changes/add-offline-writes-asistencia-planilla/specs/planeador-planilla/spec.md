## ADDED Requirements

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
