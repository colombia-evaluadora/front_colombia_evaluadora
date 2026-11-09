import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { api } from "@/lib/api-client"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

import type { Complementaria } from "@/features/establishment/employees/api/types/funcionario"

/** El primer resultado de una escritura `{ rows: [{ <alias>: jsonb }] }`, venga por JSON o multipart. */
function firstResult<T>(body: unknown, alias: string): T {
  const rows = Array.isArray(body) ? body : ((body as { rows?: unknown[] } | null)?.rows ?? [body])
  const row = rows[0] as Record<string, unknown> | undefined
  return (row?.[alias] ?? row) as T
}

// ---------------------------------------------------------------------------
// Guardar la ficha (POST /:ID/ficha, fn_fun_ficha_guardar)

export interface GuardarFichaInput {
  funcionarioId: number
  establishmentId: number
  /** Correo, teléfono y foto; ausente, no se tocan (persona que ya existe, Regla 11). */
  contacto?: { email: string; phone: string; photo: File | null; removePhoto: boolean }
  /** Solo en un establecimiento del sector Oficial (Regla 90). */
  complementaria?: Complementaria
}

export interface GuardarFichaResult {
  pkFuncionario: number
  correoCambio: boolean
  correoAnterior: string | null
}

export async function guardarFicha({ funcionarioId, establishmentId, contacto, complementaria }: GuardarFichaInput) {
  const body = {
    ESTABLECIMIENTO: establishmentId,
    CON_CONTACTO: contacto != null,
    CORREO: contacto?.email.trim() ?? null,
    TELEFONO: contacto?.phone.trim() ?? null,
    LIMPIAR_FOTO: contacto?.removePhoto ?? false,
    CON_COMPLEMENTARIA: complementaria != null,
    CLASE_FUNCIONARIO: complementaria?.employeeClassId ?? null,
    NIVEL_ENSENANZA: complementaria?.teachingLevelId ?? null,
    ESTATUTO_DOCENTE: complementaria?.statuteId ?? null,
    GRADO_ESCALAFON: complementaria?.gradeId ?? null,
    NIVEL_EDUCATIVO: complementaria?.educationLevelId ?? null,
    FUENTE_RECURSO: complementaria?.fundingSourceId ?? null,
    TIPO_VINCULACION: complementaria?.employmentTypeId ?? null,
    DIRECCION: complementaria?.address.trim() || null,
  }
  const path = `/establecimientos/funcionarios/${funcionarioId}/ficha`
  const response = contacto?.photo
    ? await postMultipart<unknown>(`/eval-col${path}`, body, { FOTO: contacto.photo })
    : await api.post(`/eval-col${path}`, body)
  return firstResult<GuardarFichaResult>(response, "ficha")
}

export function useGuardarFicha() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: guardarFicha,
    onSuccess: (_result, { funcionarioId }) => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      void queryClient.invalidateQueries({ queryKey: employeeKeys.detalle(funcionarioId) })
    },
  })
}

// ---------------------------------------------------------------------------
// Usuario de soporte (PUT /:ID/usuario-soporte, solo el Superadministrador)

export function useMarcarSoporte() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ funcionarioId, soporte }: { funcionarioId: number; soporte: boolean }) =>
      evalCol.put(`/establecimientos/funcionarios/${funcionarioId}/usuario-soporte`, { SOPORTE: soporte }),
    onSuccess: (_result, { funcionarioId }) => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      void queryClient.invalidateQueries({ queryKey: employeeKeys.detalle(funcionarioId) })
    },
  })
}

// ---------------------------------------------------------------------------
// Corregir datos de identidad (multipart con SOPORTE, Regla 93)

export interface CorregirIdentidadInput {
  funcionarioId: number
  establishmentId: number
  documentTypeId: number
  identification: string
  firstName: string
  middleName: string
  lastName: string
  secondLastName: string
  birthDate: string
  reason: string
  support: File
}

export function useCorregirIdentidad() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CorregirIdentidadInput) =>
      postMultipart<unknown>(
        `/eval-col/establecimientos/funcionarios/${input.funcionarioId}/corregir-identidad`,
        {
          ESTABLECIMIENTO: input.establishmentId,
          TIPO_DOCUMENTO: input.documentTypeId,
          IDENTIFICACION: input.identification.trim(),
          PRIMER_NOMBRE: input.firstName.trim(),
          SEGUNDO_NOMBRE: input.middleName.trim(),
          PRIMER_APELLIDO: input.lastName.trim(),
          SEGUNDO_APELLIDO: input.secondLastName.trim(),
          FECHA_NACIMIENTO: input.birthDate,
          MOTIVO: input.reason.trim(),
        },
        { SOPORTE: input.support },
      ),
    onSuccess: (_result, { funcionarioId }) => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      void queryClient.invalidateQueries({ queryKey: employeeKeys.detalle(funcionarioId) })
    },
  })
}

// ---------------------------------------------------------------------------
// Documentos anexos (Regla 81): uno por petición

export interface CrearAnexoInput {
  funcionarioId: number
  establishmentId: number
  name: string
  description: string
  file: File
}

export async function crearAnexo(input: CrearAnexoInput) {
  return postMultipart<unknown>(
    `/eval-col/establecimientos/funcionarios/${input.funcionarioId}/archivos`,
    { ESTABLECIMIENTO: input.establishmentId, NOMBRE: input.name.trim(), DESCRIPCION: input.description.trim() },
    { ARCHIVO: input.file },
  )
}

export function useCrearAnexo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: crearAnexo,
    onSuccess: (_result, { funcionarioId }) => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.detalle(funcionarioId) })
    },
  })
}

export function useEliminarAnexo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ annexId }: { annexId: number; funcionarioId: number }) =>
      api.patch(`/eval-col/establecimientos/funcionarios/archivos/${annexId}`),
    onSuccess: (_result, { funcionarioId }) => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.detalle(funcionarioId) })
    },
  })
}
