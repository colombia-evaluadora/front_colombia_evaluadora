import type { CampoUi } from "@/features/assistant/api/types"
import {
  aBooleano,
  aFecha,
  aNumero,
  aTexto,
  resaltarElemento,
  resolverOpcion,
  type OpcionesUi,
} from "@/features/assistant/lib/campos-ui"
import { useFormularioAsistente, useFormularioBloqueadoAsistente } from "@/features/assistant/lib/registro-ui"
import type { Actividad } from "@/features/planeador/api/types/actividad"

// Registro de `planeador.actividad` (ai.ui_formulario, origen DB, V557.2)
// para la UI asistida.
//
// Nombres de campo = claves del modelo del form (`Actividad`), que además son
// el `id` de cada control (`id={field.name}`), así RESALTAR no necesita un
// mapa aparte. El backend, para formularios de origen DB, oculta los campos
// cuyo nombre contiene una sección con `visible:false` en
// `GET /actividades/:id/configuracion` (`criterio`, `evaluacion`,
// `ponderacion`, `recuperacion`); por eso el instrumento se expone como
// `instrumentoEvaluacion` (cae bajo `evaluacion`) y la ponderación como
// `ponderacion`. Igual el front tampoco declara los campos de secciones
// ocultas: lo que no se ve no se ofrece.
//
// Se deja afuera lo que tiene cascadas o efectos propios del form (grado,
// grupo, asignatura, unidad, estudiantes, recuperación, definición del
// instrumento, adaptaciones): asignarlos "en crudo" saltearía esas reglas.
// El agente NUNCA envía: solo `form.setFieldValue`.

type ClaveActividad = keyof Actividad

interface DefCampo {
  nombre: string
  etiqueta: string
  tipo: CampoUi["tipo"]
  clave: ClaveActividad
  obligatorio?: boolean
  /** Sección de `camposDisponibles` que lo gobierna. */
  seccion?: "evaluacion" | "ponderacion"
  /** Solo en actividades sumativas con referente evaluativo. */
  soloEvaluativa?: boolean
}

