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
