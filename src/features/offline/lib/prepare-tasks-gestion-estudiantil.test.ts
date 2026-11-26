import { hashKey, QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PrepareContext, PrepareTask } from "@/features/offline/lib/prepare-engine"
import { gestionEstudiantilTasks, MAX_PAGINAS_GE } from "@/features/offline/lib/prepare-tasks-gestion-estudiantil"
import { navigationKeys } from "@/features/navigation/api/query-keys"
import { citacionesKeys } from "@/features/gestion-estudiantil/citaciones/api/query-keys"
import { toCitacionesFilters } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import { CITACIONES_FILTROS_VACIOS } from "@/features/gestion-estudiantil/citaciones/api/types"
import { opcionesGeKeys } from "@/features/gestion-estudiantil/commons/api/use-opciones-ge"
import { comiteKeys, convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import { observacionesKeys } from "@/features/gestion-estudiantil/observaciones/api/query-keys"
import { toObservacionesFilters } from "@/features/gestion-estudiantil/observaciones/api/query/use-observaciones-query"
import { OBSERVACIONES_FILTROS_VACIOS } from "@/features/gestion-estudiantil/observaciones/api/types"
import { observadorKeys } from "@/features/gestion-estudiantil/observador/api/query-keys"
import { toObservadorFilters } from "@/features/gestion-estudiantil/observador/api/query/use-anotaciones-query"
import { FILTROS_VACIOS } from "@/features/gestion-estudiantil/observador/api/types"
import { piarKeys } from "@/features/gestion-estudiantil/inclusion/piar/api/query-keys"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { toEstrategiasFilters } from "@/features/gestion-estudiantil/prevencion/api/query/use-estrategias-query"
import { toTableroFilters } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import { ESTRATEGIAS_FILTROS_VACIOS, TABLERO_FILTROS_VACIOS } from "@/features/gestion-estudiantil/prevencion/api/types"
import { capacidadesGeKeys } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"
import { configuracionKeys } from "@/features/gestion-estudiantil/configuracion/api/query-keys"
import { reconocimientosKeys } from "@/features/gestion-estudiantil/reconocimientos/api/query-keys"
import { toReconocimientosFilters } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import { RECONOCIMIENTOS_FILTROS_VACIOS } from "@/features/gestion-estudiantil/reconocimientos/api/types"
import { reintegracionKeys } from "@/features/gestion-estudiantil/reintegracion/api/query-keys"
import { toCasosFilters } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import { CASOS_FILTROS_VACIOS } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { esModuloPersistible } from "@/lib/offline/modulos-persistibles"

const http = vi.hoisted(() => ({ urls: [] as string[], total: 11, sedes: 1, veOrientacion: true }))

function responder(url: string): unknown[] {
  http.urls.push(url)
  if (url.includes("/opciones/sedes-jornadas"))
    return [{ fk_testablecimiento: 7, fk_tsede: 1, sede_nombre: "S", fk_tlv_jornada: 3, jornada_nombre: "M" }]
  if (url.includes("/opciones/establecimientos"))
    return Array.from({ length: http.sedes }, (_, i) => ({ fk_testablecimiento: 7 + i, establecimiento_nombre: "EE" }))
  if (url.includes("/opciones/sedes"))
    return Array.from({ length: http.sedes }, (_, i) => ({ fk_tsede: i + 1, fk_testablecimiento: 7 + i, nombre: "S" }))
  if (url.includes("/opciones/anos")) return [{ anio: 2026, es_actual: true }]
  if (url.includes("/opciones/jornadas")) return [{ fk_tlv_jornada: 3, nombre: "M" }]
  if (url.includes("/opciones/periodos")) return [{ fk_tperiodo_evaluacion: 9, nombre: "P1", en_curso: true }]
  if (url.includes("/comite/periodos")) return [{ fk_periodo: 4, abierto: true }]
  if (/comite\/periodo\/4$/.test(url)) return [{ comite: { fk_comite: 40 } }]
  if (url.includes("/capacidades"))
    return [{ observador_puede_ver_mis_reportes: true, comite_puede_ver: true }]
  if (url.includes("/inclusion/acceso"))
    return [{ puede_ver_piar: true, puede_ver_orientacion: http.veOrientacion, puede_ver_aviso_sin_piar: http.veOrientacion, puede_ver_informe: true }]
  if (url.includes("/prevencion/acceso"))
    return [
      {
        puede_indicadores: true,
        puede_indicadores_gestion: true,
        puede_salud_mental: true,
        puede_estrategias: true,
        puede_caracterizacion: true,
        ver_embarazo: true,
        ver_consumo: true,
        ver_reportes_consumo: true,
        ver_gestion_alertas: true,
      },
    ]
  // Cualquier otra lectura: sirve como fila de listado y como detalle desenvuelto.
  return [
    {
      id: 5,
      pk: 5,
      fk_tmatricula: 50,
      fk_tprevencion_plan: 60,
      total_count: http.total,
      datos: { registra_asistencia: true, valoracion: {}, fk_tprevencion_valoracion: 61 },
      caso: {},
      proceso: {},
      sesion: {},
      resultado: {},
    },
  ]
}

vi.mock("@/lib/eval-col-client", () => ({
  evalCol: {
    getRows: async (url: string) => responder(url),
    postRows: async (url: string) => responder(url),
    getRow: async (url: string) => responder(url)[0],
  },
}))
vi.mock("@/lib/api-client", async (original) => ({
  ...(await original<typeof import("@/lib/api-client")>()),
  api: { get: async () => ({ rows: [] }) },
}))

const MODULOS = [
  "observador",
  "convivencia",
  "citaciones-compromisos",
  "inclusion-orientacion",
  "prevencion-retencion",
  "reconocimientos",
  "reintegracion",
  "observaciones-sugerencias",
  "actividades-extracurriculares",
  "configuracion",
]

async function preparar(modulos: string[], roles = ["CEVAL-RECTOR"]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(navigationKeys.menu, modulos.map((m) => ({ url: `/app/gestion-estudiantil/${m}` })))
  const ctx: PrepareContext = {
    stats: { archivoBytes: 0 },
    staleTime: 0,
    force: false,
    counters: { fresh: 0, notModified: 0, fetched: 0 },
    probes: new Map(),
    probesInFlight: 0,
    seen: new Set(),
  }
  const cola: PrepareTask[] = gestionEstudiantilTasks(client, roles)
  for (let i = 0; i < cola.length; i++) cola.push(...((await cola[i].run(client, ctx)) ?? []))
  const hashes = new Set(client.getQueryCache().getAll().map((q) => q.queryHash))
  return { client, cola, tiene: (key: readonly unknown[]) => hashes.has(hashKey(key)) }
}

beforeEach(() => {
  http.urls = []
  http.total = 11
  http.sedes = 1
})

describe("gestionEstudiantilTasks", () => {
  it("sin menú no siembra nada y cada bloque va detrás de su ruta", async () => {
    expect((await preparar([])).cola).toHaveLength(0)
    await preparar(["citaciones-compromisos"])
    expect(http.urls.some((u) => u.includes("/prevencion/"))).toBe(false)
  })

  it("listados con la key de la pantalla, todas las páginas y el detalle de cada fila", async () => {
    const { tiene } = await preparar(MODULOS)
    const filters = toObservadorFilters("", FILTROS_VACIOS)
    expect(tiene(observadorKeys.lista({ filters, pageIndex: 0, pageSize: 10 }))).toBe(true)
    expect(tiene(observadorKeys.lista({ filters, pageIndex: 1, pageSize: 10 }))).toBe(true)
    expect(tiene(observadorKeys.lista({ filters, pageIndex: 2, pageSize: 10 }))).toBe(false)
    expect(tiene(observadorKeys.detalle(5))).toBe(true)
    expect(tiene(observadorKeys.codigos(7))).toBe(true)
    expect(tiene(observadorKeys.opciones("responsables", "ESTABLECIMIENTO=7"))).toBe(true)
    const citas = { filters: toCitacionesFilters("", CITACIONES_FILTROS_VACIOS), pageIndex: 0, pageSize: 10 }
    expect(tiene(citacionesKeys.citaciones.lista(citas))).toBe(true)
    expect(tiene(citacionesKeys.compromisos.detalle(5))).toBe(true)
    expect(tiene(convivenciaKeys.pasos(5))).toBe(true)
    expect(tiene(comiteKeys.sesiones({ comite: 40, filters: { FK_TLV_TIPO: null }, pageIndex: 0, pageSize: 10 }))).toBe(true)
    const casos = { filters: toCasosFilters(7, "", CASOS_FILTROS_VACIOS), pageIndex: 0, pageSize: 10 }
    expect(tiene(reintegracionKeys.casos(casos))).toBe(true)
    const tablero = { filters: toTableroFilters(7, "", TABLERO_FILTROS_VACIOS), pageIndex: 0, pageSize: 10 }
    expect(tiene(prevencionKeys.tablero(tablero))).toBe(true)
    expect(tiene(prevencionKeys.historial(50))).toBe(true)
    expect(tiene(prevencionKeys.plan(60))).toBe(true)
    expect(tiene(prevencionKeys.valoracion(61))).toBe(true)
    const estrategias = { filters: toEstrategiasFilters(7, "", ESTRATEGIAS_FILTROS_VACIOS, undefined), pageIndex: 0, pageSize: 10 }
    expect(tiene(prevencionKeys.estrategias(estrategias))).toBe(true)
    // El detalle de la estrategia pagina de a 20.
    expect(tiene(prevencionKeys.estrategia(5, { pageIndex: 0, pageSize: 20 }))).toBe(true)
  })

  it("observaciones: los filtros que la pantalla aplica sola (una sede, una jornada, período en curso)", async () => {
    const { client, tiene } = await preparar(["observaciones-sugerencias"])
    const sede = client.getQueryData<{ id: number }[]>(opcionesGeKeys.sedes())?.[0]
    expect(sede?.id).toBe(1)
    const conFiltros = { ...OBSERVACIONES_FILTROS_VACIOS, sede: "1", jornada: "3", periodo: "9" }
    expect(tiene(observacionesKeys.lista({ filters: toObservacionesFilters(7, "", conFiltros), pageIndex: 0, pageSize: 10 }))).toBe(true)
    http.sedes = 2
    const varias = await preparar(["observaciones-sugerencias"])
    const vacios = toObservacionesFilters(7, "", OBSERVACIONES_FILTROS_VACIOS)
    expect(varias.tiene(observacionesKeys.lista({ filters: vacios, pageIndex: 0, pageSize: 10 }))).toBe(true)
  })

  it("con varios colegios guarda capacidades, reconocimientos, observaciones y configuración de todos", async () => {
    http.sedes = 2
    const { tiene } = await preparar(MODULOS)
    expect(tiene(capacidadesGeKeys.establecimiento(7))).toBe(true)
    expect(tiene(capacidadesGeKeys.establecimiento(8))).toBe(true)
    const pagina = (filters: unknown) => ({ filters, pageIndex: 0, pageSize: 10 })
    expect(tiene(reconocimientosKeys.lista(pagina(toReconocimientosFilters(7, "", RECONOCIMIENTOS_FILTROS_VACIOS))))).toBe(true)
    // El segundo colegio se abre eligiendo su sede (id 2) en el filtro.
    const otro = { ...RECONOCIMIENTOS_FILTROS_VACIOS, sede: "2" }
    expect(tiene(reconocimientosKeys.lista(pagina(toReconocimientosFilters(8, "", otro))))).toBe(true)
    const obs = { ...OBSERVACIONES_FILTROS_VACIOS, sede: "2" }
    expect(tiene(observacionesKeys.lista(pagina(toObservacionesFilters(8, "", obs))))).toBe(true)
    expect(tiene(opcionesGeKeys.establecimientos())).toBe(true)
    expect(tiene(configuracionKeys.acceso(7))).toBe(true)
    expect(tiene(configuracionKeys.acceso(8))).toBe(true)
  })

  it("nunca pide los detalles que dejan traza de consulta o cambian estado", async () => {
    await preparar(MODULOS, ["CEVAL-RECTOR", "CEVAL-PSICO_ORIENTADOR"])
    const prohibidas =
      /piar\/\d|orientacion\/(remisiones|atenciones)\/\d|salud-mental\/\d|acompanamientos\/(\d|consumo\/reportes\/\d)|caracterizaciones\/\d|historial-academico|remisiones-externas\/\d|\/documento/
    expect(http.urls.filter((u) => prohibidas.test(u))).toEqual([])
    http.veOrientacion = false
    // El docente abre el PIAR sin traza (solo ajustes): a él sí se le guarda.
    expect((await preparar(["inclusion-orientacion"], ["CEVAL-DOCENTE"])).tiene(piarKeys.detalle(5))).toBe(true)
  })

  it("corta en el tope de páginas y toda key es de un módulo persistible", async () => {
    http.total = 10_000
    const { cola } = await preparar(MODULOS)
    const paginas = cola.filter((t) => t.queryKey[0] === "citaciones-compromisos" && t.queryKey[1] === "compromisos" && t.queryKey[2] === "lista")
    expect(paginas).toHaveLength(MAX_PAGINAS_GE)
    expect(MAX_PAGINAS_GE).toBe(200)
    expect(paginas[0].optional).toBeFalsy()
    expect(paginas[1].optional).toBe(true)
    expect(cola.filter((t) => !esModuloPersistible(t.queryKey))).toEqual([])
    // Con el tope en 200 páginas por listado la cola es larga: en CI tarda más que el default.
  }, 60_000)
})
