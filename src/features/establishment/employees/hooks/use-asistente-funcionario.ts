import type { CampoUi } from "@/features/assistant/api/types"
import {
  aFecha,
  aTexto,
  opcionesDeCatalogo,
  plegarTexto,
  resaltarElemento,
  resolverCatalogo,
} from "@/features/assistant/lib/campos-ui"
import { useFormularioAsistente, usePestanasAsistente } from "@/features/assistant/lib/registro-ui"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Person } from "@/features/establishment/employees/api/types/person"
import type { EmployeeAdditionalInfoValue } from "@/features/establishment/employees/components/forms/form-employee-additional-info"
import { CATALOGS } from "@/lib/catalogs"

// Registro de `funcionario.crear` / `funcionario.editar` (ai.ui_formulario,
// V557.2) para la UI asistida. Vive fuera de `dialog-manage.tsx` (67 KB) para
// que el diálogo solo tenga que llamarlo con su estado.
//
// Nombres de campo: camelCase en español, como el ejemplo del contrato
// (`nombres`, `cargo`, `numeroDocumento`). El backend valida cada acción
// contra la definición que manda esta misma pantalla, así que no hay un
// nombre "oficial" que respetar; se eligieron los que el modelo asocia con
// los argumentos de `editar_funcionario` (PERSON.FIRSTNAME → primerNombre,
// FUNCTIONALPOSITION.ID → cargo…). Los catálogos van como `select` con
// `valor` = pk (lo que espera `editar_funcionario` en `*.ID`).
//
// El agente NUNCA guarda: solo cambia `person` / `additionalInfo`; el envío
// sigue siendo el botón Guardar con sus validaciones.

type CampoPersona =
  | "documentType"
  | "identification"
  | "firstName"
  | "middleName"
  | "lastName"
  | "secondLastName"
  | "email"
  | "phone"
  | "birthDate"
  | "gender"
type CampoAdicional = keyof EmployeeAdditionalInfoValue

interface DefCampo {
  nombre: string
  etiqueta: string
  tipo: CampoUi["tipo"]
  /** Dónde vive en el estado del diálogo (uno de los dos). */
  persona?: CampoPersona
  adicional?: CampoAdicional
  /** Id del elemento en pantalla (para RESALTAR). */
  elemento: string
  /** `alta`: obligatorio solo al crear (correo y género, ver `employeePersonSchema`). */
  obligatorio?: "siempre" | "alta"
}

const CAMPOS: DefCampo[] = [
  { nombre: "tipoDocumento", etiqueta: "Tipo de documento", tipo: "select", persona: "documentType", elemento: "document-type", obligatorio: "siempre" },
  { nombre: "numeroDocumento", etiqueta: "Número de documento", tipo: "text", persona: "identification", elemento: "document-number", obligatorio: "siempre" },
  { nombre: "primerNombre", etiqueta: "Primer nombre", tipo: "text", persona: "firstName", elemento: "user-name", obligatorio: "siempre" },
  { nombre: "segundoNombre", etiqueta: "Segundo nombre", tipo: "text", persona: "middleName", elemento: "user-second-name" },
  { nombre: "primerApellido", etiqueta: "Primer apellido", tipo: "text", persona: "lastName", elemento: "user-last-name", obligatorio: "siempre" },
  { nombre: "segundoApellido", etiqueta: "Segundo apellido", tipo: "text", persona: "secondLastName", elemento: "user-second-last-name" },
  { nombre: "correo", etiqueta: "Correo electrónico", tipo: "email", persona: "email", elemento: "user-email", obligatorio: "alta" },
  { nombre: "telefono", etiqueta: "Teléfono", tipo: "tel", persona: "phone", elemento: "user-phone" },
  { nombre: "fechaNacimiento", etiqueta: "Fecha de nacimiento", tipo: "date", persona: "birthDate", elemento: "birth-date" },
  { nombre: "genero", etiqueta: "Género", tipo: "select", persona: "gender", elemento: "gender-user", obligatorio: "alta" },
  { nombre: "claseFuncionario", etiqueta: "Clase de funcionario", tipo: "select", adicional: "employeeClass", elemento: "employee-class" },
  { nombre: "nivelEducativo", etiqueta: "Nivel educativo de enseñanza", tipo: "select", adicional: "educationLevel", elemento: "education-level" },
  { nombre: "gradoEscalafon", etiqueta: "Grado escalafón", tipo: "select", adicional: "grade", elemento: "employee-grade" },
  { nombre: "ultimoNivelEducativo", etiqueta: "Último nivel educativo aprobado", tipo: "select", adicional: "highestEducationLevel", elemento: "highest-education-level" },
  { nombre: "fuenteRecursos", etiqueta: "Fuente de recursos", tipo: "select", adicional: "fundingSource", elemento: "funding-source" },
  { nombre: "cargo", etiqueta: "Cargo funcional", tipo: "select", adicional: "functionalPosition", elemento: "functional-position" },
  { nombre: "tipoVinculacion", etiqueta: "Tipo de vinculación", tipo: "select", adicional: "employmentType", elemento: "employment-type" },
  { nombre: "direccion", etiqueta: "Dirección", tipo: "text", adicional: "address", elemento: "employee-address" },
]

const PESTANA_PERMISOS = plegarTexto("Permisos")
const PESTANAS_ADICIONAL = ["informacion adicional", "datos adicionales"]

