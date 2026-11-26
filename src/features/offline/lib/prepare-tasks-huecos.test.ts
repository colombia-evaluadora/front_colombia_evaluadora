// Huecos que dejó la auditoría como rector (preparar, cortar la red, recorrer): cada key sembrada
// sale de la MISMA factory que usa la pantalla, así un cambio de key en la pantalla rompe este test.
import { hashKey, QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import type { PrepareContext, PrepareTask } from "@/features/offline/lib/prepare-engine"
import { buildPrepareTasks } from "@/features/offline/lib/prepare-tasks"
import { BITACORA_MODULOS_SIN_PREPARAR } from "@/features/offline/lib/prepare-tasks-administracion"
import { MAX_DETALLES, MAX_PAGINAS } from "@/features/offline/lib/prepare-tasks-cobertura"
import { MAX_PAGINAS_GE } from "@/features/offline/lib/prepare-tasks-gestion-estudiantil"
import { navigationKeys } from "@/features/navigation/api/query-keys"
import { asistenciaKeys } from "@/features/academic-management/asistencia/api/query-keys"
import { bitacoraKeys } from "@/features/bitacora/api/query-keys"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { opcionesCupoKey } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { selectCategoryQueryKey } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"
import { piarKeys } from "@/features/gestion-estudiantil/inclusion/piar/api/query-keys"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { esModuloPersistible } from "@/lib/offline/modulos-persistibles"

vi.mock("@/features/offline/lib/prepare-query", () => ({
  prepareQuery: (_client: unknown, _ctx: unknown, { fetch }: { fetch: () => Promise<unknown> }) => fetch(),
}))

const HOY = new Date()
const FECHA = `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, "0")}-${String(HOY.getDate()).padStart(2, "0")}`

// Una fila que sirve de listado, detalle y opción a la vez.
const FILA = {
  id: 5,
  pk_sede: 1,
  fk_establecimiento: 7,
  fk_testablecimiento: 7,
  establecimientoId: 7,
  fk_tsede: 1,
  fk_tgrupo: 3,
  fecha: FECHA,
  anio: 2026,
  es_actual: true,
  total_count: 1,
  page_count: 1,
  datos: [],
  puede_ver_piar: true,
  puede_ver_informe: true,
  informe_requiere_sede: false,
  ver_embarazo: true,
  // Página de sedes (`fn_sed_listar_paginado`): una fila con `rows` adentro.
  rows: [{ pk_sede: 5, fk_testablecimiento: 7 }],
}
const respuesta = () => ({ rows: [FILA], pageCount: 1, totalCount: 1 })

vi.mock("@/lib/api-client", async (original) => ({
  ...(await original<typeof import("@/lib/api-client")>()),
  api: { get: async () => respuesta(), post: async () => respuesta(), query: async () => respuesta() },
}))
vi.mock("@/lib/eval-col-client", () => ({
  evalCol: {
    getRows: async () => [FILA],
    postRows: async () => [FILA],
    getRow: async () => FILA,
  },
}))

const RUTAS = [
  "establecimiento-educativo/general",
  "establecimiento-educativo/sedes",
  "establecimiento-educativo/periodos",
  "asistencia",
  "comunicaciones/chat",
  "cobertura/matricula",
  "cobertura/inscritos",
  "gestion-estudiantil/inclusion-orientacion",
  "gestion-estudiantil/prevencion-retencion",
  "registro-de-actividad/bitacora/evaluacion-del-desempeno",
  "registro-de-actividad/bitacora/establecimiento",
]

async function preparar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(navigationKeys.menu, RUTAS.map((r) => ({ url: `/app/${r}` })))
  const ctx = { stats: { archivoBytes: 0 }, staleTime: 0, force: false, counters: {}, probes: new Map(), seen: new Set() }
  const cola: PrepareTask[] = buildPrepareTasks(client, {
    options: { grupos: [], asignaturas: [], periodos: [] },
    selection: { grupos: new Set(), asignaturas: new Set(), periodos: new Set() } as never,
    incluirArchivos: false,
    roles: ["CEVAL-RECTOR"],
    now: HOY,
  })
  for (let i = 0; i < cola.length && i < 5000; i++) {
    try {
      cola.push(...((await cola[i].run(client, ctx as unknown as PrepareContext)) ?? []))
    } catch {
      // Una forma de respuesta que el mock no imita: la tarea falla, las demás siguen.
    }
  }
  const hashes = new Set(cola.map((t) => hashKey(t.queryKey)))
  return { cola, tiene: (key: readonly unknown[]) => hashes.has(hashKey(key)) }
}

