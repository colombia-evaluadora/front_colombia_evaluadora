# offline-persistence Specification

## Purpose
Describe qué lecturas se guardan en el equipo para usarlas sin conexión (IndexedDB `ce-offline`, `src/lib/offline/query-persister.ts`), con qué minimización de datos de menores, en qué modo de equipo, con qué antigüedad máxima y cómo se preparan.

## Requirements

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

### Requirement: Pertenencia al piloto offline
La pertenencia al piloto SHALL configurarse en el build con `VITE_APP_OFFLINE_PILOT`: lista separada por comas de correos (contienen `@`) y/o roles del JWT; `*` habilita a todos y vacío (default) a nadie. No existe rol ni permiso de menú del backend que la represente. Antes del login el checkbox "Este es un equipo compartido" MUST quedar marcado y deshabilitado si el correo escrito no está en la lista (salvo que la lista tenga roles o `*`), con "Solo los usuarios del piloto sin conexión pueden usar este equipo como personal."; después del login, si el usuario del token (correo y roles) no es del piloto, el equipo MUST volver a modo compartido.

#### Scenario: Correo fuera de la lista
- **WHEN** se escribe un correo que no está en `VITE_APP_OFFLINE_PILOT` y la lista no tiene roles
- **THEN** "Este es un equipo compartido" queda marcado y no se puede desmarcar

#### Scenario: Piloto por rol
- **WHEN** la lista tiene un rol y el usuario desmarcó el checkbox pero su token no trae ese rol
- **THEN** tras el login el equipo vuelve a modo compartido y se borra lo persistido

### Requirement: Antigüedad de los datos
Los datos persistidos SHALL mostrarse con "Datos del {fecha}, {hora}" y, vencido el TTL duro (7 días datos de grupo, 30 días catálogos), MUST bloquear escribir sobre ellos con "Estos datos tienen más de 7 días. Conéctate para actualizarlos antes de calificar."

#### Scenario: Planilla de hace 8 días
- **WHEN** el docente abre offline una planilla preparada hace 8 días
- **THEN** ve los datos con la fecha en rojo y no puede calificar

### Requirement: Preparar para usar sin conexión
El sistema SHALL ofrecer el diálogo "Preparar para usar sin conexión" (desde el menú de la cuenta y desde el botón "Preparar sin conexión" del header de Planeador, Planilla y Asistencia) donde el docente elige grupos, asignaturas y periodos (por defecto: todos sus grupos y asignaturas y el periodo vigente) y opcionalmente "Incluir archivos". Descarga los catálogos, la lista de estudiantes de cada grupo elegido, columnas y calificaciones de cada grupo × asignatura (del mismo grado) × periodo con las mismas query keys que la Planilla, refresca las queries `meta.offline` ya abiertas, solicita `navigator.storage.persist()` y muestra el progreso "Descargando X de N…". Con "Incluir archivos" MUST descargar además las evidencias de esas planillas (hasta 5 MB cada una) a Cache Storage (`ce-offline-archivos`), que `useArchivoViewUrl` usa como respaldo sin red; esa cache MUST borrarse al pasar a modo compartido y al limpiar los datos de un usuario.

#### Scenario: Preparar con selección
- **WHEN** el docente deja un solo grupo y un periodo y pulsa "Preparar"
- **THEN** solo se descargan las planillas de ese grupo para sus asignaturas en ese periodo, además de catálogos y lo ya abierto

#### Scenario: Evidencia sin red
- **WHEN** se preparó con "Incluir archivos" y luego se abre sin red una evidencia de esa planilla
- **THEN** la imagen se muestra desde el archivo guardado en el equipo

#### Scenario: Preparación completa
- **WHEN** termina la descarga sin errores
- **THEN** se muestra "Listo. Este equipo puede usarse sin conexión. Última preparación: hoy {hora}."
