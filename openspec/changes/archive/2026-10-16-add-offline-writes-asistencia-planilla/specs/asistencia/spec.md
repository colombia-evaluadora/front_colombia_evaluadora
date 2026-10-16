## ADDED Requirements

### Requirement: Asistencia sin conexión
El registro, la edición y "Marcar todos" SHALL encolarse como operaciones de la outbox (`asistencia.registrar`, `asistencia.editar`, `asistencia.marcar-todos`); una corrección de un estudiante con `registrar` pendiente MUST fusionarse en sus `REGISTROS`.

#### Scenario: Registrar en el aula sin red
- **WHEN** el docente registra la asistencia de una sesión sin red
- **THEN** cada estudiante muestra el badge "Pendiente" y se envía al reconectar

#### Scenario: Marcar todos offline
- **WHEN** el docente usa "Marcar todos" sin red
- **THEN** no se pinta optimista por estudiante y el resumen informa los afectados al sincronizar

#### Scenario: Preescolar
- **WHEN** la sesión es formativa
- **THEN** la op lleva `ACTIVIDAD` y nunca `BLOQUE`

### Requirement: Conflicto por estudiante
Con BE-5, `registrar` SHALL enviar el estado base por estudiante y el servidor MUST devolver conflicto estructurado en lugar de pisar en silencio; la resolución es por fila (P15).

#### Scenario: Co-docencia
- **WHEN** otro docente registró la misma sesión mientras el primero estaba offline
- **THEN** las filas en conflicto se resuelven una a una

#### Scenario: Contexto inválido
- **WHEN** el servidor responde 409 `CK_TASISTENCIA_CONTEXTO`
- **THEN** la op queda `rejected`, no `conflict`

## REMOVED Requirements

### Requirement: Edición puntual por registro
**Reason**: El fan-out con `Promise.all` impedía saber qué ediciones entraron.
**Migration**: Cada PATCH es una op independiente de la outbox (ver "Asistencia sin conexión").