describe("huecos de la preparación (auditoría como rector)", async () => {
  const { cola, tiene } = await preparar()

  it("detalle y editar del EE y de la sede, con sus catálogos", () => {
    expect(tiene(establishmentKeys.detalle(5))).toBe(true)
    expect(tiene(["catalogs", "ownership-types"])).toBe(true)
    expect(tiene(["catalogs", "municipalities"])).toBe(true)
    expect(tiene(["catalogs", "etnias"])).toBe(true)
    expect(tiene(["catalogs", "disability-types"])).toBe(true)
    expect(tiene(campusKeys.detalle(5))).toBe(true)
    expect(tiene(campusKeys.especialidades(5))).toBe(true)
  })

  it("Ver/Editar del período con sus pestañas y cada grado", () => {
    expect(tiene(academicPeriodKeys.academicPeriod.detail(5))).toBe(true)
    expect(tiene(academicPeriodKeys.evaluationCriteria.byPeriod(5))).toBe(true)
    expect(tiene(academicPeriodKeys.academicCalendar.byPeriod(5))).toBe(true)
    expect(tiene(academicPeriodKeys.ratingScales.list({ filters: {}, sorting: [], academicPeriodId: 5 }))).toBe(true)
    const grados = { filters: {}, sorting: [], pageIndex: 0, pageSize: 200, academicPeriodId: 5 }
    expect(tiene(academicPeriodKeys.grades.list(grados))).toBe(true)
    expect(tiene(academicPeriodKeys.horario.byGrade(5))).toBe(true)
    expect(tiene(academicPeriodKeys.gradeGroups.list({ filters: {}, sorting: [], pageIndex: 0, pageSize: 100, gradeId: 5 }))).toBe(true)
  })

  it("cobertura: capacidades de matrícula y opciones de cupo", () => {
    expect(tiene(matriculaKeys.capacidades)).toBe(true)
    expect(tiene(opcionesCupoKey)).toBe(true)
  })

  it("asistencia diaria y días inhábiles con los params de la pantalla", () => {
    const mes = { SEDE: 1, ANIO: HOY.getFullYear(), MES: HOY.getMonth() + 1 }
    expect(tiene(asistenciaKeys.diaria.calendario(mes))).toBe(true)
    expect(tiene(asistenciaKeys.diasInhabiles(mes))).toBe(true)
    expect(tiene(asistenciaKeys.diaria.grupos(1))).toBe(true)
  })

  it("chat: hilos con acudientes y jornadas de la elección", () => {
    expect(tiene(chatKeys.hilosAcudientes)).toBe(true)
    expect(tiene(chatKeys.hilosAcudientesOpciones)).toBe(true)
    expect(tiene(chatKeys.jornadasEleccion)).toBe(true)
    expect(tiene(chatKeys.disponibilidad)).toBe(false)
  })

  it("gestión estudiantil: filtros del PIAR, informe del año actual y estados de acompañamiento", () => {
    expect(tiene([...piarKeys.all, "opciones-grupos"])).toBe(true)
    expect(tiene(piarKeys.gradosFiltro())).toBe(true)
    expect(tiene(["inclusion", "informe", { establecimiento: 7, sede: "", anio: "2026", grado: "" }])).toBe(true)
    expect(tiene(["inclusion", "informe", { establecimiento: 7, sede: "", anio: "", grado: "" }])).toBe(false)
    expect(tiene(prevencionKeys.opciones.acompEstados(7))).toBe(true)
    expect(tiene(selectCategoryQueryKey("ESTADO_PIAR"))).toBe(true)
  })

  it("bitácora: sin Evaluación del desempeño (el servidor responde 400)", () => {
    expect(BITACORA_MODULOS_SIN_PREPARAR).toContain("EVALUACION_DESEMPENO")
    const listas = cola.filter((t) => hashKey(t.queryKey).includes('"bitacora"'))
    expect(listas.some((t) => JSON.stringify(t.queryKey).includes("EVALUACION_DESEMPENO"))).toBe(false)
    expect(tiene(bitacoraKeys.entidades("ESTABLECIMIENTO"))).toBe(true)
  })

  it("topes: todas las páginas (hasta 200) y hasta 2000 detalles", () => {
    expect(MAX_PAGINAS).toBe(200)
    expect(MAX_PAGINAS_GE).toBe(200)
    expect(MAX_DETALLES).toBe(2000)
  })

  it("toda key sembrada se persiste", () => {
    const fuera = cola
      .map((t) => t.queryKey)
      .filter((k) => !esModuloPersistible(k) && !["planeador", "notificaciones", "archivo", "offline", "zonas-sede", "especialidades-sede-catalogo", "teaching-levels", "general-areas", "curriculum-nodes", "grade-rotulos-referente", "sedes"].includes(String(k[0])))
    expect([...new Set(fuera.map((k) => String(k[0])))]).toEqual([])
  })
})
