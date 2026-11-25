import { hashKey, QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { administradorKeys } from "@/features/administration/administradores-territoriales/api/query-keys"
import { areaOficialKeys } from "@/features/administration/areas-oficiales/api/query-keys"
import { auditKeys } from "@/features/administration/audits/api/query-keys"
import { conservacionKeys } from "@/features/administration/conservacion-datos/api/query-keys"
import { criterioPrioridadKeys } from "@/features/administration/criterios-prioridad/api/query-keys"
import { festivoKeys } from "@/features/administration/festivos/api/query-keys"
import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import { parametrosEdadKeys } from "@/features/administration/parametros-edad/api/query-keys"
import { relacionesAlumnoGrupoKeys } from "@/features/administration/relaciones-alumno-grupo/api/query-keys"
import { roleMenuKeys } from "@/features/administration/roles-menus/api/query-keys"
import { superadministradorKeys } from "@/features/administration/superadministradores/api/query-keys"
import { supervisorKeys } from "@/features/administration/supervisores-territoriales/api/query-keys"
import { bitacoraKeys } from "@/features/bitacora/api/query-keys"
import { filtrosVacios } from "@/features/bitacora/lib/filtros-por-defecto"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { comunicadosSearchSchema } from "@/features/comunicaciones/comunicados/api/schema"
import {
  comunicadosGestionListaKey,
  fetchComunicadosGestion,
  seguimientoComunicadoKey,
} from "@/features/comunicaciones/comunicados/api/comunicados-gestion"
import { espaciosKeys } from "@/features/comunicaciones/espacios/api/query/use-espacios-query"
import { procesosKeys } from "@/features/comunicaciones/procesos/api/procesos"
import { territorialKeys } from "@/features/comunicaciones/territorial/api/comunicados-territorial"
import { navigationKeys } from "@/features/navigation/api/query-keys"
import type { PrepareContext, PrepareTask } from "@/features/offline/lib/prepare-engine"
import { administracionTasks, partesEleccion } from "@/features/offline/lib/prepare-tasks-administracion"
import { esModuloPersistible } from "@/lib/offline/modulos-persistibles"

vi.mock("@/features/offline/lib/prepare-query", () => ({
  prepareQuery: (_client: unknown, _ctx: unknown, { fetch }: { fetch: () => Promise<unknown> }) => fetch(),
}))
vi.mock("@/features/comunicaciones/comunicados/api/comunicados-gestion", async (original) => ({
  ...(await original<object>()),
  fetchComunicadosGestion: vi.fn(),
}))

const ROLES_MENU = [
  "administracion/roles-menus", "administracion/listas-valor", "administracion/areas-oficiales",
  "administracion/superadministradores", "administracion/supervisores-territoriales",
  "administracion/administradores-territoriales", "administracion/criterios-prioridad",
  "administracion/parametros-edad", "administracion/relaciones-alumno-grupo", "administracion/festivos",
  "administracion/conservacion-datos", "registro-de-actividad/sesiones", "comunicaciones/chat",
  "comunicaciones/comunicados", "comunicaciones/comunicados-territorial", "comunicaciones/procesos",
].map((ruta) => ({ url: `/app/${ruta}` }))

function cliente(menu: { url: string }[], crear: string[] = []) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(navigationKeys.menu, menu)
  queryClient.setQueryData(
    navigationKeys.permisosMenu,
    crear.map((codigo) => ({ codigo, puede_crear: true })),
  )
  return queryClient
}

const hashes = (tareas: PrepareTask[]) => tareas.map((t) => hashKey(t.queryKey))

beforeEach(() => vi.mocked(fetchComunicadosGestion).mockReset())

