## ADDED Requirements

### Requirement: Persistencia por lista blanca
El sistema SHALL persistir en IndexedDB (`ce-offline`, store `queries`, una fila por query particionada por `userSub`) solo las queries exitosas que declaran `meta.offline: { ttl, scope }`, con `buster = "${userSub}:${SCHEMA_VERSION}"`, y MUST NOT persistir tokens, URLs de vista de archivos, respuestas de `/audit-cval`, `/sso-admin`, funcionarios, matrícula, reportes, IA ni errores.

#### Scenario: Query sin meta.offline
- **WHEN** se carga la lista de funcionarios
- **THEN** no se escribe en IndexedDB

#### Scenario: Cambio de esquema
- **WHEN** un deploy incrementa `SCHEMA_VERSION`
- **THEN** se descartan las queries persistidas

### Requirement: Minimización de datos de menores
Las queries persistidas con datos de estudiantes SHALL recortarse con `persistSelect` a nombre y pk; documento, acudiente, dirección y salud MUST NOT persistirse.

#### Scenario: Roster de planilla
- **WHEN** se persiste el roster de un grupo
- **THEN** cada estudiante guarda solo pk y nombre

### Requirement: Modo equipo compartido por defecto
Mientras la política institucional sobre datos de menores (P6) siga pendiente, el login SHALL marcar por defecto "Este es un equipo compartido", en cuyo caso no se persisten queries; solo usuarios del piloto MAY desmarcarlo y MUST ver "Al desmarcar, este equipo guardará nombres de tus estudiantes y tus registros sin conexión. Úsalo solo en un equipo personal."

#### Scenario: Docente fuera del piloto
- **WHEN** un docente que no está en el piloto inicia sesión
- **THEN** el equipo queda en modo compartido y no se persiste nada

### Requirement: Antigüedad de los datos
Los datos persistidos SHALL mostrarse con "Datos del {fecha}, {hora}" y, vencido el TTL duro (7 días datos de grupo, 30 días catálogos), MUST bloquear escribir sobre ellos con "Estos datos tienen más de 7 días. Conéctate para actualizarlos antes de calificar."

#### Scenario: Planilla de hace 8 días
- **WHEN** el docente abre offline una planilla preparada hace 8 días
- **THEN** ve los datos con la fecha en rojo y no puede calificar

### Requirement: Preparar para usar sin conexión
El sistema SHALL ofrecer el diálogo "Preparar para usar sin conexión" que descarga actividades, unidades, planillas, rosters del periodo actual y catálogos de los grupos elegidos, solicita `navigator.storage.persist()` y muestra el progreso "Descargando X de N…".

#### Scenario: Preparación completa
- **WHEN** termina la descarga sin errores
- **THEN** se muestra "Listo. Este equipo puede usarse sin conexión. Última preparación: hoy {hora}."
