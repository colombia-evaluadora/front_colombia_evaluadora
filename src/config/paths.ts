export const paths = {
  home: {
    path: "/",
    getHref: () => "/",
  },

  verificarBoletin: {
    path: "/verificar/b/$codigo",
    getHref: (codigo: string) => `/verificar/b/${encodeURIComponent(codigo)}`,
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
    // Destino del enlace "Activa tu cuenta".
    activate: {
      path: "/activate",
      getHref: (token?: string | null) =>
        `/activate${token ? `?token=${encodeURIComponent(token)}` : ""}`,
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
    // Bajo `detalle/`: un `$id` suelto chocaría con `agregar` y `configuracion`.
    coberturaMatriculaDetalle: {
      path: "cobertura/matricula/detalle/$matriculaId",
      getHref: (matriculaId: string) => `/app/cobertura/matricula/detalle/${matriculaId}`,
    },
    coberturaMatriculaEditar: {
      path: "cobertura/matricula/detalle/$matriculaId/editar",
      getHref: (matriculaId: string) => `/app/cobertura/matricula/detalle/${matriculaId}/editar`,
    },
    // Mismo prefijo para las dos vistas: el ítem del menú se marca en ambas.
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
    listasValor: {
      path: "administracion/listas-valor",
      getHref: () => "/app/administracion/listas-valor",
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

        detail: {
          path: "establecimiento-educativo/detalle/$establishmentId",
          getHref: (establishmentId: string | number) => `/app/establecimiento-educativo/detalle/${establishmentId}`,
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

    // Mismo prefijo `planeador` para todas sus vistas (un solo ítem del menú).
    planeadorActividades: {
      path: "planeador/actividades",
      getHref: () => "/app/planeador/actividades",
    },
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
    // El detalle de la unidad vive en `?unidad=`, sin ruta propia.
    planeadorUnidadCrear: {
      path: "planeador/unidades/agregar",
      getHref: () => "/app/planeador/unidades/agregar",
    },
    planeadorUnidadEditar: {
      path: "planeador/unidades/editar/$unidadId",
      getHref: (unidadId: string) => `/app/planeador/unidades/editar/${unidadId}`,
    },
    // El recurso viaja por `search`: uno recién agregado aún no tiene id.
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
    // Por (grupo, asignatura, período): una asignatura puede tener varios docentes.
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
    comunicacionesChat: {
      path: "comunicaciones/chat",
      getHref: () => "/app/comunicaciones/chat",
    },
    // Destino del guard de `/app`; lleva `?desde=<ruta pedida>`.
    sinAcceso: {
      path: "sin-acceso",
      getHref: () => "/app/sin-acceso",
    },
  },
} as const
