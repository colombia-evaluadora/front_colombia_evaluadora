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
