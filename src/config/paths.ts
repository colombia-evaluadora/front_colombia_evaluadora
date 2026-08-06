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
    // Las dos vistas del registro de actividad (por sesión y por tablas)
    // cuelgan del mismo prefijo `registro-de-actividad` para que el item del
    // menú pueda marcarse activo en cualquiera de las dos y en sus subrutas
    // (ver `resolveNavPathname` en nav-main.tsx).
    registroActividad: {
      path: "registro-de-actividad",
      getHref: () => "/app/registro-de-actividad",
    },
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
          getHref: (establishmentId: string) => `/app/establecimiento-educativo/editar/${establishmentId}`,
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
