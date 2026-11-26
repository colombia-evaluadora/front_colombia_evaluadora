import { hashKey, QueryClient, type QueryKey } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { actualizacionKeys } from "@/features/coverage/actualizacion-datos/api/actualizacion"
import { inscripcionesKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import { reservaKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import { reservasCupoKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import { territorialKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import { convocatoriaKeys } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { postulacionKeys } from "@/features/coverage/matricula-complementaria/api/postulaciones"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"
import { promocionKeys } from "@/features/coverage/promocion-nivelacion/api/promocion"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"
import { navigationKeys } from "@/features/navigation/api/query-keys"
import type { PrepareContext, PrepareTask } from "@/features/offline/lib/prepare-engine"
import { coberturaTasks } from "@/features/offline/lib/prepare-tasks-cobertura"
import { esModuloPersistible } from "@/lib/offline/modulos-persistibles"

/** Expande solo lo que está en el cache (fresco): nunca sale a la red. */
async function sembradas(url: string, cache: [QueryKey, unknown][] = []) {
  const client = new QueryClient()
  client.setQueryData(navigationKeys.menu, [{ url }])
  for (const [key, data] of cache) client.setQueryData(key, data)
  const ctx = {
    force: false,
    staleTime: Infinity,
    seen: new Set<string>(),
    probes: new Map(),
    counters: { fresh: 0, notModified: 0, fetched: 0 },
  } as unknown as PrepareContext
  const cola = coberturaTasks(client, [])
  const vistas = new Map<string, PrepareTask>()
  for (const task of cola) {
    vistas.set(hashKey(task.queryKey), task)
    if (task.expands && client.getQueryData(task.queryKey) !== undefined) {
      cola.push(...((await task.run(client, ctx)) ?? []))
    }
  }
  return { tasks: cola, get: (key: QueryKey) => vistas.get(hashKey(key)) }
}

const pagina = (rows: unknown[], pageCount = 1) => ({ rows, pageCount, totalCount: rows.length })
const PAG = { pageIndex: 0, pageSize: 10 }

describe("coberturaTasks: keys de las pantallas con sus valores por defecto", () => {
  it("sin el menú no siembra nada", async () => {
    expect((await sembradas("/app/planeador/actividades")).tasks).toEqual([])
  })

  it("matrícula: lista obligatoria y recortada; detalle completo y opcional; páginas con tope", async () => {
    // Como la arma `useMatriculaFilters` sin filtros en la URL: claves en undefined.
    const lista = matriculaKeys.lista({ filters: { search: undefined, campus: undefined }, sorting: [], ...PAG })
    const { get, tasks } = await sembradas("/app/cobertura/matricula", [[lista, pagina([{ id: "7" }], 999)]])
    expect(get(lista)?.optional).toBeFalsy()
    expect(get(lista)?.meta?.persistSelect).toBeTypeOf("function")
    expect(get(matriculaKeys.detalle("7"))).toMatchObject({ optional: true })
    expect(get(matriculaKeys.detalle("7"))?.meta?.persistSelect).toBeUndefined()
    expect(get(matriculaKeys.notasHomologadas("7"))).toBeDefined()
    expect(get(matriculaKeys.solicitudesPendientes())).toBeDefined()
    const listas = tasks.filter((t) => hashKey(t.queryKey).includes('"pageIndex"') && t.queryKey[1] === "lista")
    // Todas las páginas, con el tope de seguridad.
    expect(listas).toHaveLength(200)
  })

  it("detalles con tope de 2000 por listado", async () => {
    const lista = matriculaKeys.lista({ filters: {}, sorting: [], ...PAG })
    const filas = Array.from({ length: 2100 }, (_, i) => ({ id: String(i) }))
    const { tasks } = await sembradas("/app/cobertura/matricula", [[lista, pagina(filas)]])
    expect(tasks.filter((t) => t.queryKey[1] === "detail" && t.queryKey.length === 3)).toHaveLength(2000)
  })

  it("inscripción y reservas, con la pestaña territorial solo si hay contexto", async () => {
    const reservas = reservasCupoKeys.lista(4, { filters: {}, sorting: [], ...PAG })
    const inscripciones = inscripcionesKeys.lista("2", {
      filters: { grado: "Sexto", estados: ["PENDIENTE", "EN_LISTA_ESPERA"] },
      ...PAG,
    })
    const cache: [QueryKey, unknown][] = [
      [reservasCupoKeys.establecimiento, 4],
      [reservas, pagina([{ id: "11" }])],
      [inscripcionesKeys.gruposAdmision, [{ id: "2", grados: ["Sexto"] }]],
      [inscripciones, pagina([{ inscripcionId: "33" }])],
      [territorialKeys.contexto, null],
    ]
    const sin = await sembradas("/app/cobertura/inscritos", cache)
    expect(sin.get(reservas)?.optional).toBeFalsy()
    expect(sin.get(reservaKeys.ficha("11"))).toBeDefined()
    expect(sin.get(inscripcionesKeys.detalle("33"))).toBeDefined()
    expect(sin.get(territorialKeys.proyeccion)).toBeUndefined()

    const con = await sembradas("/app/cobertura/inscritos", [[territorialKeys.contexto, { rol: "x" }]])
    expect(con.get(territorialKeys.redistribucionLista({ q: "", area: undefined, ...PAG }))).toBeDefined()
    expect(con.get(territorialKeys.cuposContratadosLista({ q: "", establecimientoId: undefined, ...PAG }))).toBeDefined()
  })

  it("complementaria, promoción y actualización de datos", async () => {
    const convocatorias = convocatoriaKeys.lista({ ...PAG, sorting: [] })
    const com = await sembradas("/app/cobertura/matricula-complementaria", [[convocatorias, pagina([{ id: 3 }])]])
    expect(com.get(convocatorias)?.optional).toBeFalsy()
    expect(com.get(convocatoriaKeys.detalle(3))).toBeDefined()
    expect(com.get(postulacionKeys.lista({ search: undefined, convocatoria: undefined, grado: undefined, ...PAG }))).toBeDefined()

    const reprobados = promocionKeys.reprobados({
      SEARCH: null, ANIO: null, PERIODO: null, SEDE: null, JORNADA: null, GRADO: null, GRUPO: null, PAGE_INDEX: 0, PAGE_SIZE: 10,
    })
    const pro = await sembradas("/app/cobertura/promocion-nivelacion", [[reprobados, pagina([{ matriculaId: 5 }])]])
    expect(pro.get(reprobados)?.optional).toBeFalsy()
    expect(pro.get(promocionKeys.areasDelAnio(5))).toBeDefined()

    const act = await sembradas("/app/cobertura/actualizacion-datos")
    expect(act.get(actualizacionKeys.configuracion)?.optional).toBeFalsy()
    expect(act.get(actualizacionKeys.lista({ SEARCH: null, ESTADO: "PENDIENTE", PAGE_INDEX: 0, PAGE_SIZE: 10 }))).toBeDefined()
  })

  it("funcionarios: lista, ficha, roles y permisos", async () => {
    const lista = employeeKeys.lista({ establishmentId: 1, filters: { search: undefined }, sorting: [], ...PAG })
    const { get } = await sembradas("/app/establecimiento-educativo/funcionarios", [
      [establishmentKeys.options(), { rows: [{ id: 1, name: "IE" }] }],
      [lista, pagina([{ id: 9 }])],
      [employeeKeys.roles(9, 1), [{ id: 50, canRestrict: true }, { id: 51, canRestrict: false }]],
    ])
    expect(get(lista)?.optional).toBeFalsy()
    expect(get(employeeKeys.ficha(9, 1))).toBeDefined()
    expect(get(employeeKeys.permisosRol(9, 50))).toBeDefined()
    expect(get(employeeKeys.permisosRol(9, 51))).toBeUndefined()
  })

  it("todo lo sembrado es persistible por su meta o su raíz", async () => {
    for (const url of ["/app/cobertura", "/app/establecimiento-educativo/funcionarios"]) {
      for (const task of (await sembradas(url)).tasks) {
        expect(Boolean(task.meta?.offline) || esModuloPersistible(task.queryKey)).toBe(true)
      }
    }
  })
})