const CAMPOS: DefCampo[] = [
  { nombre: "nombre", etiqueta: "Nombre", tipo: "text", clave: "nombre", obligatorio: true },
  { nombre: "tipo", etiqueta: "Tipo", tipo: "select", clave: "tipo", obligatorio: true },
  { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea", clave: "descripcion" },
  { nombre: "materiales", etiqueta: "Materiales", tipo: "textarea", clave: "materiales" },
  { nombre: "fechaInicio", etiqueta: "Fecha de inicio", tipo: "date", clave: "fechaInicio", obligatorio: true },
  { nombre: "fechaCierre", etiqueta: "Fecha de cierre", tipo: "date", clave: "fechaCierre", obligatorio: true },
  { nombre: "duracionEstimada", etiqueta: "Duración estimada", tipo: "text", clave: "duracionEstimada" },
  { nombre: "semana", etiqueta: "Semana del cronograma", tipo: "text", clave: "semana" },
  { nombre: "modalidad", etiqueta: "Modalidad", tipo: "select", clave: "modalidad" },
  { nombre: "esEvaluativa", etiqueta: "¿Es evaluación sumativa?", tipo: "checkbox", clave: "esEvaluativa" },
  { nombre: "instrumentoEvaluacion", etiqueta: "Instrumento de evaluación", tipo: "select", clave: "instrumento", seccion: "evaluacion", soloEvaluativa: true },
  { nombre: "ponderacion", etiqueta: "Ponderación (%)", tipo: "number", clave: "ponderacion", seccion: "ponderacion", soloEvaluativa: true },
  { nombre: "notaMaxima", etiqueta: "Nota máxima", tipo: "number", clave: "notaMaxima", seccion: "ponderacion", soloEvaluativa: true },
  { nombre: "generaEvidencias", etiqueta: "Genera evidencias", tipo: "checkbox", clave: "generaEvidencias" },
  { nombre: "requiereValidacion", etiqueta: "Requiere validación del coordinador", tipo: "checkbox", clave: "requiereValidacion" },
  { nombre: "observaciones", etiqueta: "Observaciones", tipo: "textarea", clave: "observaciones" },
]

const MODALIDADES: OpcionesUi = ["Presencial", "Virtual", "Híbrida"].map((m) => ({ valor: m, etiqueta: m }))

/** Lo mínimo del `useForm` de TanStack que se usa (evita su tipo sobrecargado). */
interface FormLike {
  state: { values: Actividad }
  setFieldValue: (campo: never, valor: never) => void
}

interface Opciones {
  form: FormLike
  /** Id de la actividad que se edita; `null` en altas. */
  actividadId: number | null
  /**
   * En solo lectura (Regla 37 o sin permiso de editar) el formulario no se
   * registra: el asistente no lo ve ni lo puede rellenar. Si igual lo pide,
   * recibe `motivoSoloLectura`.
   */
  readOnly: boolean
  motivoSoloLectura?: string
  esFormativa: boolean
  /** Visibilidad efectiva por sección (`camposEfectivos` del form). */
  seccionVisible: (seccion: "evaluacion" | "ponderacion") => boolean
  tiposActividad: string[]
  instrumentos: string[]
}

export function useAsistenteActividad({
  form,
  actividadId,
  readOnly,
  motivoSoloLectura,
  esFormativa,
  seccionVisible,
  tiposActividad,
  instrumentos,
}: Opciones) {
  const set = (clave: ClaveActividad, valor: unknown) =>
    (form.setFieldValue as (c: string, v: unknown) => void)(clave, valor)

  function opciones(def: DefCampo): OpcionesUi | undefined {
    if (def.clave === "tipo") return tiposActividad.map((t) => ({ valor: t, etiqueta: t }))
    if (def.clave === "modalidad") return MODALIDADES
    if (def.clave === "instrumento") return instrumentos.map((i) => ({ valor: i, etiqueta: i }))
    return undefined
  }

  function disponible(def: DefCampo): boolean {
    if (def.soloEvaluativa && esFormativa) return false
    if (def.seccion && !seccionVisible(def.seccion)) return false
    return true
  }

  const visibles = () => CAMPOS.filter(disponible)
  const buscar = (nombre: string) => visibles().find((c) => c.nombre === nombre)

  function convertir(def: DefCampo, valor: unknown): { ok: true; valor: unknown } | { ok: false } {
    switch (def.tipo) {
      case "select": {
        const v = resolverOpcion(opciones(def) ?? [], valor)
        return v == null ? { ok: false } : { ok: true, valor: v }
      }
      case "checkbox": {
        const v = aBooleano(valor)
        return v == null ? { ok: false } : { ok: true, valor: v }
      }
      case "number": {
        const v = aNumero(valor)
        return v == null ? { ok: false } : { ok: true, valor: v }
      }
      case "date": {
        const v = aFecha(valor)
        return v == null ? { ok: false } : { ok: true, valor: v }
      }
      default:
        return { ok: true, valor: aTexto(valor) }
    }
  }

  function vacio(def: DefCampo): unknown {
    if (def.tipo === "checkbox") return false
    if (def.clave === "ponderacion") return 0
    if (def.clave === "notaMaxima") return undefined
    return ""
  }

  useFormularioBloqueadoAsistente(
    "planeador.actividad",
    readOnly ? (motivoSoloLectura ?? "Esta actividad está en solo lectura; no se puede modificar.") : null,
  )
  useFormularioAsistente(
    readOnly
      ? null
      : {
          codigo: "planeador.actividad",
          entidad: actividadId != null ? String(actividadId) : "",
          campos: () =>
            visibles().map((def) => {
              const valor = form.state.values[def.clave]
              const ops = opciones(def)
              return {
                nombre: def.nombre,
                etiqueta: def.etiqueta,
                tipo: def.tipo,
                obligatorio: def.obligatorio ?? false,
                valor: valor ?? "",
                ...(ops ? { opciones: ops } : {}),
              }
            }),
          rellenar: (valores) => {
            for (const [nombre, valor] of Object.entries(valores)) {
              const def = buscar(nombre)
              if (!def) continue
              const r = convertir(def, valor)
              if (r.ok) set(def.clave, r.valor)
            }
          },
          limpiar: (nombre) => {
            const def = buscar(nombre)
            if (def) set(def.clave, vacio(def))
          },
          resaltar: (nombre) => {
            const def = buscar(nombre)
            if (def) resaltarElemento(def.clave)
          },
        },
  )
}
