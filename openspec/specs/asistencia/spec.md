# asistencia Specification

## Purpose
Describe el registro y seguimiento de asistencia (`src/features/academic-management/asistencia`).

## Requirements

### Requirement: Registro manual por sesión
El sistema SHALL registrar la asistencia de una sesión con un único `registrar` que hace upsert de los registros (last-write-wins silencioso) y, para preescolar, enviar `ACTIVIDAD` en lugar de `ASIGNATURA`/`BLOQUE`. Los soportes de archivo MUST subirse antes del registro.

#### Scenario: Registrar una sesión
- **WHEN** el docente marca la asistencia de su grupo y guarda
- **THEN** se suben los soportes adjuntos y luego se envía `registrar` con los registros

#### Scenario: Otro docente registró la misma sesión
- **WHEN** dos docentes registran la misma sesión
- **THEN** el último registro pisa al anterior sin aviso

### Requirement: Regla 75 calculada en servidor
El sistema SHALL mostrar las solicitudes que el servidor devuelve en `solicitudes_pendientes` tras registrar, sin calcularlas en el front.

#### Scenario: Supera el umbral
- **WHEN** el registro dispara la Regla 75
- **THEN** la UI informa la solicitud generada por el servidor

### Requirement: Marcar todos
El calendario SHALL permitir "Marcar todos" por bloque, cuyo efecto depende de los registros que ya existan en el servidor.

#### Scenario: Marcar todos en un bloque
- **WHEN** el docente usa "Marcar todos" en un bloque
- **THEN** se envía la operación y la UI informa los registros afectados

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
