import { http, HttpResponse, delay } from "msw"

import { MATRICULA_CATALOG_CATEGORIA, type MatriculaCatalogKey } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import {
  MOTIVOS_ANULACION,
  inscripcionDemoOriginal,
  type InscripcionConsulta,
} from "@/features/publico/consultar/datos-demo"
import {
  UUID_ANULAR,
  UUID_AUTORIZAR,
  UUID_CODIGO,
  UUID_CONSULTAR,
  UUID_ELEGIR,
  UUID_UBICACION,
  UUID_UBICACION_RESPONDER,
} from "@/features/publico/consultar/api/consulta-publica"
import {
  UUID_CONTEXTO,
  UUID_REGISTRAR,
  UUID_REGISTRO_CODIGO,
} from "@/features/publico/inscribir/api/inscripcion-publica"
import { CATALOGOS_DEMO, DEPARTAMENTOS_DEMO, PERIODOS_DEMO } from "@/features/publico/inscribir/datos-demo"

// Inscribir y Consultar inscripción públicas (sso V425/V426/V432/V433): `POST /eval-col/public/service`
// con `{uuid, params}` y respuesta `[{datos}]`. Vista previa: en Consultar cualquier código de 6
// dígitos vale si número y documento son de una inscripción de ejemplo (`datos-demo.ts`); en
// Inscribir cualquier código de 6 dígitos vale salvo "111111" (para ver el intento fallido).
const NO_COINCIDE = {
  encontrada: false,
  mensaje: "Los datos no coinciden o el código no es correcto. Revíselos e intente de nuevo.",
}

const responder = (datos: unknown) => HttpResponse.json([{ datos }])
const error400 = (message: string) => HttpResponse.json({ message }, { status: 400 })

interface PublicServiceBody {
  uuid: string
  params: Record<string, unknown>
}

function inscripcionDe(params: Record<string, unknown>) {
  const codigo = String(params["BODY.CODIGO"] ?? "")
  if (!/^\d{6}$/.test(codigo)) return null
  return inscripcionDemoOriginal(String(params["BODY.NUMERO"] ?? ""), String(params["BODY.DOCUMENTO"] ?? ""))
}

/** La inscripción con la forma de `fn_inscripcion_consulta_publica_interno`. */
const datosConsulta = (i: InscripcionConsulta) => ({
  encontrada: true,
  numeroInscripcion: i.numero,
  estado: i.estado,
  aspirante: i.aspirante,
  grupoAdmision: i.grupoAdmision,
  opciones: i.opciones.map((o) => ({
    id: o.id,
    preferencia: o.numero,
    redistribucion: o.numero == null,
    grado: i.grado,
    establecimiento: o.establecimiento,
    sede: o.sede,
    jornada: o.jornada,
    numeroSorteo: o.sorteo,
    estado: o.estado,
    // Solo la vista previa: el back real no los manda.
    posicion: o.posicion,
    reservada: o.reservada,
    elegida: o.elegida,
  })),
  autorizaciones: structuredClone(i.autorizaciones),
  motivosAnulacion: MOTIVOS_ANULACION,
  plazo: i.plazo,
  sorteo: i.sorteo,
})

/** Ubicación de `fn_ubicacion_propuesta_interno`: la opción de redistribución de los ejemplos. */
function ubicacionDe(i: InscripcionConsulta) {
  const o = i.opciones.find((x) => x.numero == null && x.estado !== "DESCARTADA")
  if (!o || (i.estado !== "UBICACION_PROPUESTA" && i.estado !== "UBICADO")) return null
  return {
    id: 900 + (o.id ?? 0),
    opcionId: o.id,
    establecimiento: o.establecimiento,
    sede: o.sede,
    jornada: o.jornada,
    grado: i.grado,
    requiereConfirmacion: true,
    confirmada: i.estado === "UBICADO",
    confirmarHasta: null,
  }
}

const contexto = () => ({
  habilitada: true,
  maxOpciones: 3,
  opciones: PERIODOS_DEMO,
  catalogos: {
    listas: Object.fromEntries(
      (Object.keys(MATRICULA_CATALOG_CATEGORIA) as MatriculaCatalogKey[]).map((k) => [
        MATRICULA_CATALOG_CATEGORIA[k],
        CATALOGOS_DEMO[k] ?? [],
      ]),
    ),
    etnias: CATALOGOS_DEMO.etnias,
    discapacidades: CATALOGOS_DEMO.discapacidades,
    municipios: DEPARTAMENTOS_DEMO.flatMap((d) =>
      d.municipalities.map((m) => ({ id: m.id, nombre: m.name, departamento: d.name })),
    ),
  },
})

