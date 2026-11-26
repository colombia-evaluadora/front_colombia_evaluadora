import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { toPaginated } from "@/lib/pagination"
import { downloadReport } from "@/lib/report-client"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"

// Graduación (C.4.GRA; Secciones 4.6 y 4.8, Reglas 62, 63 y 67): V785/V786 del SSO.

const BASE = "/informes-reportes/graduacion"
const graduacionKeys = {
  all: [...informesKeys.all, "graduacion"] as const,
  lista: (body: unknown) => [...informesKeys.all, "graduacion", "lista", body] as const,
  requisitos: (id: string) => [...informesKeys.all, "graduacion", "requisitos", id] as const,
}

export interface Graduando {
  matriculaId: string
  documento: string
  estudiante: string
  grupo: string
  estado: "Cursando" | "Aprobado" | "Graduado"
  cumplidos: number
  requisitos: number
  faltan: string | null
  graduacionId: number | null
  acta: string | null
  fechaGrado: string | null
  diploma: string | null
  diplomaEmitido: boolean
  entrega: string | null
  /** «Egresado no graduado»: Aprobado que solo debe el Saber 11 (término del ICFES, Sección 4.6). */
  leyenda: string | null
}

export interface RequisitoGrado {
  orden: number
  codigo: string
  nombre: string
  cumplido: boolean
  detalle: string
  delSistema: boolean
}

export const SITUACIONES_GRADO = [{ value: "PENDIENTES", label: "Con requisitos pendientes" }]
export const CAUSALES_DUPLICADO = [
  { value: "HURTO", label: "Hurto o robo", soporte: "copia de la denuncia penal" },
  { value: "EXTRAVIO", label: "Extravío definitivo", soporte: "constancia de pérdida" },
  { value: "DANO", label: "Daño irreparable", soporte: "el diploma dañado escaneado" },
  { value: "CAMBIO_NOMBRE", label: "Cambio de nombre", soporte: "escritura o registro civil con el cambio" },
]

/** Filtros de la lista; los reusa el export. */
export const filtrosGraduacion = (s: InformesSearch) => ({
  PERIODO: s.periodo ?? null,
  SEDE: s.sede || null,
  JORNADA: s.jornada || null,
  GRUPO: s.grupo || null,
  SITUACION: s.situacionGrado ?? null,
  BUSCAR: s.q || null,
})

export function useGraduacionQuery(s: InformesSearch, p: { pageIndex: number; pageSize: number }) {
  const body = { ...filtrosGraduacion(s), PAGEINDEX: p.pageIndex, PAGESIZE: p.pageSize }
  return useQuery({
    queryKey: graduacionKeys.lista(body),
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/query`, body)
      return toPaginated(rows, {
        pageSize: p.pageSize,
        map: (r) => {
          const g = camelizar<Graduando & { matriculaId: number }>(r)
          return { ...g, matriculaId: String(g.matriculaId) } as Graduando
        },
      })
    },
    placeholderData: keepPreviousData,
  })
}

export function useRequisitosGradoQuery(matriculaId: string) {
  return useQuery({
    queryKey: graduacionKeys.requisitos(matriculaId),
    queryFn: async () => camelizar<RequisitoGrado[]>(await evalCol.getRows(`${BASE}/${matriculaId}/requisitos`)),
  })
}

function useMutacionGraduacion<V, R>(fn: (v: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: graduacionKeys.all }),
  })
}

const ids = (xs: string[]) => xs.map(Number)

export const useMarcarRequisito = () =>
  useMutacionGraduacion((v: { ids: string[]; codigo: string; cumplido: boolean }) =>
    evalCol.put(`${BASE}/requisitos`, { IDS: ids(v.ids), CODIGO: v.codigo, CUMPLIDO: v.cumplido ? "S" : "N" }),
  )

export const useRegistrarGrado = () =>
  useMutacionGraduacion(
    async (v: { ids: string[]; fecha: Date; acta: string; modalidad: "CEREMONIA" | "VENTANILLA"; observacion: string }) =>
      camelizar<{ matriculaId: number; graduado: boolean; motivo: string | null }[]>(
        await evalCol.postRows(`${BASE}/registrar`, {
          IDS: ids(v.ids),
          FECHA: format(v.fecha, "yyyy-MM-dd"),
          ACTA: v.acta.trim(),
          MODALIDAD: v.modalidad,
          OBSERVACION: v.observacion.trim() || null,
        }),
      ),
  )

export const useAnularGraduacion = () =>
  useMutacionGraduacion((v: { id: string; motivo: string }) => evalCol.put(`${BASE}/${v.id}/anular`, { MOTIVO: v.motivo.trim() }))

export const useRegistrarEntrega = () =>
  useMutacionGraduacion(
    (v: { id: string; fecha: Date; recibe: "GRADUADO" | "AUTORIZADO"; nombre: string; documento: string; observacion: string }) =>
      evalCol.put(`${BASE}/${v.id}/entrega`, {
        FECHA: format(v.fecha, "yyyy-MM-dd"),
        RECIBE: v.recibe,
        NOMBRE: v.nombre.trim() || null,
        DOCUMENTO: v.documento.trim() || null,
        OBSERVACION: v.observacion.trim() || null,
      }),
  )

/** Multipart: el SOPORTE lo guarda file-service y el endpoint recibe su id (V786, FILE:matricula). */
export const useExpedirDuplicado = () =>
  useMutacionGraduacion((v: { id: string; causal: string; soporte: File; fecha: Date; observacion: string }) =>
    postMultipart(
      `/eval-col${BASE}/${v.id}/duplicado`,
      { CAUSAL: v.causal, FECHA: format(v.fecha, "yyyy-MM-dd"), OBSERVACION: v.observacion.trim() || null },
      { SOPORTE: v.soporte },
    ),
  )

/** Un solo PDF con el diploma de cada matrícula Graduado; la primera emisión asigna el número. */
export const useGenerarDiplomas = () =>
  useMutacionGraduacion(async (v: { ids: string[] }) => {
    const r = await downloadReport("informes-diplomas", { format: "pdf", filters: { IDS: ids(v.ids) } })
    if (r.status !== "ok") throw new Error(r.message)
  })