describe("administracionTasks", () => {
  it("sin menú no siembra nada", () => {
    expect(administracionTasks(cliente([]), ["CEVAL-SUPER_ADMINISTRADOR"])).toEqual([])
  })

  it("siembra las keys de las pantallas con sus valores por defecto", () => {
    const tareas = administracionTasks(cliente(ROLES_MENU, ["COMUNICADOS"]), ["CEVAL-RECTOR"])
    const pagina = { pageIndex: 0, pageSize: 10, sorting: [] }
    const search = comunicadosSearchSchema.parse({})
    const esperadas = [
      roleMenuKeys.roles, roleMenuKeys.menus.all, roleMenuKeys.menus.catalogo, listaValorKeys.categorias,
      listaValorKeys.iconos, listaValorKeys.valores("GRADOS"), listaValorKeys.valores("CALENDARIO"),
      areaOficialKeys.lista, superadministradorKeys.lista, superadministradorKeys.tiposDocumento,
      supervisorKeys.lista, supervisorKeys.catalogos, administradorKeys.lista, administradorKeys.catalogos,
      criterioPrioridadKeys.lista, criterioPrioridadKeys.campos, parametrosEdadKeys.all, relacionesAlumnoGrupoKeys.all,
      festivoKeys.lista, conservacionKeys.politicas, conservacionKeys.modulos, conservacionKeys.establecimientos,
      // Con las claves indefinidas que arman los hooks de filtros.
      auditKeys.sesiones.lista({
        ...pagina,
        filters: { author: undefined, status: undefined, startedFrom: undefined, startedTo: undefined },
      }),
      auditKeys.sesiones.stats({ filters: { author: undefined } }),
      auditKeys.estadosSesion,
      auditKeys.tablas.lista({ ...pagina, filters: { name: undefined } }),
      bitacoraKeys.lista({ ...pagina, filters: filtrosVacios(), verSistema: false }),
      bitacoraKeys.lista({
        ...pagina,
        filters: { ...filtrosVacios(), modulo: "ADMINISTRACION", accion: ["ACCESO"] },
        verSistema: false,
      }),
      bitacoraKeys.entidades("COBERTURA"), bitacoraKeys.sedes(), ["select-category", "JORNADA"],
      ...(["PUBLICADOS", "RECIBIDOS", "ANTERIORES"] as const).map((pestana) =>
        comunicadosGestionListaKey({ ...search, q: undefined, estado: undefined, pestana }),
      ),
      territorialKeys.lista({ q: undefined, sortBy: undefined }, 0, 10), territorialKeys.establecimientos,
      espaciosKeys.lista(), procesosKeys.mios(), procesosKeys.lista(),
    ].map((key) => hashKey(key))
    expect(hashes(tareas)).toEqual(expect.arrayContaining(esperadas))
    expect(new Set(hashes(tareas)).size).toBe(tareas.length)
  })

  it("toda tarea queda guardada: con meta offline propia o raíz persistible", () => {
    const tareas = administracionTasks(cliente(ROLES_MENU, ["COMUNICADOS", "PROCESOS_CREAR"]), ["CEVAL-SUPER_ADMINISTRADOR"])
    // Lo que la pantalla guarda con su propia meta (el resto, por la raíz de su key).
    const conMetaPropia = ["teaching-levels"]
    for (const { queryKey } of tareas) {
      expect(esModuloPersistible(queryKey) || conMetaPropia.includes(String(queryKey[0])), String(queryKey[0])).toBe(true)
    }
  })

  it("nunca siembra el archivo histórico (cada consulta queda en la Bitácora)", () => {
    const keys = hashes(administracionTasks(cliente(ROLES_MENU), ["CEVAL-SUPER_ADMINISTRADOR"]))
    expect(keys.some((k) => k.includes('"conservacion-datos","archivo"'))).toBe(false)
  })

  it("sin permiso de publicar no pide Publicados", () => {
    const keys = hashes(administracionTasks(cliente(ROLES_MENU), ["CEVAL-DOCENTE"]))
    expect(keys.some((k) => k.includes("PUBLICADOS"))).toBe(false)
  })

  it("de los comunicados solo baja el detalle de los propios y los ya leídos, y las páginas hasta 20", async () => {
    const queryClient = cliente([{ url: "/app/comunicaciones/comunicados" }], [])
    vi.mocked(fetchComunicadosGestion).mockResolvedValue({
      items: [
        { id: 1, esAutor: true, leido: null },
        { id: 2, esAutor: false, leido: false },
        { id: 3, esAutor: false, leido: true },
        { id: 4, esAutor: false, leido: null },
      ] as never,
      totalCount: 900,
      pageCount: 90,
    })
    const [recibidos] = administracionTasks(queryClient, [])
    const hijas = (await recibidos.run(queryClient, {} as PrepareContext)) as PrepareTask[]
    const keys = hashes(hijas)
    expect(keys).toContain(hashKey(chatKeys.comunicado(1)))
    expect(keys).toContain(hashKey(seguimientoComunicadoKey(1)))
    expect(keys).toContain(hashKey(chatKeys.comunicado(3)))
    expect(keys).not.toContain(hashKey(chatKeys.comunicado(2)))
    expect(keys).not.toContain(hashKey(chatKeys.comunicado(4)))
    expect(keys.filter((k) => k.includes("RECIBIDOS"))).toHaveLength(19)
  })
})

describe("partes de una elección", () => {
  it("según las funciones de la persona", () => {
    expect(partesEleccion({ misFunciones: [] }, "VOTACION")).toEqual(["candidaturas", "actas", "reclamaciones", "designaciones"])
    expect(partesEleccion({ misFunciones: ["ADMINISTRADOR"] }, "VOTACION")).toContain("padron")
    expect(partesEleccion({ misFunciones: ["ADMINISTRADOR"] }, "SELECCION_MOTIVADA")).not.toContain("padron")
    expect(partesEleccion({ misFunciones: ["REVISOR"] }, "VOTACION")).toContain("postulaciones")
  })
})