let consecutivo = 500

export const inscripcionPublicaHandlers = [
  http.post("*/api/eval-col/public/service", async ({ request }) => {
    const { uuid, params = {} } = (await request.json()) as PublicServiceBody
    await delay(300)
    if (uuid === UUID_CODIGO || uuid === UUID_REGISTRO_CODIGO) return responder({ enviado: true })
    if (uuid === UUID_CONTEXTO) return responder(contexto())

    if (uuid === UUID_REGISTRAR) {
      const codigo = String(params["BODY.CODIGO"] ?? "")
      if (!/^\d{6}$/.test(codigo) || codigo === "111111") {
        return responder({ registrada: false, intentosRestantes: 4, mensaje: "El código no es correcto. Le quedan 4 intentos." })
      }
      const numero = String(++consecutivo).padStart(5, "0")
      return responder({
        registrada: true,
        numeroInscripcion: numero,
        autorizacionPendiente: params["BODY.AUTORIZA_DATOS"] !== true,
        mensaje: `Inscripción ${numero} registrada.`,
      })
    }

    const i = inscripcionDe(params)
    if (uuid === UUID_CONSULTAR) return responder(i ? datosConsulta(i) : NO_COINCIDE)

    if (uuid === UUID_UBICACION) return responder(i ? { encontrada: true, ubicacion: ubicacionDe(i) } : NO_COINCIDE)

    if (uuid === UUID_AUTORIZAR) {
      if (!i) return responder(NO_COINCIDE)
      const ids = (params["BODY.ESTABLECIMIENTOS"] as number[] | undefined)?.map(Number) ?? []
      if (!ids.length || ids.some((id) => !i.autorizaciones.some((a) => a.establecimientoId === id))) {
        return error400("Hay establecimientos que no son de la inscripción.")
      }
      for (const a of i.autorizaciones) if (ids.includes(a.establecimientoId)) a.autorizado = true
      return responder({ encontrada: true, autorizaciones: structuredClone(i.autorizaciones) })
    }

    if (uuid === UUID_ELEGIR) {
      if (!i) return responder(NO_COINCIDE)
      const elegida = i.opciones.find((o) => o.id === Number(params["BODY.OPCION"]))
      if (!elegida) return HttpResponse.json({ message: "La opción no pertenece a la inscripción" }, { status: 404 })
      if (elegida.estado !== "ADMITIDA") return error400("Solo se puede elegir una opción Admitida")
      for (const o of i.opciones) {
        if (o === elegida) o.elegida = true
        else if (["ADMITIDA", "PENDIENTE", "EN_LISTA_ESPERA"].includes(o.estado)) {
          o.estado = "DESCARTADA"
          o.reservada = false
        }
      }
      i.estado = "ADMITIDA"
      return responder(datosConsulta(i))
    }

    if (uuid === UUID_ANULAR) {
      if (!i) return responder(NO_COINCIDE)
      if (i.estado === "ANULADA") return error400(`La inscripción ${i.numero} ya está anulada`)
      if (!MOTIVOS_ANULACION.some((m) => m.id === Number(params["BODY.FK_TLV_MOTIVO"]))) {
        return error400("El Motivo de anulación es obligatorio")
      }
      for (const o of i.opciones) Object.assign(o, { estado: "DESCARTADA", reservada: false, elegida: false })
      i.estado = "ANULADA"
      return responder(datosConsulta(i))
    }

    if (uuid === UUID_UBICACION_RESPONDER) {
      if (!i) return responder(NO_COINCIDE)
      const ub = ubicacionDe(i)
      if (!ub || ub.confirmada) return error400("La inscripción no tiene una ubicación pendiente de confirmación")
      const o = i.opciones.find((x) => x.id === ub.opcionId)!
      if (params["BODY.ACEPTA"] === true) {
        Object.assign(o, { estado: "ADMITIDA", reservada: true })
        i.estado = "UBICADO"
      } else {
        Object.assign(o, { estado: "DESCARTADA", reservada: false })
        i.estado = "SIN_CUPO"
      }
      return responder({ encontrada: true, ubicacion: ubicacionDe(i), inscripcion: datosConsulta(i) })
    }

    return HttpResponse.json({ message: "Servicio público no encontrado." }, { status: 404 })
  }),
]
