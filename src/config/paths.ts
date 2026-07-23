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
    auditoriaSesiones: {
      path: "auditoria-sesiones",
      getHref: () => "/app/auditoria-sesiones",
    },
    auditoriaSesionOperaciones: {
      path: "auditoria-sesiones/$sessionId/operaciones",
      getHref: (sessionId: string) =>
        `/app/auditoria-sesiones/${sessionId}/operaciones`,
    },
    auditoriaTablas: {
      path: "auditoria-tablas",
      getHref: () => "/app/auditoria-tablas",
    },
    auditoriaTablaDetalle: {
      path: "auditoria-tablas/$tableSlug",
      getHref: (tableSlug: string) => `/app/auditoria-tablas/${tableSlug}`,
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
