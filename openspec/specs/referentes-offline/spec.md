# referentes-offline Specification

## Purpose
Escrituras de enunciados, evidencias y estado de referentes curriculares a través de la outbox offline (Fase 4).

## Requirements

### Requirement: Enunciados y evidencias sin conexión
Crear, editar y eliminar enunciados y evidencias de un referente curricular SHALL encolarse en la outbox cuando no hay red o la entidad ya tiene ops pendientes, y cada evidencia MUST viajar en su propia op.

#### Scenario: Editar un enunciado sin red
- **WHEN** el docente edita el texto de un enunciado sin conexión
- **THEN** el cambio queda en la outbox y se muestra "Guardado en este equipo. Se enviará cuando haya conexión."

#### Scenario: Dos ediciones seguidas sin red
- **WHEN** el docente edita dos veces el mismo enunciado antes de sincronizar
- **THEN** las ediciones se fusionan en una sola op con los últimos valores

### Requirement: Estado del referente sin conexión
Activar un referente SHALL poder encolarse; inactivarlo MUST requerir conexión porque antes se consulta su impacto en el servidor.

#### Scenario: Inactivar sin red
- **WHEN** el docente intenta inactivar un referente sin conexión
- **THEN** el botón está deshabilitado con el motivo "Inactivar necesita conexión para revisar el impacto."