interface Opciones {
  open: boolean
  employeeId: number | null | undefined
  person: Person | null
  setPerson: (updater: (prev: Person | null) => Person | null) => void
  additionalInfo: EmployeeAdditionalInfoValue
  setAdditionalInfo: (updater: (prev: EmployeeAdditionalInfoValue) => EmployeeAdditionalInfoValue) => void
  abrirPermisos: () => void
  abrirInformacionAdicional: () => void
}

export function useAsistenteFuncionario({
  open,
  employeeId,
  person,
  setPerson,
  additionalInfo,
  setAdditionalInfo,
  abrirPermisos,
  abrirInformacionAdicional,
}: Opciones) {
  const isEditMode = Boolean(employeeId)
  // Mismos catálogos que ya pidieron los formularios (TanStack Query deduplica).
  const catalogos: Record<string, CatalogItem[]> = {
    documentType: useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES).data ?? [],
    gender: useCatalogQuery<CatalogItem>(CATALOGS.GENDERS).data ?? [],
    employeeClass: useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_CLASSES).data ?? [],
    educationLevel: useCatalogQuery<CatalogItem>(CATALOGS.EDUCATION_LEVELS).data ?? [],
    grade: useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_GRADES).data ?? [],
    highestEducationLevel: useCatalogQuery<CatalogItem>(CATALOGS.HIGHEST_EDUCATION_LEVELS).data ?? [],
    fundingSource: useCatalogQuery<CatalogItem>(CATALOGS.FUNDING_SOURCES).data ?? [],
    functionalPosition: useCatalogQuery<CatalogItem>(CATALOGS.FUNCTIONAL_POSITIONS).data ?? [],
    employmentType: useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYMENT_TYPES).data ?? [],
  }

  const claveModelo = (def: DefCampo): string => def.persona ?? def.adicional ?? ""

  function valorActual(def: DefCampo): unknown {
    const bruto = def.persona ? person?.[def.persona] : additionalInfo[def.adicional as CampoAdicional]
    if (def.tipo === "select") {
      const item = bruto as CatalogItem | null
      return item?.id != null ? String(item.id) : ""
    }
    return bruto ?? ""
  }

  /** Valor del agente → valor del modelo; `undefined` si no se pudo interpretar. */
  function convertir(def: DefCampo, valor: unknown): unknown {
    if (def.tipo === "select") {
      if (valor == null || valor === "") return null
      return resolverCatalogo(catalogos[claveModelo(def)], valor) ?? undefined
    }
    if (def.tipo === "date") return valor == null || valor === "" ? "" : (aFecha(valor) ?? undefined)
    return aTexto(valor)
  }

  function asignar(cambios: { def: DefCampo; valor: unknown }[]) {
    const persona = cambios.filter((c) => c.def.persona)
    const adicional = cambios.filter((c) => c.def.adicional)
    if (persona.length > 0) {
      setPerson((prev) => {
        const next = { ...(prev ?? ({} as Person)) } as Record<string, unknown>
        for (const { def, valor } of persona) next[def.persona as string] = valor
        return next as unknown as Person
      })
    }
    if (adicional.length > 0) {
      setAdditionalInfo((prev) => {
        const next = { ...prev } as Record<string, unknown>
        for (const { def, valor } of adicional) next[def.adicional as string] = valor
        return next as unknown as EmployeeAdditionalInfoValue
      })
    }
  }

  const buscar = (nombre: string) => CAMPOS.find((c) => c.nombre === nombre)

  useFormularioAsistente(
    open
      ? {
          codigo: isEditMode ? "funcionario.editar" : "funcionario.crear",
          entidad: isEditMode ? String(employeeId) : "",
          campos: () =>
            CAMPOS.map((def) => ({
              nombre: def.nombre,
              etiqueta: def.etiqueta,
              tipo: def.tipo,
              obligatorio: def.obligatorio === "siempre" || (def.obligatorio === "alta" && !isEditMode),
              valor: valorActual(def),
              ...(def.tipo === "select" ? { opciones: opcionesDeCatalogo(catalogos[claveModelo(def)]) } : {}),
            })),
          rellenar: (valores) => {
            const cambios: { def: DefCampo; valor: unknown }[] = []
            for (const [nombre, valor] of Object.entries(valores)) {
              const def = buscar(nombre)
              if (!def) continue
              const convertido = convertir(def, valor)
              if (convertido !== undefined) cambios.push({ def, valor: convertido })
            }
            asignar(cambios)
          },
          limpiar: (nombre) => {
            const def = buscar(nombre)
            if (def) asignar([{ def, valor: def.tipo === "select" ? null : "" }])
          },
          resaltar: (nombre) => {
            const def = buscar(nombre)
            if (!def) return
            // Los datos adicionales viven en un sub-diálogo: se abre primero.
            if (def.adicional) abrirInformacionAdicional()
            resaltarElemento(def.elemento)
          },
        }
      : null,
  )

  usePestanasAsistente(
    open
      ? {
          abrir: (pestana) => {
            const nombre = plegarTexto(pestana)
            if (nombre === PESTANA_PERMISOS) {
              abrirPermisos()
              return true
            }
            if (PESTANAS_ADICIONAL.includes(nombre)) {
              abrirInformacionAdicional()
              return true
            }
            return false
          },
        }
      : null,
  )
}
