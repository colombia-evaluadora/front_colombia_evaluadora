import { delay, http, HttpResponse, passthrough } from "msw"

import type { Disposicion, Politica } from "@/features/administration/conservacion-datos/api/types"
import {
  actasDb,
  ampliacionesDb,
  archivoDb,
  conservacionConfigDb,
  FUENTES_MOCK,
  modulosDb,
  politicasDb,
  vencidosDb,
  type PoliticaRecord,
} from "@/mocks/db/conservacion-datos"
import { establishmentsRowsDb } from "@/mocks/db/establishments"
import { nextId } from "@/mocks/db/next-id"

// Misma forma y errores que el back (`fn_conservacion_*`, V589-V596):
// `{ rows: [{ resultado }] }`; 404 inexistente, 400 validación, 409 repetido.
// El mock actúa como Superadministrador: sin establecimiento, usa el primero.
const BASE = "*/api/eval-col/conservacion-datos"
const resultado = (data: unknown) => HttpResponse.json({ rows: [{ resultado: data }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

function aJson(p: PoliticaRecord): Politica {
  return {
    ...p,
    modulo: modulosDb.find((m) => m.pkModulo === p.pkModulo)?.nombre ?? "",
    conFuente: FUENTES_MOCK.includes(normalizar(p.tipoRegistro)),
  }
}

const establecimiento = (pk: number) => establishmentsRowsDb.find((e) => e.id === pk)
const eePorDefecto = () => establishmentsRowsDb[0]?.id ?? 0

interface PoliticaBody {
  TIPO_REGISTRO?: string
  PK_MODULO?: number
  PERMANENTE?: boolean
  PLAZO_MINIMO?: number | null
  CUENTA_DESDE?: PoliticaRecord["cuentaDesde"]
  DISPOSICION?: Disposicion | null
  HABILITADO?: boolean
}

/** Valida como `fn_conservacion_validar_*` (V592). */
function leerPolitica(b: PoliticaBody, pk: number | null): { status: number; message: string } | Omit<PoliticaRecord, "pkPolitica"> {
  const tipo = (b.TIPO_REGISTRO ?? "").trim()
  if (tipo.length < 3 || tipo.length > 80)
    return { status: 400, message: "El tipo de registro debe tener entre 3 y 80 caracteres." }
  if (politicasDb.some((p) => p.pkPolitica !== pk && p.tipoRegistro.toLowerCase() === tipo.toLowerCase()))
    return { status: 409, message: `Ya existe una política para el tipo de registro «${tipo}».` }
  if (!modulosDb.some((m) => m.pkModulo === Number(b.PK_MODULO)))
    return { status: 400, message: "Seleccione un módulo válido." }
  const permanente = Boolean(b.PERMANENTE)
  if (!permanente) {
    const plazo = Number(b.PLAZO_MINIMO)
    if (!(plazo >= 1 && plazo <= 99)) return { status: 400, message: "El plazo mínimo debe estar entre 1 y 99 años." }
    if (!b.CUENTA_DESDE) return { status: 400, message: "Seleccione desde cuándo se cuenta el plazo." }
    if (!b.DISPOSICION) return { status: 400, message: "Seleccione la disposición final." }
  }
  return {
    tipoRegistro: tipo,
    pkModulo: Number(b.PK_MODULO),
    permanente,
    plazoMinimo: permanente ? null : Number(b.PLAZO_MINIMO),
    cuentaDesde: permanente ? null : (b.CUENTA_DESDE ?? null),
    disposicion: permanente ? null : (b.DISPOSICION ?? null),
    habilitado: b.HABILITADO ?? true,
  }
}

function ampliaciones(pkEe: number) {
  return politicasDb
    .filter((p) => p.habilitado && !p.permanente)
    .sort((a, b) => a.tipoRegistro.localeCompare(b.tipoRegistro, "es"))
    .map((p) => {
      const a = ampliacionesDb.find((x) => x.pkPolitica === p.pkPolitica && x.pkEstablecimiento === pkEe)
      return {
        pkPolitica: p.pkPolitica,
        pkAmpliacion: a?.pkAmpliacion ?? null,
        tipoRegistro: p.tipoRegistro,
        plazoMinimo: p.plazoMinimo,
        plazoEstablecimiento: a?.plazo ?? null,
      }
    })
}

function validarPlazo(p: PoliticaRecord | undefined, plazo: number) {
  if (!p || !p.habilitado || p.permanente) return "Solo se amplían políticas activas que no sean permanentes."
  if (!(plazo <= 99)) return "El plazo del establecimiento debe ser de máximo 99 años."
  if (plazo < (p.plazoMinimo ?? 0)) return "El plazo del establecimiento no puede ser menor que el plazo mínimo."
  return null
}

/** Inactiva o permanente: deja de vencer en el acto (como el back). */
function limpiarVencidos(pkPolitica: number) {
  const p = politicasDb.find((x) => x.pkPolitica === pkPolitica)
  if (p && (!p.habilitado || p.permanente)) {
    for (let i = vencidosDb.length - 1; i >= 0; i--) if (vencidosDb[i].pkPolitica === pkPolitica) vencidosDb.splice(i, 1)
  }
}

async function sha256(texto: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")
}

export const conservacionDatosHandlers = [
  http.get(`${BASE}/config`, async () => {
    await delay(100)
    return resultado({ ...conservacionConfigDb })
  }),

  http.get(`${BASE}/modulos`, async () => {
    await delay(100)
    return resultado(modulosDb)
  }),

  http.get(`${BASE}/politicas`, async () => {
    await delay(200)
    const lista = [...politicasDb].sort(
      (a, b) => Number(b.habilitado) - Number(a.habilitado) || a.tipoRegistro.localeCompare(b.tipoRegistro, "es"),
    )
    return resultado(lista.map(aJson))
  }),

  http.post(`${BASE}/politicas`, async ({ request }) => {
    await delay(200)
    const datos = leerPolitica((await request.json()) as PoliticaBody, null)
    if ("status" in datos) return error(datos.status, datos.message)
    const nueva = { ...datos, pkPolitica: nextId(politicasDb.map((p) => p.pkPolitica)) }
    politicasDb.push(nueva)
    return resultado(aJson(nueva))
  }),

  // Rutas estáticas antes que `/politicas/:id`: MSW usa el primer match.
  http.put(`${BASE}/politicas/:id/estado`, async ({ params, request }) => {
    await delay(200)
    const p = politicasDb.find((x) => x.pkPolitica === Number(params.id))
    if (!p) return error(404, "La política de conservación no existe.")
    const body = (await request.json()) as { HABILITADO?: boolean }
    if (typeof body.HABILITADO !== "boolean") return error(400, "Indique el estado.")
    p.habilitado = body.HABILITADO
    limpiarVencidos(p.pkPolitica)
    return resultado(aJson(p))
  }),

  http.get(`${BASE}/politicas/:id`, async ({ params }) => {
    await delay(150)
    const p = politicasDb.find((x) => x.pkPolitica === Number(params.id))
    return p ? resultado(aJson(p)) : error(404, "La política de conservación no existe.")
  }),

  http.put(`${BASE}/politicas/:id`, async ({ params, request }) => {
    await delay(200)
    const p = politicasDb.find((x) => x.pkPolitica === Number(params.id))
    if (!p) return error(404, "La política de conservación no existe.")
    const datos = leerPolitica((await request.json()) as PoliticaBody, p.pkPolitica)
    if ("status" in datos) return error(datos.status, datos.message)
    Object.assign(p, datos)
    // Un mínimo que sube arrastra las ampliaciones por debajo.
    for (const a of ampliacionesDb)
      if (a.pkPolitica === p.pkPolitica && p.plazoMinimo != null && a.plazo < p.plazoMinimo) a.plazo = p.plazoMinimo
    limpiarVencidos(p.pkPolitica)
    return resultado(aJson(p))
  }),

  http.get(`${BASE}/ampliaciones`, async ({ request }) => {
    await delay(200)
    const pkEe = Number(new URL(request.url).searchParams.get("PK_ESTABLECIMIENTO")) || eePorDefecto()
    return resultado(ampliaciones(pkEe))
  }),

  http.post(`${BASE}/ampliaciones`, async ({ request }) => {
    await delay(200)
    const b = (await request.json()) as { PK_POLITICA?: number; PK_ESTABLECIMIENTO?: number | null; PLAZO?: number }
    const pkEe = Number(b.PK_ESTABLECIMIENTO) || eePorDefecto()
    const p = politicasDb.find((x) => x.pkPolitica === Number(b.PK_POLITICA))
    if (!p) return error(404, "La política de conservación no existe.")
    const invalido = validarPlazo(p, Number(b.PLAZO))
    if (invalido) return error(400, invalido)
    if (ampliacionesDb.some((a) => a.pkPolitica === p.pkPolitica && a.pkEstablecimiento === pkEe))
      return error(409, "Ya existe una ampliación para ese tipo de registro.")
    ampliacionesDb.push({
      pkAmpliacion: nextId(ampliacionesDb.map((a) => a.pkAmpliacion)),
      pkPolitica: p.pkPolitica,
      pkEstablecimiento: pkEe,
      plazo: Number(b.PLAZO),
    })
    return resultado(ampliaciones(pkEe))
  }),

  http.put(`${BASE}/ampliaciones/:id`, async ({ params, request }) => {
    await delay(200)
    const a = ampliacionesDb.find((x) => x.pkAmpliacion === Number(params.id))
    if (!a) return error(404, "La ampliación no existe.")
    const { PLAZO } = (await request.json()) as { PLAZO?: number }
    const invalido = validarPlazo(politicasDb.find((p) => p.pkPolitica === a.pkPolitica), Number(PLAZO))
    if (invalido) return error(400, invalido)
    a.plazo = Number(PLAZO)
    return resultado(ampliaciones(a.pkEstablecimiento))
  }),

  http.get(`${BASE}/vencidos`, async () => {
    await delay(200)
    const lotes = vencidosDb.flatMap((v) => {
      const p = politicasDb.find((x) => x.pkPolitica === v.pkPolitica)
      if (!p || !p.disposicion) return []
      return [{
        pkPolitica: v.pkPolitica,
        tipoRegistro: p.tipoRegistro,
        pkEstablecimiento: v.pkEstablecimiento,
        establecimiento: establecimiento(v.pkEstablecimiento)?.name ?? "",
        cantidad: v.registros.length,
        vencidoDesde: v.registros.map((r) => r.vencidoDesde).sort()[0],
        disposicion: p.disposicion,
      }]
    })
    return resultado(lotes)
  }),

  http.get(`${BASE}/vencidos/:politica/:establecimiento`, async ({ params }) => {
    await delay(200)
    const v = vencidosDb.find(
      (x) => x.pkPolitica === Number(params.politica) && x.pkEstablecimiento === Number(params.establecimiento),
    )
    return v ? resultado(v.registros) : error(404, "No hay registros vencidos para ese tipo de registro y establecimiento.")
  }),

  // Multipart por file-service: el acta llega como ACTA.
  http.post("*/api/files/eval-col/conservacion-datos/vencidos/disponer", async ({ request }) => {
    await delay(400)
    const form = await request.formData()
    const pkPolitica = Number(form.get("PK_POLITICA"))
    const pkEe = Number(form.get("PK_ESTABLECIMIENTO"))
    const motivo = String(form.get("MOTIVO") ?? "").trim()
    const acta = form.get("ACTA")
    const i = vencidosDb.findIndex((x) => x.pkPolitica === pkPolitica && x.pkEstablecimiento === pkEe)
    if (i < 0) return error(404, "No hay registros vencidos para ese tipo de registro y establecimiento.")
    if (!(acta instanceof File)) return error(400, "El acta es obligatoria.")
    if (motivo.length < 10 || motivo.length > 500) return error(400, "El motivo debe tener entre 10 y 500 caracteres.")
    const p = politicasDb.find((x) => x.pkPolitica === pkPolitica)
    let disposicion = p?.disposicion ?? "ANONIMIZAR"
    const pedida = form.get("DISPOSICION")
    if (pedida === "ANONIMIZAR" && disposicion === "ARCHIVAR" && !conservacionConfigDb.almacenamientoArchivo)
      disposicion = "ANONIMIZAR"
    else if (pedida && pedida !== disposicion) return error(400, "La disposición debe ser la de la política.")
    if (disposicion === "ARCHIVAR" && !conservacionConfigDb.almacenamientoArchivo)
      return error(400, "Archivar no está disponible hasta que se configure el almacenamiento del archivo histórico.")
    const cantidad = vencidosDb[i].registros.length
    vencidosDb.splice(i, 1)
    actasDb.set(nextId([...actasDb.keys()]), acta.name)
    return resultado({ pkDisposicion: Date.now(), disposicion, cantidad })
  }),

  http.post(`${BASE}/archivo/consultar`, async ({ request }) => {
    await delay(250)
    const b = (await request.json()) as {
      BUSCAR?: string | null
      PK_ESTABLECIMIENTO?: number | null
      TIPO_REGISTRO?: string | null
      ANIO?: number | null
      PAGE_INDEX?: number
      PAGE_SIZE?: number
    }
    const q = b.BUSCAR ? normalizar(b.BUSCAR) : ""
    const filtradas = archivoDb.filter(
      (a) =>
        (!q || a.documento === b.BUSCAR?.trim() || normalizar(a.estudiante).includes(q)) &&
        (!b.PK_ESTABLECIMIENTO || a.pkEstablecimiento === b.PK_ESTABLECIMIENTO) &&
        (!b.TIPO_REGISTRO || a.tipoRegistro.toLowerCase() === b.TIPO_REGISTRO.toLowerCase()) &&
        (!b.ANIO || a.anio === b.ANIO),
    )
    const size = Math.max(b.PAGE_SIZE ?? 25, 1)
    const page = Math.max(b.PAGE_INDEX ?? 0, 0)
    const filas = filtradas
      .slice(page * size, (page + 1) * size)
      .map(({ contenido: _c, fkTarchivoActa: _f, pkEstablecimiento: _e, ...fila }) => fila)
    return resultado({ total: filtradas.length, filas })
  }),

  http.post(`${BASE}/archivo/:id/:accion`, async ({ params }) => {
    await delay(150)
    const a = archivoDb.find((x) => x.pkArchivo === Number(params.id))
    if (!a) return error(404, "El archivo no existe.")
    return resultado({
      pkArchivo: a.pkArchivo,
      ubicacion: `data:text/plain;charset=utf-8,${encodeURIComponent(a.contenido)}`,
      huella: await sha256(a.contenido),
      fkTarchivoActa: a.fkTarchivoActa,
    })
  }),

  // Antes que el de planeador: solo responde las actas de este mock.
  http.post("*/api/files/view-token/:archivoId", async ({ params }) => {
    const nombre = actasDb.get(Number(params.archivoId))
    if (!nombre) return passthrough()
    await delay(100)
    const pdf = "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
    return HttpResponse.json({ token: "mock", url: `data:application/pdf;base64,${btoa(pdf)}`, expiresIn: 300 })
  }),
]
