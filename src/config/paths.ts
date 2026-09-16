export const paths = {
  home: {
    path: "/",
    getHref: () => "/",
  },

  auth: {
    login: {
      path: "/login",
      getHref: (redirectTo?: string | null) =>
        `/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`,
    },
    forgotPassword: {
      path: "/forgot-password",
      getHref: () => "/forgot-password",
    },
    forgotUsername: {
      path: "/forgot-username",
      getHref: () => "/forgot-username",
    },
    checkEmail: {
      path: "/check-email",
      getHref: (token?: string | null) =>
        `/check-email${token ? `?token=${encodeURIComponent(token)}` : ""}`,
    },
    restorePassword: {
      path: "/restore-password",
      getHref: (token?: string | null) =>
        `/restore-password${token ? `?token=${encodeURIComponent(token)}` : ""}`,
    },
  },

  app: {
    root: {
      path: "/app",
      getHref: () => "/app",
    },
    coberturaReservaCupo: {
      path: "cobertura/reserva-de-cupo",
      getHref: () => "/app/cobertura/reserva-de-cupo",
    },
    coberturaPreMatricula: {
      path: "cobertura/pre-matricula",
      getHref: () => "/app/cobertura/pre-matricula",
    },
    coberturaInscritos: {
      path: "cobertura/inscritos",
      getHref: () => "/app/cobertura/inscritos",
    },
    coberturaInscritoDetalle: {
      path: "cobertura/inscritos/$enrollmentId",
      getHref: (enrollmentId: string) =>
        `/app/cobertura/inscritos/${enrollmentId}`,
    },
    coberturaMatricula: {
      path: "cobertura/matricula",
      getHref: () => "/app/cobertura/matricula",
    },
    coberturaMatriculaAgregar: {
      path: "cobertura/matricula/agregar",
      getHref: () => "/app/cobertura/matricula/agregar",
    },
    coberturaMatriculaConfiguracion: {
      path: "cobertura/matricula/configuracion",
      getHref: () => "/app/cobertura/matricula/configuracion",
    },
    // Bajo `detalle/`, no `matricula/$matriculaId` a secas: un dinámico de un
    // solo segmento ahí colisionaría con los estáticos de al lado (`agregar`,
    // `configuracion`) — mismo motivo por el que establecimiento cuelga su
    // edición de `editar/$id`, no de `$id` suelto.
    coberturaMatriculaDetalle: {
      path: "cobertura/matricula/detalle/$matriculaId",
      getHref: (matriculaId: string) => `/app/cobertura/matricula/detalle/${matriculaId}`,
    },
    coberturaMatriculaEditar: {
      path: "cobertura/matricula/detalle/$matriculaId/editar",
      getHref: (matriculaId: string) => `/app/cobertura/matricula/detalle/${matriculaId}/editar`,
    },
    // Las dos vistas del registro de actividad (por sesión y por tablas)
    // cuelgan del mismo prefijo `registro-de-actividad` para que el item del
    // menú pueda marcarse activo en cualquiera de las dos y en sus subrutas
    // (ver `resolveNavPathname` en nav-main.tsx). El prefijo a secas no es una
    // ruta: no hay pantalla que mostrar ahí.
    auditoriaSesiones: {
      path: "registro-de-actividad/sesiones",
      getHref: () => "/app/registro-de-actividad/sesiones",
    },
    auditoriaSesionOperaciones: {
      path: "registro-de-actividad/sesiones/$sessionId/operaciones",
      getHref: (sessionId: string) =>
        `/app/registro-de-actividad/sesiones/${sessionId}/operaciones`,
    },
    auditoriaTablas: {
      path: "registro-de-actividad/tablas",
      getHref: () => "/app/registro-de-actividad/tablas",
    },
    auditoriaTablaDetalle: {
      path: "registro-de-actividad/tablas/$tableSlug",
      getHref: (tableSlug: string) => `/app/registro-de-actividad/tablas/${tableSlug}`,
    },
    rolesMenus: {
      path: "administracion/roles-menus",
      getHref: () => "/app/administracion/roles-menus",
    },
    periodosAcademicos: {
      path: "establecimiento-educativo/periodos",
      getHref: () => "/app/establecimiento-educativo/periodos",
    },
    periodosAcademicosAgregar: {
      path: "establecimiento-educativo/periodos/agregar",
      getHref: () => "/app/establecimiento-educativo/periodos/agregar",
    },
    periodosAcademicosEditar: {
      path: "establecimiento-educativo/periodos/$periodId/editar",
      getHref: (periodId: number | string) =>
        `/app/establecimiento-educativo/periodos/${periodId}/editar`,
    },
    establishments: {
      root: {
          path: "establecimiento-educativo",
          getHref: () => "/app/establecimiento-educativo",
      },

      general: {
          path: "establecimiento-educativo/general",
          getHref: () => "/app/establecimiento-educativo/general",
      },

        add: {
          path: "establecimiento-educativo/agregar",
          getHref: () => "/app/establecimiento-educativo/agregar",
        },

        edit: {
          path: "establecimiento-educativo/editar/$establishmentId",
          getHref: (establishmentId: string | number) => `/app/establecimiento-educativo/editar/${establishmentId}`,
        },

      campuses: {
          path: "establecimiento-educativo/sedes",
          getHref: () => "/app/establecimiento-educativo/sedes",
      },

      officials: {
          path: "establecimiento-educativo/funcionarios",
          getHref: () => "/app/establecimiento-educativo/funcionarios",
      },

      academicPeriods: {
          path: "establecimiento-educativo/periodos",
          getHref: () => "/app/establecimiento-educativo/periodos",
      },
  },

    // Las dos vistas del Planeador (actividades y unidades temáticas)
    // cuelgan del mismo prefijo `planeador`, igual que las de registro de
    // actividad: así el ítem del menú se marca activo en cualquiera de las
    // dos y en sus subrutas. El prefijo a secas no es una ruta.
    planeadorActividades: {
      path: "planeador/actividades",
      getHref: () => "/app/planeador/actividades",
    },
    // Segmento estático `agregar`, hermano de `$actividadId`: TanStack
    // Router resuelve los segmentos estáticos antes que los dinámicos, así
    // que no choca con el detalle/editar (mismo criterio documentado en
    // `establishments.add` vs `establishments.edit`).
    planeadorActividadCrear: {
      path: "planeador/actividades/agregar",
      getHref: () => "/app/planeador/actividades/agregar",
    },
    planeadorActividadEditar: {
      path: "planeador/actividades/$actividadId/editar",
      getHref: (actividadId: string) => `/app/planeador/actividades/${actividadId}/editar`,
    },
    planeadorUnidades: {
      path: "planeador/unidades",
      getHref: () => "/app/planeador/unidades",
    },
    // Misma idea que `planeadorActividadCrear`/`planeadorActividadEditar`:
    // páginas aparte, no modales — el detalle de la unidad no tiene ruta
    // propia (vive en `?unidad=` sobre `planeadorUnidades`), así que
    // "editar" no necesita el segmento intermedio que sí usa Actividad.
    planeadorUnidadCrear: {
      path: "planeador/unidades/agregar",
      getHref: () => "/app/planeador/unidades/agregar",
    },
    planeadorUnidadEditar: {
      path: "planeador/unidades/editar/$unidadId",
      getHref: (unidadId: string) => `/app/planeador/unidades/editar/${unidadId}`,
    },
    // El recurso a previsualizar viaja por `search` (ver
    // `planeadorRecursoPreviewSearchSchema`), no por params: un recurso recién
    // agregado en el form todavía no tiene contraparte en el mock backend, así
    // que no hay id contra el cual buscarlo.
    planeadorRecursoPreview: {
      path: "planeador/recursos/vista-previa",
      getHref: () => "/app/planeador/recursos/vista-previa",
    },
    planeadorPlanilla: {
      path: "planeador/planilla",
      getHref: () => "/app/planeador/planilla",
    },
    gestionAcademicaInformes: {
      path: "gestion-academica/informes",
      getHref: () => "/app/gestion-academica/informes",
    },
    // La planilla del informe se identifica por (grupo, asignatura, período),
    // no por docente: es la asignatura la que se consolida, y el mismo par
    // grupo/asignatura puede tener más de un docente asignado.
    gestionAcademicaInformesPlanilla: {
      path: "gestion-academica/informes/planilla/$grupoId/$asignaturaId/$periodoId",
      getHref: (grupoId: number | string, asignaturaId: number | string, periodoId: number | string) =>
        `/app/gestion-academica/informes/planilla/${grupoId}/${asignaturaId}/${periodoId}`,
    },
    gestionAcademicaReferentesCurriculares: {
      path: "gestion-academica/referentes-curriculares",
      getHref: () => "/app/gestion-academica/referentes-curriculares",
    },
    gestionAcademicaReferentesCurricularesDetalle: {
      path: "gestion-academica/referentes-curriculares/detalle/$curricularReferenceId",
      getHref: (curricularReferenceId: number | string) =>
        `/app/gestion-academica/referentes-curriculares/detalle/${curricularReferenceId}`,
    },
    asistencia: {
      path: "asistencia",
      getHref: () => "/app/asistencia",
    },
    asistenciaSeguimiento: {
      path: "asistencia/seguimiento",
      getHref: () => "/app/asistencia/seguimiento",
    },
    asistenciaManual: {
      path: "asistencia/manual",
      getHref: () => "/app/asistencia/manual",
    },
  },
} as const
