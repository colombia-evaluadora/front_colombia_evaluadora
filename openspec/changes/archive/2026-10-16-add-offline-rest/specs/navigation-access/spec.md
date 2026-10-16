## ADDED Requirements

### Requirement: Horario y asignaciones en solo consulta sin conexión
La lista de periodos y la edición de un periodo (tabs de horario y asignaciones académicas) SHALL abrirse sin red desde la cache persistida, mientras que agregar un periodo y el resto de establecimiento y administración MUST seguir siendo solo en línea; guardar horario o asignaciones MUST estar deshabilitado sin red.

#### Scenario: Abrir el horario sin red
- **WHEN** el docente entra sin conexión a la edición de un periodo ya consultado
- **THEN** ve el horario y las asignaciones, con "Guardar" deshabilitado

#### Scenario: Administración sin red
- **WHEN** se entra sin conexión a roles y menús
- **THEN** se muestra "Esta sección necesita conexión"
