import { http, HttpResponse, delay } from "msw"

import {
  ICONO_NOMBRE_MAX,
  ICONO_NOMBRE_MIN,
  type Icono,
} from "@/features/administration/listas-valor/api/types/icono"
import {
  CODIGO_VALOR,
  type Categoria,
  type ListaValor,
  type ValorDraft,
} from "@/features/administration/listas-valor/api/types/lista-valor"
import { validarArchivoIcono } from "@/features/administration/listas-valor/lib/imagen-icono"
import {
  categoriasDb,
  archivosIconoDb,
  iconosDb,
  nextValorPk,
  valoresDb,
  type CategoriaDb,
} from "@/mocks/db/listas-valor"

// Misma forma y errores que `fn_listavalor_*` / `fn_icono_*`: `{ rows: [{ resultado }] }`,
// 404 si no existe, 400 por validación y 409 por duplicado o en uso.
const resultado = (data: unknown) => HttpResponse.json({ rows: [{ resultado: data }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })
// `*/` para que también calce en msw/node (tests).
const BASE = "*/api/eval-col/listas-valor"
const FILES = "*/api/files/eval-col/listas-valor"

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
const vivos = (categoria: string) =>
  valoresDb.filter((v) => v.active && v.categoria === categoria).sort((a, b) => a.orden - b.orden)

function toCategoria(c: CategoriaDb): Categoria {
  const valores = vivos(c.categoria)
  return {
    ...c,
    totalValores: valores.length,
    predeterminado: valores.find((v) => v.predeterminado)?.pkListaValor ?? null,
  }
}

const buscarCategoria = (codigo: string) => categoriasDb.find((c) => c.categoria === codigo)
const buscarValor = (id: number) => valoresDb.find((v) => v.pkListaValor === id && v.active)
const tieneHijosActivos = (v: ListaValor) =>
  valoresDb.some((h) => h.active && h.habilitado && h.padre?.pkListaValor === v.pkListaValor)

function resolverPadre(
  categoria: CategoriaDb,
  padre: number | null | undefined,
): { padre: ListaValor["padre"]; error?: undefined } | { padre?: undefined; error: string } {
  if (!categoria.categoriaPadre) return { padre: null }
  const p = padre == null ? undefined : buscarValor(Number(padre))
  if (!p || p.categoria !== categoria.categoriaPadre)
    return { error: `Cada valor debe tener un padre de la lista ${categoria.categoriaPadre}.` }
  return { padre: { pkListaValor: p.pkListaValor, categoria: p.categoria, nombre: p.nombre, valor: p.valor } }
}

function nombreRepetido(categoria: string, nombre: string, exceptoPk?: number) {
  return vivos(categoria).some(
    (v) => v.pkListaValor !== exceptoPk && sinTildes(v.nombre) === sinTildes(nombre),
  )
}

// file-service guarda el archivo y el back pone su clave S3 en VALOR; el mock guarda
// el binario en memoria y lo sirve por /files/public/<clave> (se pierde al recargar).
function guardarArchivo(file: File) {
  const clave = `mock/iconografia/${archivosIconoDb.size + 1}.${file.name.split(".").pop()?.toLowerCase()}`
  archivosIconoDb.set(clave, file)
  return clave
}

async function leerMultipart(request: Request) {
  const form = await request.formData()
  const imagen = form.get("IMAGEN")
  return {
    nombre: String(form.get("NOMBRE") ?? ""),
    habilitado: form.get("HABILITADO") == null ? null : form.get("HABILITADO") === "true",
    imagen: imagen instanceof File ? imagen : null,
  }
}

function validarIcono(nombre: unknown, exceptoPk?: number) {
  const n = String(nombre ?? "").trim()
  if (n.length < ICONO_NOMBRE_MIN || n.length > ICONO_NOMBRE_MAX)
    return `El nombre debe tener entre ${ICONO_NOMBRE_MIN} y ${ICONO_NOMBRE_MAX} caracteres.`
  if (iconosDb.some((i) => i.active && i.pkIcono !== exceptoPk && sinTildes(i.nombre) === sinTildes(n)))
    return "El nombre ya existe en el catálogo de iconografía."
  return null
}

const buscarIcono = (id: number) => iconosDb.find((i) => i.pkIcono === id)

export const listasValorHandlers = [
  // ---- Iconografía (rutas estáticas antes que `/:id`) ----
  http.get("*/api/files/public/mock/iconografia/:archivo", ({ params }) => {
    const file = archivosIconoDb.get(`mock/iconografia/${String(params.archivo)}`)
    if (!file) return new HttpResponse(null, { status: 404 })
    return new HttpResponse(file, { headers: { "Content-Type": file.type || "image/svg+xml" } })
  }),

  http.get(`${BASE}/iconos`, async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const buscar = sinTildes(url.searchParams.get("BUSCAR") ?? "")
    const habilitado = url.searchParams.get("HABILITADO")
    const lista = iconosDb
      .filter((i) => i.active)
      .filter((i) => habilitado == null || String(i.habilitado) === habilitado)
      .filter((i) => !buscar || sinTildes(i.nombre).includes(buscar))
      .sort((a, b) => a.orden - b.orden)
    return resultado(lista)
  }),

  http.post(`${FILES}/iconos`, async ({ request }) => {
    await delay(200)
    const body = await leerMultipart(request)
    const msg = validarIcono(body.nombre)
    if (msg) return error(msg.startsWith("El nombre ya") ? 409 : 400, msg)
    if (!body.imagen) return error(400, "La imagen es obligatoria.")
    const archivoMsg = await validarArchivoIcono(body.imagen)
    if (archivoMsg) return error(400, archivoMsg)
    const icono: Icono = {
      pkIcono: Math.max(0, ...iconosDb.map((i) => i.pkIcono)) + 1,
      nombre: body.nombre.trim(),
      valor: guardarArchivo(body.imagen),
      habilitado: body.habilitado ?? true,
      orden: Math.max(0, ...iconosDb.filter((i) => i.active).map((i) => i.orden)) + 1,
      active: true,
      enUso: false,
    }
    iconosDb.push(icono)
    return resultado(icono)
  }),

  http.post(`${FILES}/iconos/:id`, async ({ params, request }) => {
    await delay(200)
    const icono = buscarIcono(Number(params.id))
    if (!icono) return error(404, "No existe el ícono.")
    if (!icono.active) return error(400, "El ícono está eliminado.")
    const body = await leerMultipart(request)
    const msg = validarIcono(body.nombre, icono.pkIcono)
    if (msg) return error(msg.startsWith("El nombre ya") ? 409 : 400, msg)
    if (body.imagen) {
      const archivoMsg = await validarArchivoIcono(body.imagen)
      if (archivoMsg) return error(400, archivoMsg)
      icono.valor = guardarArchivo(body.imagen)
    }
    icono.nombre = body.nombre.trim()
    if (body.habilitado != null) icono.habilitado = body.habilitado
    return resultado(icono)
  }),

  http.put(`${BASE}/iconos/orden`, async ({ request }) => {
    await delay(150)
    const orden = JSON.parse(((await request.json()) as { ORDEN?: string }).ORDEN || "[]") as number[]
    const vivosIconos = iconosDb.filter((i) => i.active)
    if (orden.length !== vivosIconos.length || vivosIconos.some((i) => !orden.includes(i.pkIcono)))
      return error(400, "El orden debe incluir todos los íconos.")
    orden.forEach((pk, i) => {
      const icono = buscarIcono(pk)
      if (icono) icono.orden = i + 1
    })
    return resultado(vivosIconos.sort((a, b) => a.orden - b.orden))
  }),

  http.put(`${BASE}/iconos/:id/estado`, async ({ params, request }) => {
    await delay(150)
    const icono = buscarIcono(Number(params.id))
    if (!icono) return error(404, "No existe el ícono.")
    if (!icono.active) return error(400, "El ícono está eliminado.")
    const body = (await request.json()) as { HABILITADO?: boolean }
    icono.habilitado = Boolean(body.HABILITADO)
    return resultado(icono)
  }),

  http.put(`${BASE}/iconos/:id/eliminar`, async ({ params }) => {
    await delay(150)
    const icono = buscarIcono(Number(params.id))
    if (!icono) return error(404, "No existe el ícono.")
    if (!icono.active) return error(400, "El ícono está eliminado.")
    if (icono.enUso) return error(409, "Una valoración usa el ícono: inactívelo en lugar de eliminarlo.")
    icono.active = false
    return resultado(icono)
  }),

  // ---- Categorías ----
  http.get(`${BASE}/categorias`, async () => {
    await delay(200)
    return resultado(
      [...categoriasDb]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map(toCategoria),
    )
  }),

  http.post(`${BASE}/categorias`, async ({ request }) => {
    await delay(250)
    const body = (await request.json()) as {
      CATEGORIA?: string
      NOMBRE?: string | null
      DESCRIPCION?: string | null
      PADRE?: string | null
      ORDINAL?: boolean
      VALORES?: string
    }
    const codigo = String(body.CATEGORIA ?? "").trim()
    if (!/^[A-Z0-9_]{2,50}$/.test(codigo))
      return error(400, "El código de la lista solo admite mayúsculas, números y _.")
    if (buscarCategoria(codigo)) return error(409, "Ya existe una lista con ese código.")
    const nombre = (body.NOMBRE ?? "").trim() || codigo.charAt(0) + codigo.slice(1).toLowerCase().replace(/_/g, " ")
    if (categoriasDb.some((c) => sinTildes(c.nombre) === sinTildes(nombre)))
      return error(409, "Ya existe una lista con ese nombre.")
    if (body.PADRE && !buscarCategoria(body.PADRE)) return error(404, "No existe la lista padre.")

    const categoria = cat(codigo, nombre, body.DESCRIPCION ?? null, body.PADRE ?? null, Boolean(body.ORDINAL))
    const drafts = JSON.parse(body.VALORES || "[]") as ValorDraft[]
    if (drafts.length === 0) return error(400, "La lista debe tener al menos un valor.")
    const nuevos: ListaValor[] = []
    for (const [i, d] of drafts.entries()) {
      if (!CODIGO_VALOR.test(d.valor)) return error(400, `El código «${d.valor}» no es válido.`)
      if (nuevos.some((v) => v.valor === d.valor || sinTildes(v.nombre) === sinTildes(d.nombre)))
        return error(409, `El valor «${d.nombre}» está repetido.`)
      const p = resolverPadre(categoria, d.padre)
      if (p.error) return error(400, p.error)
      const v = nuevoValor(codigo, d.nombre.trim(), d.valor, d.etiqueta ?? null, null, p.padre ?? null, i + 1)
      // Aún no están en valoresDb: el pk se corre a mano para no repetirlo.
      v.pkListaValor += i
      nuevos.push(v)
      if (d.predeterminado) nuevos.forEach((v, j) => (v.predeterminado = j === nuevos.length - 1))
    }
    categoriasDb.push(categoria)
    valoresDb.push(...nuevos)
    return resultado({ ...toCategoria(categoria), valores: nuevos })
  }),

  http.put(`${BASE}/categorias/:categoria/estado`, async ({ params, request }) => {
    await delay(150)
    const categoria = buscarCategoria(String(params.categoria))
    if (!categoria) return error(404, "No existe la lista.")
    const { HABILITADA } = (await request.json()) as { HABILITADA?: boolean }
    if (
      !HABILITADA &&
      categoriasDb.some((c) => c.categoriaPadre === categoria.categoria && c.habilitada)
    )
      return error(409, "Una lista activa depende de esta: inactívela primero.")
    categoria.habilitada = Boolean(HABILITADA)
    return resultado(toCategoria(categoria))
  }),

  http.put(`${BASE}/categorias/:categoria/orden`, async ({ params, request }) => {
    await delay(150)
    const categoria = buscarCategoria(String(params.categoria))
    if (!categoria) return error(404, "No existe la lista.")
    const orden = JSON.parse(((await request.json()) as { ORDEN?: string }).ORDEN || "[]") as number[]
    const valores = vivos(categoria.categoria)
    if (orden.length !== valores.length || valores.some((v) => !orden.includes(v.pkListaValor)))
      return error(400, "El orden debe incluir todos los valores de la lista.")
    orden.forEach((pk, i) => {
      const v = buscarValor(pk)
      if (v) v.orden = i + 1
    })
    return resultado(vivos(categoria.categoria))
  }),

  http.put(`${BASE}/categorias/:categoria/eliminar`, async ({ params }) => {
    await delay(200)
    const categoria = buscarCategoria(String(params.categoria))
    if (!categoria) return error(404, "No existe la lista.")
    if (categoria.esSistema) return error(409, "Las listas del sistema no se eliminan.")
    if (categoriasDb.some((c) => c.categoriaPadre === categoria.categoria))
      return error(409, "Otra lista depende de esta.")
    vivos(categoria.categoria).forEach((v) => (v.active = false))
    categoriasDb.splice(categoriasDb.indexOf(categoria), 1)
    return resultado(null)
  }),

  http.put(`${BASE}/categorias/:categoria`, async ({ params, request }) => {
    await delay(200)
    const categoria = buscarCategoria(String(params.categoria))
    if (!categoria) return error(404, "No existe la lista.")
    const body = (await request.json()) as {
      NOMBRE?: string
      DESCRIPCION?: string | null
      PADRE?: string | null
      ORDINAL?: boolean
    }
    const nombre = String(body.NOMBRE ?? "").trim()
    if (!nombre) return error(400, "El nombre es obligatorio.")
    if (categoriasDb.some((c) => c !== categoria && sinTildes(c.nombre) === sinTildes(nombre)))
      return error(409, "Ya existe una lista con ese nombre.")
    if (body.PADRE === categoria.categoria) return error(400, "Una lista no puede ser su propio padre.")
    if (body.PADRE && !buscarCategoria(body.PADRE)) return error(404, "No existe la lista padre.")
    Object.assign(categoria, {
      nombre,
      descripcion: body.DESCRIPCION ?? null,
      categoriaPadre: body.PADRE ?? null,
      esOrdinal: Boolean(body.ORDINAL),
    })
    return resultado(toCategoria(categoria))
  }),

  // ---- Valores ----
  // parametros-edad atiende antes GRADOS y CALENDARIO con los mismos arrays.
  http.get(BASE, async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const categoria = url.searchParams.get("CATEGORIA")
    const padre = url.searchParams.get("PADRE")
    if (!categoria && !padre) return error(400, "Indique CATEGORIA o PADRE.")
    return resultado(
      valoresDb
        .filter((v) => v.active)
        .filter((v) => !categoria || v.categoria === categoria)
        .filter((v) => !padre || v.padre?.pkListaValor === Number(padre))
        .sort((a, b) => a.orden - b.orden),
    )
  }),

  http.post(BASE, async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as {
      CATEGORIA?: string
      NOMBRE?: string
      VALOR?: string
      ETIQUETA?: string | null
      ACCION?: string | null
      PADRE?: number | null
      ORDEN?: number | null
    }
    const categoria = buscarCategoria(String(body.CATEGORIA))
    if (!categoria) return error(404, "No existe la lista.")
    const nombre = String(body.NOMBRE ?? "").trim()
    if (!nombre) return error(400, "El nombre es obligatorio.")
    if (!CODIGO_VALOR.test(String(body.VALOR))) return error(400, "El código no es válido.")
    if (vivos(categoria.categoria).some((v) => v.valor === body.VALOR))
      return error(409, "Ya existe un valor con ese código en la lista.")
    if (nombreRepetido(categoria.categoria, nombre))
      return error(409, "Ya existe un valor con ese nombre en la lista.")
    const p = resolverPadre(categoria, body.PADRE)
    if (p.error) return error(400, p.error)
    const actuales = vivos(categoria.categoria)
    const orden = Math.min(Math.max(body.ORDEN ?? actuales.length + 1, 1), actuales.length + 1)
    actuales.filter((v) => v.orden >= orden).forEach((v) => v.orden++)
    const v = nuevoValor(
      categoria.categoria,
      nombre,
      String(body.VALOR),
      body.ETIQUETA ?? null,
      body.ACCION ?? null,
      p.padre ?? null,
      orden,
    )
    valoresDb.push(v)
    return resultado(v)
  }),

  http.put(`${BASE}/:id/estado`, async ({ params, request }) => {
    await delay(150)
    const v = buscarValor(Number(params.id))
    if (!v) return error(404, "No existe el valor.")
    const { HABILITADO } = (await request.json()) as { HABILITADO?: boolean }
    if (!HABILITADO && v.esSistema) return error(409, "Los valores del sistema no se inactivan.")
    if (!HABILITADO && tieneHijosActivos(v)) return error(409, "El valor tiene valores hijos activos.")
    v.habilitado = Boolean(HABILITADO)
    if (!v.habilitado) v.predeterminado = false
    return resultado(v)
  }),

  http.put(`${BASE}/:id/predeterminado`, async ({ params, request }) => {
    await delay(150)
    const v = buscarValor(Number(params.id))
    if (!v) return error(404, "No existe el valor.")
    const { PREDETERMINADO } = (await request.json()) as { PREDETERMINADO?: boolean }
    if (PREDETERMINADO && !v.habilitado)
      return error(400, "Un valor inactivo no puede ser predeterminado.")
    if (PREDETERMINADO) vivos(v.categoria).forEach((o) => (o.predeterminado = false))
    v.predeterminado = Boolean(PREDETERMINADO)
    return resultado(v)
  }),

  http.put(`${BASE}/:id/eliminar`, async ({ params }) => {
    await delay(150)
    const v = buscarValor(Number(params.id))
    if (!v) return error(404, "No existe el valor.")
    if (v.esSistema) return error(409, "Los valores del sistema no se eliminan.")
    if (valoresDb.some((h) => h.active && h.padre?.pkListaValor === v.pkListaValor))
      return error(409, "El valor tiene valores hijos.")
    v.active = false
    v.predeterminado = false
    return resultado(null)
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    await delay(200)
    const v = buscarValor(Number(params.id))
    if (!v) return error(404, "No existe el valor.")
    const body = (await request.json()) as {
      NOMBRE?: string
      ETIQUETA?: string | null
      ACCION?: string | null
      PADRE?: number | null
    }
    const nombre = String(body.NOMBRE ?? "").trim()
    if (!nombre) return error(400, "El nombre es obligatorio.")
    if (nombreRepetido(v.categoria, nombre, v.pkListaValor))
      return error(409, "Ya existe un valor con ese nombre en la lista.")
    const categoria = buscarCategoria(v.categoria)
    if (!categoria) return error(404, "No existe la lista.")
    const p = resolverPadre(categoria, body.PADRE)
    if (p.error) return error(400, p.error)
    Object.assign(v, { nombre, etiqueta: body.ETIQUETA ?? null, accion: body.ACCION ?? null, padre: p.padre })
    return resultado(v)
  }),
]

function cat(
  categoria: string,
  nombre: string,
  descripcion: string | null,
  categoriaPadre: string | null,
  esOrdinal: boolean,
): CategoriaDb {
  return { categoria, nombre, descripcion, categoriaPadre, esOrdinal, habilitada: true, esSistema: false }
}

function nuevoValor(
  categoria: string,
  nombre: string,
  valor: string,
  etiqueta: string | null,
  accion: string | null,
  padre: ListaValor["padre"],
  orden: number,
): ListaValor {
  return {
    pkListaValor: nextValorPk(),
    categoria,
    nombre,
    valor,
    etiqueta,
    accion,
    orden,
    predeterminado: false,
    habilitado: true,
    esSistema: false,
    active: true,
    padre,
  }
}
