// Catálogo de rutas internas a las que el asistente puede llevar a la persona,
// además de las pantallas del menú (agregar, editar/$id, detalle/$id, tabs y
// search params como `?actividad=` / `?unidad=` / `?tab=`).
//
// FUENTE ÚNICA: el backend (ai-control-service) carga una copia en JSON
// (`src/main/resources/agente/catalogo-rutas.json`) para describírselas al
// modelo (`rutas_de_pantalla`) y validar la acción NAVEGAR. Si cambiás algo
// acá, regenerá esa copia con:
//
//   node --experimental-strip-types scripts/catalogo-rutas-json.ts > <sso>/ai-control-service/src/main/resources/agente/catalogo-rutas.json
//
// Por eso este archivo NO importa nada (ni `@/`): lo corre node directo.
//
// - `ruta`: patrón COMPLETO del router (`paths.ts` → `getHref()`), con `$param`.
// - `menu`: código TMENU (`/usuarios/permisos-menu`): sin ese menú, la ruta no existe para la persona.
// - `accion`: permiso CRUD del menú que exige (`crear` para agregar, `editar` para editar).
// - `params`: params de ruta (todos obligatorios) → cómo resolver el id.
// - `search`: search params admitidos → qué significan. El front valida además
//   contra el `validateSearch` (zod) real de la ruta antes de navegar.
//
// `catalogo-rutas.test.ts` comprueba que cada `ruta` exista en el router.

export type AccionRuta = "ver" | "crear" | "editar"

export interface RutaCatalogo {
  codigo: string
  menu: string
  ruta: string
  descripcion: string
  accion: AccionRuta
  params?: Record<string, string>
  search?: Record<string, string>
}

const PAGINACION = {
  page: "Página del listado (0 = primera)",
  pageSize: "Filas por página",
}

const DOCENTE_PLANEADOR = {
  sede: "PK_TSEDE de la sede (filtro avanzado de rector/coordinador)",
  ano: "Año lectivo, p. ej. 2026",
  jornada: "Id de la jornada del periodo académico",
  docente: "PK_TFUNCIONARIO del docente cuyo planeador se mira (solo lectura)",
}

