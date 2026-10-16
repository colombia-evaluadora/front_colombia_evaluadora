# informes-offline Specification

## Purpose
Edición manual de observaciones cualitativas de informes en la outbox y consulta sin red del informe consolidado y su historial (Fase 4 offline).

## Requirements

### Requirement: Observaciones cualitativas sin conexión
Guardar o eliminar a mano la observación cualitativa de un estudiante SHALL encolarse en la outbox, fusionando por matrícula y período en la última intención; generar la observación con IA MUST seguir requiriendo conexión.

#### Scenario: Guardar observación sin red
- **WHEN** el docente guarda una observación escrita a mano sin conexión
- **THEN** la op queda en la outbox y al sincronizar se invalida el informe del grupo

#### Scenario: Generar con IA sin red
- **WHEN** el docente abre la observación sin conexión
- **THEN** "Generar con IA" está deshabilitado y puede escribir el texto a mano

### Requirement: Informe consolidado en solo consulta
El informe del grupo y su historial SHALL poder consultarse sin red desde la cache persistida, con los datos de estudiantes minimizados, y la descarga del boletín MUST seguir requiriendo conexión.

#### Scenario: Consultar historial sin red
- **WHEN** el docente abre el historial de un informe ya consultado
- **THEN** se muestra desde la cache local
