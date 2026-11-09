import { z } from "zod"

import { maxLength, minLength, required } from "@/lib/forms/messages"
import { validarFormatoPersona } from "@/features/establishment/shared/person-field-rules"
import { validarDireccion } from "@/features/establishment/shared/text-field-rules"

/** "El motivo debe tener entre 10 y 500 caracteres." */
const largo = (min: number, max: number, sujeto: string) => `${sujeto} debe tener entre ${min} y ${max} caracteres.`

export const ESTADOS_FUNCIONARIO = ["A", "I"] as const

export const employeeFiltersFormSchema = z.object({
  search: z.string(),
  roles: z.array(z.string()),
  workSchedules: z.array(z.string()),
  statuses: z.array(z.enum(ESTADOS_FUNCIONARIO)),
  /** Id de la sede como texto: el buscador trabaja con valores de texto. */
  campusId: z.string(),
})

export type EmployeeFiltersFormInput = z.input<typeof employeeFiltersFormSchema>

export type EmployeeFiltersFormValues = z.infer<typeof employeeFiltersFormSchema>

export const employeesSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  /** Con varios establecimientos se elige en el listado y viaja a las páginas del funcionario. */
  establecimiento: z.coerce.number().int().positive().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  roles: z.array(z.string()).optional().catch(undefined),
  workSchedules: z.array(z.string()).optional().catch(undefined),
  statuses: z.array(z.enum(ESTADOS_FUNCIONARIO)).optional().catch(undefined),
  sede: z.coerce.number().int().positive().optional().catch(undefined),
})

export type EmployeesSearch = z.infer<typeof employeesSearchSchema>

/** Las páginas del funcionario solo llevan el establecimiento. */
export const employeeFormSearchSchema = z.object({
  establecimiento: z.coerce.number().int().positive().optional().catch(undefined),
})

/** Formulario del Funcionario (Sección 4.1): datos personales e información complementaria. */
export interface FuncionarioFormValues {
  documentTypeId: number | null
  /** Código del tipo (`CC`…): decide si el número es solo dígitos. */
  documentTypeCode: string
  identification: string
  firstName: string
  middleName: string
  lastName: string
  secondLastName: string
  email: string
  phone: string
  birthDate: string
  genderId: number | null
  employeeClassId: number | null
  teachingLevelId: number | null
  statuteId: number | null
  gradeId: number | null
  educationLevelId: number | null
  fundingSourceId: number | null
  employmentTypeId: number | null
  address: string
}

/**
 * `identityLocked`: los datos de identidad no se validan porque no se guardan desde
 * aquí (Modificar, o una persona que ya existe: Reglas 11 y 93). `contactLocked`:
 * tampoco el contacto (persona que ya existe).
 */
export function buildFuncionarioFormSchema({
  identityLocked,
  contactLocked,
}: {
  identityLocked: boolean
  contactLocked: boolean
}) {
  return z
    .custom<FuncionarioFormValues>()
    .superRefine((values, ctx) => {
      const requerido = (path: keyof FuncionarioFormValues, vacio: boolean, message: string) => {
        if (vacio) ctx.addIssue({ code: "custom", path: [path], message })
      }
      if (!identityLocked) {
        requerido("documentTypeId", values.documentTypeId == null, required("El tipo de documento"))
        requerido("identification", !values.identification.trim(), required("El número de documento"))
        requerido("firstName", !values.firstName.trim(), required("El primer nombre"))
        requerido("lastName", !values.lastName.trim(), required("El primer apellido"))
        requerido("genderId", values.genderId == null, required("El género"))
      }
      if (!contactLocked) {
        requerido("email", !values.email.trim(), required("El correo electrónico"))
        if (values.email.trim() && values.email.trim().length < 8) {
          ctx.addIssue({ code: "custom", path: ["email"], message: minLength(8, "El correo electrónico") })
        }
        if (values.email.trim().length > 200) {
          ctx.addIssue({ code: "custom", path: ["email"], message: maxLength(200, "El correo electrónico") })
        }
      }
      validarFormatoPersona(
        {
          documentType: { code: values.documentTypeCode },
          identification: identityLocked ? null : values.identification,
          firstName: identityLocked ? null : values.firstName,
          middleName: identityLocked ? null : values.middleName,
          lastName: identityLocked ? null : values.lastName,
          secondLastName: identityLocked ? null : values.secondLastName,
          birthDate: identityLocked ? null : values.birthDate,
          phone: contactLocked ? null : values.phone,
          email: contactLocked ? null : values.email,
        },
        ctx,
      )
      if (values.address.trim()) {
        const message = values.address.trim().length < 8 ? largo(8, 150, "La dirección") : validarDireccion(values.address)
        if (message) ctx.addIssue({ code: "custom", path: ["address"], message })
      }
    })
}

/** Modal "Documento anexo" (Regla 81). */
export const ANEXO_EXTENSIONES = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"] as const
export const ANEXO_MAX_MB = 10

export const anexoFormSchema = z.object({
  name: z.string().trim().min(4, largo(4, 100, "El nombre del documento")).max(100, maxLength(100, "El nombre del documento")),
  description: z
    .string()
    .trim()
    .min(10, largo(10, 500, "La descripción"))
    .max(500, maxLength(500, "La descripción")),
  file: z.custom<File | null>().refine((file) => file != null, required("El archivo")),
})

export type AnexoFormValues = z.input<typeof anexoFormSchema>

/** Corregir datos de identidad (Regla 93): motivo y soporte obligatorios. */
export const SOPORTE_EXTENSIONES = ["pdf", "jpg", "jpeg", "png"] as const

export const correccionIdentidadSchema = z
  .custom<
    Pick<
      FuncionarioFormValues,
      "documentTypeId" | "documentTypeCode" | "identification" | "firstName" | "middleName" | "lastName" | "secondLastName" | "birthDate"
    > & { reason: string; support: File | null }
  >()
  .superRefine((values, ctx) => {
    if (values.documentTypeId == null) ctx.addIssue({ code: "custom", path: ["documentTypeId"], message: required("El tipo de documento") })
    if (!values.identification.trim()) ctx.addIssue({ code: "custom", path: ["identification"], message: required("El número de documento") })
    if (!values.firstName.trim()) ctx.addIssue({ code: "custom", path: ["firstName"], message: required("El primer nombre") })
    if (!values.lastName.trim()) ctx.addIssue({ code: "custom", path: ["lastName"], message: required("El primer apellido") })
    validarFormatoPersona({ ...values, documentType: { code: values.documentTypeCode } }, ctx)
    const motivo = values.reason.trim()
    if (motivo.length < 10 || motivo.length > 500) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: largo(10, 500, "El motivo") })
    }
    if (!values.support) ctx.addIssue({ code: "custom", path: ["support"], message: required("El soporte") })
  })
