# offline-persistence Specification

## Purpose
Describe qué lecturas se guardan en el equipo para usarlas sin conexión (IndexedDB `ce-offline`, `src/lib/offline/query-persister.ts`), con qué minimización de datos de menores, en qué modo de equipo, con qué antigüedad máxima y cómo se preparan.

## Requirements

### Requirement: Persistencia por lista blanca
El sistema SHALL persistir en IndexedDB (`ce-offline`, store `queries`, una fila por query particionada por `userSub`) solo las queries exitosas que declaran `meta.offline: { ttl, scope }`, con `buster = "${userSub}:${SCHEMA_VERSION}"`, y MUST NOT persistir tokens, URLs de vista de archivos, respuestas de `/audit-cval`, `/sso-admin`, funcionarios, matrícula (salvo la lista con datos básicos, ver "Matrícula sin conexión: solo consulta con datos básicos"), reportes, IA ni errores.

#### Scenario: Query sin meta.offline
- **WHEN** se carga la lista de funcionarios
- **THEN** no se escribe en IndexedDB

#### Scenario: Cambio de esquema
- **WHEN** un deploy incrementa `SCHEMA_VERSION`
- **THEN** se descartan las queries persistidas

### Requirement: Minimización de datos de menores
Las queries persistidas con datos de estudiantes SHALL recortarse con `persistSelect` a nombre y pk; documento, acudiente, dirección y salud MUST NOT persistirse. La única excepción es la lista de matrícula, que por decisión de P6 conserva tipo y número de documento (ver el requisito siguiente); acudiente, dirección y salud tampoco se persisten ahí.

#### Scenario: Roster de planilla
- **WHEN** se persiste el roster de un grupo
- **THEN** cada estudiante guarda solo pk y nombre

### Requirement: Matrícula sin conexión: solo consulta con datos básicos
Por la decisión de P6 para Cobertura, la lista de matrícula (`/app/cobertura/matricula`) SHALL persistirse y abrirse sin red en solo lectura, recortada por una **lista blanca** aplicada en el persister (`persistSelect = selectRowFields(MATRICULA_OFFLINE_FIELDS)`): `id`, `documentType`, `documentNumber`, `firstName`, `lastName`, `institution`, `campus`, `shift`, `educationLevel`, `grade`, `group`, `status` y `enrollmentDate`, solo con valores primitivos. El acudiente, la salud, la dirección, el teléfono, el correo, las fotos y cualquier otro campo MUST NOT llegar a IndexedDB; una respuesta con forma desconocida MUST NOT persistirse. Con red la pantalla SHALL mostrar la lista completa (el recorte aplica solo a la copia persistida). "Preparar" SHALL incluir la vista por defecto de la lista (primera página, sin filtros, acotada por el backend a las sedes del usuario) solo si el menú del usuario incluye Matrícula, con la frescura incremental y el sondeo con ETag de las demás tareas.

#### Scenario: Copia persistida
- **WHEN** se persiste la lista de matrícula y el backend trae acudiente y campos que no están en la lista blanca
- **THEN** la fila de IndexedDB, descifrada, solo tiene claves de la lista blanca y ningún acudiente

#### Scenario: Consulta sin red
- **WHEN** un rector preparó el equipo y abre la lista de matrícula sin conexión
- **THEN** ve los estudiantes con sus datos básicos y las acciones de escritura deshabilitadas con "Necesitas conexión para esta acción."

#### Scenario: Con red
- **WHEN** se abre la lista con conexión después de restaurar la copia recortada
- **THEN** la lista se vuelve a pedir al montar y se muestra completa, incluido el acudiente

### Requirement: Modo equipo compartido por defecto
Mientras la política institucional sobre datos de menores (P6) siga pendiente, el login SHALL marcar por defecto "Este es un equipo compartido", en cuyo caso no se persisten queries; solo usuarios del piloto MAY desmarcarlo y MUST ver "Al desmarcar, este equipo guardará nombres de tus estudiantes y tus registros sin conexión. Úsalo solo en un equipo personal."

#### Scenario: Docente fuera del piloto
- **WHEN** un docente que no está en el piloto inicia sesión
- **THEN** el equipo queda en modo compartido y no se persiste nada

### Requirement: Pertenencia al piloto offline
La pertenencia al piloto SHALL configurarse en el build con `VITE_APP_OFFLINE_PILOT` (correos y/o roles del JWT separados por comas; `*` = todos; vacío = nadie). Solo un usuario del piloto MUST poder usar el equipo como personal; si el usuario del token no es del piloto, el equipo MUST volver a modo compartido.

#### Scenario: Antes del login
- **WHEN** el correo escrito no está en la lista y la lista no tiene roles ni `*`
- **THEN** "Este es un equipo compartido" queda marcado y deshabilitado con "Solo los usuarios del piloto sin conexión pueden usar este equipo como personal."

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
El sistema SHALL ofrecer el diálogo "Preparar para usar sin conexión" (menú de la cuenta y header de Planeador, Planilla y Asistencia) donde el docente elige grupos, asignaturas y periodos (por defecto todos los suyos y el periodo vigente) y descarga catálogos, estudiantes, columnas y calificaciones con las mismas query keys que la Planilla, con progreso "Descargando X de N…" y `navigator.storage.persist()`.

#### Scenario: Incluir archivos
- **WHEN** el docente marca "Incluir archivos"
- **THEN** las evidencias de esas planillas (hasta 5 MB cada una) se guardan en Cache Storage `ce-offline-archivos`, que `useArchivoViewUrl` usa sin red, y esa cache se borra al pasar a modo compartido o al limpiar los datos del usuario

#### Scenario: Preparar con selección
- **WHEN** el docente deja un solo grupo y un periodo y pulsa "Preparar"
- **THEN** solo se descargan las planillas de ese grupo para sus asignaturas en ese periodo, además de catálogos y lo ya abierto

#### Scenario: Evidencia sin red
- **WHEN** se preparó con "Incluir archivos" y luego se abre sin red una evidencia de esa planilla
- **THEN** la imagen se muestra desde el archivo guardado en el equipo

#### Scenario: Preparación completa
- **WHEN** termina la descarga sin errores
- **THEN** se muestra "Listo. Este equipo puede usarse sin conexión. Última preparación: hoy {hora}."
