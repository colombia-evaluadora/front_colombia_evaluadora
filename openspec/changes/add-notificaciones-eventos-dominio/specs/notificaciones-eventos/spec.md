## ADDED Requirements

### Requirement: Publicación desde el backend tras commit
Los eventos de dominio notificables SHALL publicarse desde el backend únicamente después de confirmar la transacción, a través del RabbitMQ propio; el front MUST NOT originar notificaciones de dominio.

#### Scenario: Transacción revertida
- **WHEN** la aprobación de una actividad falla y se revierte
- **THEN** no se publica ninguna notificación

#### Scenario: Pestaña cerrada tras guardar
- **WHEN** el docente envía una actividad a validación y cierra la pestaña
- **THEN** el coordinador recibe la notificación igualmente

### Requirement: Validación del planeador
El sistema SHALL notificar al coordinador cuando una actividad se envía a validación y al docente cuando el coordinador la aprueba o rechaza, con deep link a `/app/planeador/actividades?actividad=<id>`.

#### Scenario: Actividad aprobada
- **WHEN** el coordinador aprueba una actividad
- **THEN** el docente autor recibe "Actividad aprobada" con el deep link de la actividad

#### Scenario: Enviada a validación
- **WHEN** un docente envía una actividad a validación
- **THEN** el coordinador responsable del grupo recibe la notificación

### Requirement: Solicitudes de asistencia Regla 75
El sistema SHALL notificar al coordinador cuando se crea una solicitud de corrección de asistencia y al docente cuando se resuelve.

#### Scenario: Solicitud resuelta
- **WHEN** el coordinador aprueba una solicitud de corrección
- **THEN** el docente recibe la notificación con deep link a la asistencia correspondiente

### Requirement: Informes listos
El sistema SHALL notificar al solicitante cuando termina la generación de boletines, las observaciones IA o la consolidación.

#### Scenario: Observaciones IA listas
- **WHEN** termina la generación de observaciones cualitativas
- **THEN** el solicitante recibe la notificación con deep link a informes con los filtros usados

### Requirement: Cambios en el establecimiento
El sistema SHALL notificar al funcionario afectado cuando cambia su asignación académica o se le asigna un rol.

#### Scenario: Asignación académica nueva
- **WHEN** se asigna una asignatura a un docente
- **THEN** el docente recibe la notificación

### Requirement: Deduplicación y destinatarios autorizados
Cada evento SHALL llevar un `dedupeKey` determinista y sus destinatarios MUST resolverse en el servidor con las reglas de permisos vigentes.

#### Scenario: Reintento del publicador
- **WHEN** el publicador reenvía un evento con el mismo `dedupeKey`
- **THEN** el destinatario conserva una sola notificación

#### Scenario: Usuario sin permiso
- **WHEN** un usuario no tiene acceso a la sede del objeto
- **THEN** no recibe la notificación

### Requirement: Actualización de pantallas por evento
Al recibir una notificación de dominio el front SHALL invalidar las consultas del dominio afectado para reflejar el cambio sin polling.

#### Scenario: Panel de validación abierto
- **WHEN** el coordinador tiene abierto el panel de validación y llega una nueva solicitud
- **THEN** la lista se actualiza sin recargar
