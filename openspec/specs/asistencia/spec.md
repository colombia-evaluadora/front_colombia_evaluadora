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

### Requirement: Edición puntual por registro
El sistema SHALL editar registros existentes con un PATCH por pk, lanzados en paralelo desde el llamador.

#### Scenario: Fallo parcial
- **WHEN** una de varias ediciones falla
- **THEN** las demás pueden haberse aplicado y la UI no identifica cuáles

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
