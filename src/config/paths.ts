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
    auditoria: {
      path: "auditoria",
      getHref: () => "/app/auditoria",
    },
    auditoriaTablas: {
      path: "auditoria-tablas",
      getHref: () => "/app/auditoria-tablas",
    },
    auditoriaTablaDetalle: {
      path: "auditoria-tablas/$slug",
      getHref: (slug: string) => `/app/auditoria-tablas/${slug}`,
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
