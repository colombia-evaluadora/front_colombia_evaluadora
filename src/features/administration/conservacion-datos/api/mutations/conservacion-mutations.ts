import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { fetchArchivoViewUrl, postMultipart } from "@/lib/files"
import type { MutationConfig } from "@/lib/react-query"

import { CONSERVACION_BASE as BASE } from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import { conservacionKeys } from "@/features/administration/conservacion-datos/api/query-keys"
import {
  HUELLA_NO_COINCIDE,
  type CuentaDesde,
  type Disposicion,
  type Politica,
  type Resultado,
} from "@/features/administration/conservacion-datos/api/types"

/** Todas las escrituras invalidan el módulo completo: las pestañas se alimentan entre sí. */
function useConservacionMutation<TVars, TData>(
  mutationFn: (vars: TVars) => Promise<TData>,
  mutationConfig?: MutationConfig<(vars: TVars) => Promise<TData>>,
) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    ...rest,
    mutationFn: mutationFn as (vars: TVars) => Promise<Awaited<TData>>,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: conservacionKeys.all })
      onSuccess?.(...args)
    },
  })
}

export interface SavePoliticaVariables {
  /** Presente = modificar. */
  id?: number
  tipoRegistro: string
  pkModulo: number
  permanente: boolean
  plazoMinimo: number | null
  cuentaDesde: CuentaDesde | null
  disposicion: Disposicion | null
  habilitado: boolean
}

// Permanente manda plazo, desde y disposición en null. 409 si el tipo se repite.
async function savePolitica({ id, ...v }: SavePoliticaVariables) {
  const body = {
    TIPO_REGISTRO: v.tipoRegistro,
    PK_MODULO: v.pkModulo,
    PERMANENTE: v.permanente,
    PLAZO_MINIMO: v.permanente ? null : v.plazoMinimo,
    CUENTA_DESDE: v.permanente ? null : v.cuentaDesde,
    DISPOSICION: v.permanente ? null : v.disposicion,
    HABILITADO: v.habilitado,
  }
  const row =
    id == null
      ? await evalCol.postRow<Resultado<Politica>>(`${BASE}/politicas`, body)
      : await evalCol.putRow<Resultado<Politica>>(`${BASE}/politicas/${id}`, body)
  return row.resultado
}

export function useSavePolitica({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof savePolitica> } = {}) {
  return useConservacionMutation(savePolitica, mutationConfig)
}

async function estadoPolitica({ id, habilitado }: { id: number; habilitado: boolean }) {
  const row = await evalCol.putRow<Resultado<Politica>>(`${BASE}/politicas/${id}/estado`, {
    HABILITADO: habilitado,
  })
  return row.resultado
}

export function useEstadoPolitica({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof estadoPolitica> } = {}) {
  return useConservacionMutation(estadoPolitica, mutationConfig)
}

// Sin pkAmpliacion se crea (409 si ya existe); con él, se alarga. 400 si baja del mínimo.
async function saveAmpliacion(v: {
  pkAmpliacion: number | null
  pkPolitica: number
  pkEstablecimiento: number | null
  plazo: number
}) {
  return v.pkAmpliacion == null
    ? evalCol.postRow<Resultado<unknown>>(`${BASE}/ampliaciones`, {
        PK_POLITICA: v.pkPolitica,
        PK_ESTABLECIMIENTO: v.pkEstablecimiento,
        PLAZO: v.plazo,
      })
    : evalCol.putRow<Resultado<unknown>>(`${BASE}/ampliaciones/${v.pkAmpliacion}`, { PLAZO: v.plazo })
}

export function useSaveAmpliacion({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveAmpliacion> } = {}) {
  return useConservacionMutation(saveAmpliacion, mutationConfig)
}

/**
 * Lote completo por file-service (el acta viaja como ACTA). La disposición la
 * pone el back desde la política; DISPOSICION solo cambia Archivar por
 * Anonimizar mientras no haya almacenamiento.
 */
async function disponer(v: {
  pkPolitica: number
  pkEstablecimiento: number
  disposicion: Disposicion
  acta: File
  motivo: string
}) {
  await postMultipart(
    `/files/eval-col${BASE}/vencidos/disponer`,
    {
      PK_POLITICA: v.pkPolitica,
      PK_ESTABLECIMIENTO: v.pkEstablecimiento,
      DISPOSICION: v.disposicion,
      MOTIVO: v.motivo,
    },
    { ACTA: v.acta },
  )
}

export function useDisponer({ mutationConfig }: { mutationConfig?: MutationConfig<typeof disponer> } = {}) {
  return useConservacionMutation(disponer, mutationConfig)
}

interface AccesoArchivo {
  pkArchivo: number
  ubicacion: string
  huella: string
  fkTarchivoActa: number
}

async function sha256(blob: Blob) {
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")
}

function guardarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * El back deja el acceso en la Bitácora y devuelve dónde está el archivo y su
 * huella; aquí se descarga y se compara la SHA-256 antes de entregarlo.
 */
export function useDescargarArchivo() {
  return useMutation({
    mutationFn: async ({ pkArchivo, tipo }: { pkArchivo: number; tipo: "archivo" | "acta" }) => {
      const ruta = tipo === "acta" ? "acta" : "descarga"
      const { resultado } = await evalCol.postRow<Resultado<AccesoArchivo>>(`${BASE}/archivo/${pkArchivo}/${ruta}`)
      if (tipo === "acta") {
        const { url } = await fetchArchivoViewUrl(resultado.fkTarchivoActa)
        window.open(url, "_blank", "noopener")
        return
      }
      const respuesta = await fetch(resultado.ubicacion)
      if (!respuesta.ok) throw new Error("No se pudo descargar el archivo.")
      const blob = await respuesta.blob()
      if ((await sha256(blob)) !== resultado.huella) throw new Error(HUELLA_NO_COINCIDE)
      guardarBlob(blob, `archivo-${pkArchivo}`)
    },
  })
}
