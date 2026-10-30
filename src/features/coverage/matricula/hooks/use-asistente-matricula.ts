import type { Dispatch, SetStateAction } from "react"

import type { CampoUi } from "@/features/assistant/api/types"
import { aFecha, aTexto, resaltarElemento, resolverOpcion, type OpcionesUi } from "@/features/assistant/lib/campos-ui"
import { useFormularioAsistente } from "@/features/assistant/lib/registro-ui"
import {
  useMatriculaCatalogQuery,
  type MatriculaCatalogOption,
} from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"
import { getMatriculaFieldErrorMessage } from "@/features/coverage/matricula/utils/matricula-form-defaults"
import { toDigitsOnly } from "@/lib/text-input"

// Registro de `matricula.estudiante` (FRONT, registrado en código en
// ai-control-service: `FormulariosFront`) para la UI asistida en "Agregar
// estudiante" y "Editar matrícula".
//
// El form de matrícula NO es TanStack Form (estado plano con `useState`,
// ver `shared/api/schema.ts`), así que no usa `useFormularioTanstackAsistente`:
// cada campo dice dónde vive en `CreateMatriculaInput` (sección + clave).
//
// Alcance a propósito: datos del estudiante, su contacto y los del acudiente.
// Sede → Jornada → Grado → Grupo quedan fuera: es una cascada que resuelve
// por nombre y dispara la configuración de campos del colegio, y rellenarla
// desde el agente dejaría combinaciones a medio cargar. El agente los puede
// LEER (van en la definición, como solo lectura) y resaltar.

type Seccion = "academic" | "student" | "studentContact" | "guardian" | "guardianContact"

interface DefCampo {
  nombre: string
  etiqueta: string
  tipo: CampoUi["tipo"]
  seccion: Seccion
  clave: string
  /** Id del elemento en pantalla: es también el id de `invalidFields`. */
  elemento: string
  obligatorio?: boolean
  catalogo?: "tipoDocumento" | "genero" | "parentesco"
  numerico?: number
  /** Se expone para leer y resaltar, pero el agente no lo cambia. */
  soloLectura?: boolean
}

const CAMPOS: DefCampo[] = [
  { nombre: "sede", etiqueta: "Sede", tipo: "text", seccion: "academic", clave: "campus", elemento: "matricula-campus", obligatorio: true, soloLectura: true },
  { nombre: "jornada", etiqueta: "Jornada", tipo: "text", seccion: "academic", clave: "shift", elemento: "matricula-shift", obligatorio: true, soloLectura: true },
  { nombre: "grado", etiqueta: "Grado", tipo: "text", seccion: "academic", clave: "grade", elemento: "matricula-grade", obligatorio: true, soloLectura: true },
  { nombre: "grupo", etiqueta: "Grupo", tipo: "text", seccion: "academic", clave: "group", elemento: "matricula-group", obligatorio: true, soloLectura: true },
  { nombre: "tipoDocumentoEstudiante", etiqueta: "Tipo de documento del estudiante", tipo: "select", seccion: "student", clave: "documentType", elemento: "student-document-type", obligatorio: true, catalogo: "tipoDocumento" },
  { nombre: "documentoEstudiante", etiqueta: "Documento estudiante", tipo: "text", seccion: "student", clave: "documentNumber", elemento: "student-document-number", obligatorio: true, numerico: 15 },
  { nombre: "primerNombreEstudiante", etiqueta: "Nombre del estudiante", tipo: "text", seccion: "student", clave: "firstName", elemento: "student-first-name", obligatorio: true },
  { nombre: "segundoNombreEstudiante", etiqueta: "Segundo nombre del estudiante", tipo: "text", seccion: "student", clave: "secondName", elemento: "student-second-name" },
  { nombre: "primerApellidoEstudiante", etiqueta: "Primer apellido del estudiante", tipo: "text", seccion: "student", clave: "lastName", elemento: "student-last-name", obligatorio: true },
  { nombre: "segundoApellidoEstudiante", etiqueta: "Segundo apellido del estudiante", tipo: "text", seccion: "student", clave: "secondLastName", elemento: "student-second-last-name" },
  { nombre: "fechaNacimiento", etiqueta: "Fecha de nacimiento", tipo: "date", seccion: "student", clave: "birthDate", elemento: "student-birth-date", obligatorio: true },
  { nombre: "generoEstudiante", etiqueta: "Género del estudiante", tipo: "select", seccion: "student", clave: "gender", elemento: "student-gender", obligatorio: true, catalogo: "genero" },
  { nombre: "telefonoEstudiante", etiqueta: "Teléfono del estudiante", tipo: "tel", seccion: "studentContact", clave: "phone", elemento: "student-contact-phone", numerico: 15 },
  { nombre: "correoEstudiante", etiqueta: "Correo del estudiante", tipo: "email", seccion: "studentContact", clave: "email", elemento: "student-contact-email" },
  { nombre: "parentescoAcudiente", etiqueta: "Parentesco del acudiente", tipo: "select", seccion: "guardian", clave: "relationship", elemento: "guardian-relationship", obligatorio: true, catalogo: "parentesco" },
  { nombre: "tipoDocumentoAcudiente", etiqueta: "Tipo de documento del acudiente", tipo: "select", seccion: "guardian", clave: "documentType", elemento: "guardian-document-type", catalogo: "tipoDocumento" },
  { nombre: "documentoAcudiente", etiqueta: "Documento del acudiente", tipo: "text", seccion: "guardian", clave: "documentNumber", elemento: "guardian-document-number", numerico: 15 },
  { nombre: "primerNombreAcudiente", etiqueta: "Nombre del acudiente", tipo: "text", seccion: "guardian", clave: "firstName", elemento: "guardian-first-name" },
  { nombre: "primerApellidoAcudiente", etiqueta: "Primer apellido del acudiente", tipo: "text", seccion: "guardian", clave: "lastName", elemento: "guardian-last-name" },
  { nombre: "telefonoAcudiente", etiqueta: "Teléfono del acudiente", tipo: "tel", seccion: "guardianContact", clave: "phone", elemento: "guardian-contact-phone", numerico: 15 },
  { nombre: "correoAcudiente", etiqueta: "Correo del acudiente", tipo: "email", seccion: "guardianContact", clave: "email", elemento: "guardian-contact-email" },
]

