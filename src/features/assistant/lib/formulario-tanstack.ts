import type { CampoUi, CodigoFormularioAgente } from "@/features/assistant/api/types"
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

// Registro genérico de un formulario de TanStack Form para la UI asistida.
//
// Cómo integrar un formulario nuevo (ver también CLAUDE.md §6 "assistant"):
//   1. Agregá su código a `CodigoFormularioAgente` (`api/types.ts`) Y al
//      registro del backend (`FormulariosFront` de ai-control-service o
//      `ai.ui_formulario`): un código que el backend no conoce se puede LEER
//      pero no rellenar.
//   2. En el componente que crea el form llamá
//      `useFormularioTanstackAsistente(form, { codigo, entidad, campos })`.
//      Cada campo declara su `nombre` (la ruta del campo en el form, la misma
//      de `<form.Field name>`), etiqueta, tipo y, si es lista, sus opciones
//      con `valor` = lo que guarda el form (como texto).
//   3. Si el valor del form no es texto (número, booleano, objeto), usá
//      `aModelo` para convertir lo que manda el agente.
//
// El agente solo llama `form.setFieldValue` (corre los validadores del
// form y respeta Base UI, a diferencia de escribir en el DOM). NUNCA envía:
// la persona revisa y presiona Guardar.

/** Lo mínimo que se usa de un `FormApi` (cualquier `useForm`/`useAppForm` lo cumple). */
export interface FormTanstackMinimo {
  // `any` a propósito: el nombre real es `DeepKeys<TValues>` y cada form tiene el suyo.
  getFieldValue: (campo: any) => unknown
  setFieldValue: (campo: any, valor: any) => void
  getFieldMeta: (campo: any) => { errors?: unknown[]; isTouched?: boolean } | undefined
  setFieldMeta?: (campo: any, updater: (prev: any) => any) => void
}

export interface CampoTanstackAsistente {
  /** Ruta del campo en el form (`startDate`, `persona.nombre`). Es también el nombre para el agente. */
  nombre: string
  etiqueta: string
  tipo: CampoUi["tipo"]
  obligatorio?: boolean
  /** Opciones de una lista (`valor` = lo que guarda el form, como texto). */
  opciones?: OpcionesUi
  /** Convierte el valor del agente al del form; `undefined` = no se pudo, se ignora. */
  aModelo?: (valor: unknown) => unknown
  /** Valor del form → valor para el agente (por defecto, tal cual). */
  aAgente?: (valor: unknown) => unknown
  /** Valor "vacío" del form para LIMPIAR_CAMPO (por defecto `""`, `false` o `null` según el tipo). */
  vacio?: unknown
  /** Id del elemento en pantalla para RESALTAR (por defecto, el `nombre`). */
  elemento?: string | string[]
  /** El campo se muestra pero el agente no lo cambia (p. ej. bloqueado por regla de negocio). */
  soloLectura?: boolean
}

export interface OpcionesFormularioTanstack {
  codigo: CodigoFormularioAgente
  /** Id del registro que se edita; `""` o `undefined` en altas. */
  entidad?: string | number | null
  campos: CampoTanstackAsistente[]
  /** Formulario en solo lectura: no se expone para rellenar y este es el motivo. */
  bloqueado?: string | null
  /** `false` para no registrarlo (p. ej. diálogo cerrado). */
  activo?: boolean
}

/** Primer mensaje legible de los errores de TanStack Form (strings o issues de zod). */
export function primerError(errores: unknown[] | undefined): string | undefined {
  for (const error of errores ?? []) {
    if (!error) continue
    if (typeof error === "string") return error
    if (typeof error === "object" && "message" in error && typeof error.message === "string") return error.message
  }
  return undefined
}

/** Conversión por defecto según el tipo del campo. */
export function convertirPorTipo(campo: CampoTanstackAsistente, valor: unknown): unknown {
  if (campo.aModelo) return campo.aModelo(valor)
  switch (campo.tipo) {
    case "checkbox":
      return aBooleano(valor) ?? undefined
    case "number":
      return valor == null || valor === "" ? null : (aNumero(valor) ?? undefined)
    case "date":
      return valor == null || valor === "" ? "" : (aFecha(valor) ?? undefined)
    case "select":
    case "radio":
    case "autocomplete": {
      if (!campo.opciones?.length) return aTexto(valor)
      return resolverOpcion(campo.opciones, valor) ?? undefined
    }
    default:
      return aTexto(valor)
  }
}

function vacioDe(campo: CampoTanstackAsistente): unknown {
  if (campo.vacio !== undefined) return campo.vacio
  if (campo.tipo === "checkbox") return false
  if (campo.tipo === "number") return null
  return ""
}

/** Descriptor del registro para un form de TanStack; separado del hook para poder probarlo. */
export function formularioTanstack(form: FormTanstackMinimo, opciones: OpcionesFormularioTanstack) {
  const buscar = (nombre: string) => opciones.campos.find((c) => c.nombre === nombre && !c.soloLectura)
  const tocar = (nombre: string) =>
    form.setFieldMeta?.(nombre, (prev: Record<string, unknown> | undefined) => ({ ...(prev ?? {}), isTouched: true }))

  return {
    codigo: opciones.codigo,
    entidad: opciones.entidad != null ? String(opciones.entidad) : "",
    campos: (): CampoUi[] =>
      opciones.campos.map((campo) => {
        const bruto = form.getFieldValue(campo.nombre)
        const valor = campo.aAgente ? campo.aAgente(bruto) : bruto
        const error = primerError(form.getFieldMeta(campo.nombre)?.errors)
        return {
          nombre: campo.nombre,
          etiqueta: campo.etiqueta,
          tipo: campo.tipo,
          ...(campo.obligatorio ? { obligatorio: true } : {}),
          valor: valor == null ? "" : typeof valor === "object" ? JSON.stringify(valor) : valor,
          ...(error ? { error } : {}),
          ...(campo.opciones ? { opciones: campo.opciones } : {}),
        }
      }),
    rellenar: (valores: Record<string, unknown>) => {
      for (const [nombre, valor] of Object.entries(valores)) {
        const campo = buscar(nombre)
        if (!campo) continue
        const convertido = convertirPorTipo(campo, valor)
        if (convertido === undefined) continue
        form.setFieldValue(campo.nombre, convertido)
        tocar(campo.nombre)
      }
    },
    limpiar: (nombre: string) => {
      const campo = buscar(nombre)
      if (campo) form.setFieldValue(campo.nombre, vacioDe(campo))
    },
    resaltar: (nombre: string) => {
      const campo = opciones.campos.find((c) => c.nombre === nombre)
      if (campo) resaltarElemento(campo.elemento ?? campo.nombre)
    },
  }
}

/** Registra un form de TanStack Form en la UI asistida mientras esté montado. */
export function useFormularioTanstackAsistente(form: FormTanstackMinimo, opciones: OpcionesFormularioTanstack) {
  const activo = opciones.activo !== false
  useFormularioAsistente(activo && !opciones.bloqueado ? formularioTanstack(form, opciones) : null)
  useFormularioBloqueadoAsistente(opciones.codigo, activo ? opciones.bloqueado : null)
}
