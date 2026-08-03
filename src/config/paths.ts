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
    payments: {
      path: "/",
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
    coberturaMatricula: {
      path: "cobertura/matricula",
      getHref: () => "/app/cobertura/matricula",
    },
    auditoriaSesiones: {
      path: "auditoria-sesiones",
      getHref: () => "/app/auditoria-sesiones",
    },
    auditoriaSesionOperaciones: {
      path: "auditoria-sesiones/$sessionId/operaciones",
      getHref: (sessionId: string) => `/app/auditoria-sesiones/${sessionId}/operaciones`,
    },
    auditoriaTablas: {
      path: "auditoria-tablas",
      getHref: () => "/app/auditoria-tablas",
    },
    auditoriaTablaDetalle: {
      path: "auditoria-tablas/$tableSlug",
      getHref: (tableSlug: string) => `/app/auditoria-tablas/${tableSlug}`,
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
          getHref: (establishmentId: string) => `/app/establecimiento-educativo/editar/${establishmentId}`,
        },

      campuses: {
          path: "establecimiento-educativo/sedes",
          getHref: () => "/app/establecimiento-educativo/sedes",

          add: {
            path: "establecimiento-educativo/sedes/agregar",
            getHref: () => "/app/establecimiento-educativo/sedes/agregar",
          },

          edit: {
            path: "establecimiento-educativo/sedes/editar/$campusId",
            getHref: (campusId: string) => `/app/establecimiento-educativo/sedes/editar/${campusId}`,
          },
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
    reportes: {
      path: "reportes",
      getHref: () => "/app/reportes",
    },
    usuarios: {
      path: "usuarios",
      getHref: () => "/app/usuarios",
    },
    configuracion: {
      path: "configuracion",
      getHref: () => "/app/configuracion",
    },
  },
} as const