const opcionesDe = (catalogo: MatriculaCatalogOption[] | undefined): OpcionesUi =>
  (catalogo ?? []).map((o) => ({ valor: String(o.id), etiqueta: o.nombre }))

interface Opciones {
  values: CreateMatriculaInput | null
  setValues: Dispatch<SetStateAction<CreateMatriculaInput>> | Dispatch<SetStateAction<CreateMatriculaInput | null>>
  /** Id de la matrícula que se edita; `undefined` en el alta. */
  matriculaId?: string
  /** Ids de campo marcados como inválidos al intentar guardar. */
  invalidFields: string[]
}

export function useAsistenteMatricula({ values, setValues, matriculaId, invalidFields }: Opciones) {
  const opciones: Record<NonNullable<DefCampo["catalogo"]>, OpcionesUi> = {
    tipoDocumento: opcionesDe(useMatriculaCatalogQuery("tipoDocumento").data),
    genero: opcionesDe(useMatriculaCatalogQuery("genero").data),
    parentesco: opcionesDe(useMatriculaCatalogQuery("parentesco").data),
  }

  const leer = (def: DefCampo): string =>
    aTexto((values?.[def.seccion] as unknown as Record<string, unknown> | undefined)?.[def.clave])

  function convertir(def: DefCampo, valor: unknown): string | undefined {
    if (valor == null || valor === "") return ""
    if (def.catalogo) return resolverOpcion(opciones[def.catalogo], valor) ?? undefined
    if (def.tipo === "date") return aFecha(valor) ?? undefined
    if (def.numerico) return toDigitsOnly(aTexto(valor), def.numerico)
    return aTexto(valor).slice(0, 120)
  }

  function asignar(cambios: { def: DefCampo; valor: string }[]) {
    if (cambios.length === 0) return
    // Un solo `setValues`: varios seguidos sobre el mismo render se pisarían.
    ;(setValues as Dispatch<SetStateAction<CreateMatriculaInput | null>>)((prev) => {
      if (!prev) return prev
      const next = { ...prev } as unknown as Record<Seccion, Record<string, unknown>>
      for (const { def, valor } of cambios) next[def.seccion] = { ...next[def.seccion], [def.clave]: valor }
      return next as unknown as CreateMatriculaInput
    })
  }

  const editable = (nombre: string) => CAMPOS.find((c) => c.nombre === nombre && !c.soloLectura)

  useFormularioAsistente(
    values
      ? {
          codigo: "matricula.estudiante",
          entidad: matriculaId ?? "",
          campos: () =>
            CAMPOS.map((def) => {
              const error = invalidFields.includes(def.elemento)
                ? getMatriculaFieldErrorMessage(def.elemento, values)
                : undefined
              return {
                nombre: def.nombre,
                etiqueta: def.soloLectura ? `${def.etiqueta} (solo lectura para el asistente)` : def.etiqueta,
                tipo: def.tipo,
                ...(def.obligatorio ? { obligatorio: true } : {}),
                valor: leer(def),
                ...(error ? { error } : {}),
                ...(def.catalogo ? { opciones: opciones[def.catalogo] } : {}),
              }
            }),
          rellenar: (valores) => {
            const cambios: { def: DefCampo; valor: string }[] = []
            for (const [nombre, valor] of Object.entries(valores)) {
              const def = editable(nombre)
              if (!def) continue
              const convertido = convertir(def, valor)
              if (convertido !== undefined) cambios.push({ def, valor: convertido })
            }
            asignar(cambios)
          },
          limpiar: (nombre) => {
            const def = editable(nombre)
            if (def) asignar([{ def, valor: "" }])
          },
          resaltar: (nombre) => {
            const def = CAMPOS.find((c) => c.nombre === nombre)
            if (def) resaltarElemento(def.elemento)
          },
        }
      : null,
  )
}