export const CATALOGO_RUTAS: RutaCatalogo[] = [
  // ─── Cobertura: matrícula ────────────────────────────────────────────────
  {
    codigo: "matricula.listado",
    menu: "MATRICULA",
    ruta: "/app/cobertura/matricula",
    descripcion: "Listado de estudiantes matriculados, con filtros.",
    accion: "ver",
    search: {
      ...PAGINACION,
      search: "Texto libre (nombre o documento del estudiante)",
      campus: "Nombre de la sede",
      shift: "Nombre de la jornada",
      grade: "Grado (número)",
      group: "Nombre del grupo",
    },
  },
  {
    codigo: "matricula.agregar",
    menu: "MATRICULA",
    ruta: "/app/cobertura/matricula/agregar",
    descripcion: "Formulario para matricular (agregar) un estudiante nuevo.",
    accion: "crear",
  },
  {
    codigo: "matricula.detalle",
    menu: "MATRICULA",
    ruta: "/app/cobertura/matricula/detalle/$matriculaId",
    descripcion: "Ficha (detalle) de la matrícula de un estudiante.",
    accion: "ver",
    params: { matriculaId: "Id de la matrícula (pk_tmatricula); búscalo consultando las matrículas del estudiante" },
  },
  {
    codigo: "matricula.editar",
    menu: "MATRICULA",
    ruta: "/app/cobertura/matricula/detalle/$matriculaId/editar",
    descripcion: "Formulario para editar la matrícula de un estudiante.",
    accion: "editar",
    params: { matriculaId: "Id de la matrícula (pk_tmatricula); búscalo consultando las matrículas del estudiante" },
  },
  {
    codigo: "matricula.configuracion",
    menu: "MATRICULA",
    ruta: "/app/cobertura/matricula/configuracion",
    descripcion: "Configuración de campos requeridos/visibles del formulario de matrícula.",
    accion: "editar",
  },
  // ─── Establecimiento: periodos académicos ────────────────────────────────
  {
    codigo: "periodos.listado",
    menu: "PERIODOS_ACADEMICOS",
    ruta: "/app/establecimiento-educativo/periodos",
    descripcion: "Listado de periodos académicos (años lectivos por sede y jornada).",
    accion: "ver",
    search: { ...PAGINACION, sedeName: "Nombre de la sede", schoolYearId: "Año lectivo (número)" },
  },
  {
    codigo: "periodos.agregar",
    menu: "PERIODOS_ACADEMICOS",
    ruta: "/app/establecimiento-educativo/periodos/agregar",
    descripcion: "Formulario para crear un periodo académico.",
    accion: "crear",
  },
  {
    codigo: "periodos.editar",
    menu: "PERIODOS_ACADEMICOS",
    ruta: "/app/establecimiento-educativo/periodos/$periodId/editar",
    descripcion:
      "Configuración de un periodo académico (editable), con pestañas: general, evaluacion (periodos de evaluación), calendario, promocion, criterios, escalas, grados, asignaciones.",
    accion: "editar",
    params: { periodId: "Id del periodo académico; búscalo consultando los periodos por sede y año" },
    search: {
      tab: "Pestaña a abrir: general | evaluacion | calendario | promocion | criterios | escalas | grados | asignaciones",
    },
  },
  {
    codigo: "periodos.ver",
    menu: "PERIODOS_ACADEMICOS",
    ruta: "/app/establecimiento-educativo/periodos/$periodId/ver",
    descripcion: "Configuración de un periodo académico en solo lectura, con las mismas pestañas que editar.",
    accion: "ver",
    params: { periodId: "Id del periodo académico" },
    search: {
      tab: "Pestaña a abrir: general | evaluacion | calendario | promocion | criterios | escalas | grados | asignaciones",
    },
  },
  {
    codigo: "periodos.grado.agregar",
    menu: "PERIODOS_ACADEMICOS",
    ruta: "/app/establecimiento-educativo/periodos/$periodId/grados/agregar",
    descripcion: "Formulario para agregar un grado (con sus grupos) a un periodo académico.",
    accion: "editar",
    params: { periodId: "Id del periodo académico" },
  },
  {
    codigo: "periodos.grado.editar",
    menu: "PERIODOS_ACADEMICOS",
    ruta: "/app/establecimiento-educativo/periodos/$periodId/grados/editar/$gradeId",
    descripcion: "Edición de un grado de un periodo académico y sus grupos.",
    accion: "editar",
    params: { periodId: "Id del periodo académico", gradeId: "Id del grado dentro del periodo" },
    search: { ver: "1 para abrirlo en solo lectura" },
  },
  // ─── Establecimiento: ficha, sedes, funcionarios ─────────────────────────
  {
    codigo: "establecimiento.general",
    menu: "ESTABLECIMIENTO",
    ruta: "/app/establecimiento-educativo/general",
    descripcion: "Datos generales de los establecimientos educativos.",
    accion: "ver",
  },
  {
    codigo: "establecimiento.agregar",
    menu: "ESTABLECIMIENTO",
    ruta: "/app/establecimiento-educativo/agregar",
    descripcion: "Formulario para crear un establecimiento educativo.",
    accion: "crear",
  },
  {
    codigo: "establecimiento.detalle",
    menu: "ESTABLECIMIENTO",
    ruta: "/app/establecimiento-educativo/detalle/$establishmentId",
    descripcion: "Ficha de un establecimiento educativo.",
    accion: "ver",
    params: { establishmentId: "Id del establecimiento" },
  },
  {
    codigo: "establecimiento.editar",
    menu: "ESTABLECIMIENTO",
    ruta: "/app/establecimiento-educativo/editar/$establishmentId",
    descripcion: "Formulario para editar un establecimiento educativo.",
    accion: "editar",
    params: { establishmentId: "Id del establecimiento" },
  },
  {
    codigo: "sedes.listado",
    menu: "SEDES_EDUCATIVAS",
    ruta: "/app/establecimiento-educativo/sedes",
    descripcion: "Listado de sedes del establecimiento.",
    accion: "ver",
    search: { ...PAGINACION },
  },
  {
    codigo: "funcionarios.listado",
    menu: "FUNCIONARIOS",
    ruta: "/app/establecimiento-educativo/funcionarios",
    descripcion: "Listado de funcionarios (docentes y personal). Crear/editar se hace en un diálogo de esta pantalla.",
    accion: "ver",
    search: { ...PAGINACION },
  },
  // ─── Planeador ───────────────────────────────────────────────────────────
  {
    codigo: "planeador.actividades",
    menu: "PLANEADOR",
    ruta: "/app/planeador/actividades",
    descripcion:
      "Actividades del planeador: rail por día y calendario; con `actividad` abre el detalle de esa actividad en el panel derecho.",
    accion: "ver",
    search: {
      actividad: "Id de la actividad a abrir en el panel de detalle",
      modo: "Modo del panel de detalle: info | grades (calificar) | approval (aprobar)",
      dia: "Día activo (AAAA-MM-DD)",
      buscar: "Texto libre",
      rotulo: "Pestaña (rótulo de ejecución) activa",
      ...DOCENTE_PLANEADOR,
    },
  },
  {
    codigo: "planeador.actividad.agregar",
    menu: "PLANEADOR",
    ruta: "/app/planeador/actividades/agregar",
    descripcion: "Formulario para crear una actividad del planeador.",
    accion: "crear",
    search: {
      unidadId: "Id de la unidad temática a la que se liga (preselecciona grado y asignatura)",
      fechaInicio: "Fecha de inicio (AAAA-MM-DD)",
      fechaCierre: "Fecha de cierre (AAAA-MM-DD)",
      rotulo: "Rótulo de ejecución de la pestaña de origen",
    },
  },
  {
    codigo: "planeador.actividad.editar",
    menu: "PLANEADOR",
    ruta: "/app/planeador/actividades/$actividadId/editar",
    descripcion: "Formulario para editar una actividad del planeador.",
    accion: "editar",
    params: { actividadId: "Id de la actividad; búscalo consultando las actividades del docente" },
  },
  {
    codigo: "planeador.unidades",
    menu: "PLANEADOR",
    ruta: "/app/planeador/unidades",
    descripcion: "Unidades temáticas del planeador; con `unidad` abre esa unidad en el panel derecho.",
    accion: "ver",
    search: {
      unidad: "Id de la unidad temática a abrir",
      instrumento: "Pestaña activa (Unidad temática / Proyecto pedagógico)",
      buscar: "Texto libre",
      ...DOCENTE_PLANEADOR,
    },
  },
  {
    codigo: "planeador.unidad.agregar",
    menu: "PLANEADOR",
    ruta: "/app/planeador/unidades/agregar",
    descripcion: "Formulario para crear una unidad temática.",
    accion: "crear",
    search: { instrumento: "Pestaña de origen (Unidad temática / Proyecto pedagógico)" },
  },
  {
    codigo: "planeador.unidad.editar",
    menu: "PLANEADOR",
    ruta: "/app/planeador/unidades/editar/$unidadId",
    descripcion: "Formulario para editar una unidad temática.",
    accion: "editar",
    params: { unidadId: "Id de la unidad temática; búscalo consultando las unidades del docente" },
    search: { instrumento: "Pestaña de origen" },
  },
  {
    codigo: "planeador.planilla",
    menu: "PLANEADOR",
    ruta: "/app/planeador/planilla",
    descripcion: "Planilla de calificación por periodo, grado, grupo y asignatura.",
    accion: "ver",
  },
  // ─── Gestión académica ───────────────────────────────────────────────────
  {
    codigo: "referentes.listado",
    menu: "REFERENTES_CURRICULARES",
    ruta: "/app/gestion-academica/referentes-curriculares",
    descripcion: "Listado de referentes curriculares.",
    accion: "ver",
    search: { ...PAGINACION },
  },
  {
    codigo: "referentes.detalle",
    menu: "REFERENTES_CURRICULARES",
    ruta: "/app/gestion-academica/referentes-curriculares/detalle/$curricularReferenceId",
    descripcion: "Detalle de un referente curricular con sus enunciados y evidencias.",
    accion: "ver",
    params: { curricularReferenceId: "Id del referente curricular" },
  },
  {
    codigo: "informes",
    menu: "INFORMES",
    ruta: "/app/gestion-academica/informes",
    descripcion: "Informes: consolidado, observaciones y boletines por sede, año, jornada, periodo y grupo.",
    accion: "ver",
  },
  {
    codigo: "informes.planilla",
    menu: "INFORMES",
    ruta: "/app/gestion-academica/informes/planilla/$grupoId/$asignaturaId/$periodoId",
    descripcion: "Planilla de notas de un grupo en una asignatura y periodo (desde Informes).",
    accion: "ver",
    params: {
      grupoId: "Id del grupo",
      asignaturaId: "Id de la asignatura",
      periodoId: "Id del periodo de evaluación (-1 = Final)",
    },
  },
  // ─── Asistencia ──────────────────────────────────────────────────────────
  {
    codigo: "asistencia.seguimiento",
    menu: "ASISTENCIAS",
    ruta: "/app/asistencia/seguimiento",
    descripcion: "Seguimiento de asistencia de estudiantes.",
    accion: "ver",
  },
  // ─── Cobertura: inscritos ────────────────────────────────────────────────
  {
    codigo: "inscritos.detalle",
    menu: "INSCRITOS",
    ruta: "/app/cobertura/inscritos/$enrollmentId",
    descripcion: "Detalle de un estudiante inscrito.",
    accion: "ver",
    params: { enrollmentId: "Id de la inscripción" },
  },
]

export function rutaDelCatalogo(codigo: string): RutaCatalogo | undefined {
  return CATALOGO_RUTAS.find((r) => r.codigo === codigo)
}
