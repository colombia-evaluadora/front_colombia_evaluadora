import { useEffect, useState } from "react"
import { useStore } from "@tanstack/react-form"
import { useSearch } from "@tanstack/react-router"

import { useAppForm } from "@/lib/forms"
import type { ExportResult } from "@/features/establishment/institution/api/types/export"

import { usePiarMutation } from "@/features/gestion-estudiantil/inclusion/piar/api/mutations/piar"
import type { PiarDetalle } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { usePiarAccess } from "@/features/gestion-estudiantil/inclusion/piar/api/use-piar-access"
import type { Dialogo } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"
import { datosAlBackend, datosDesdePiar, esquemaDatos } from "@/features/gestion-estudiantil/inclusion/piar/utils/datos-piar"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"
import { esEditable, soloFaltaActa } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

interface Aviso {
  id: number
  message: string
  variant: "error" | "success"
}

/** Estado y acciones de la ficha: los componentes solo pintan. */
export function useFichaPiar(piar: PiarDetalle) {
  const access = usePiarAccess()
  const { accion } = useSearch({ strict: false }) as { accion?: "acta" | "cerrar" }
  const guardar = usePiarMutation()
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)
  const [notice, setNotice] = useState<Aviso | null>(null)

  const estado = piar.estado.codigo
  const version = piar.version_actual
  const gestiona = access.puedeGestionar && esEditable(estado) && !piar.anulacion && !piar.solo_consulta
  const avisar = (message: string, variant: Aviso["variant"] = "error") => setNotice({ id: Date.now(), message, variant })

  const actaDelServidor = {
    fecha_acuerdo: version?.fecha_acuerdo?.slice(0, 10) ?? "",
    compromisos_establecimiento: version?.compromisos_establecimiento ?? "",
    compromisos_familia: version?.compromisos_familia ?? "",
  }
  const acta = useAppForm({ defaultValues: actaDelServidor })
  const [guardado, setGuardado] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: datosDesdePiar(piar),
    validators: { onSubmit: esquemaDatos },
    onSubmit: async ({ value }) => {
      try {
        await guardar.mutateAsync({ method: "put", url: `/${piar.id}`, body: datosAlBackend(value) })
        if (estado === "BORRADOR" && version) {
          const a = acta.state.values
          await guardar.mutateAsync({
            method: "put",
            url: `/versiones/${version.id}/acta`,
            body: {
              FECHA_ACUERDO: a.fecha_acuerdo || null,
              COMPROMISOS_ESTABLECIMIENTO: a.compromisos_establecimiento.trim() || null,
              COMPROMISOS_FAMILIA: a.compromisos_familia.trim() || null,
              FK_ARCHIVO_ACTA: version.acta?.id ?? null,
            },
          })
        }
        setGuardado(JSON.stringify([value, acta.state.values]))
        avisar("PIAR guardado.", "success")
      } catch (error) {
        avisar(mensajePiar(error))
      }
    },
  })

  const valores = useStore(form.store, (s) => s.values)
  const valoresActa = useStore(acta.store, (s) => s.values)
  const actual = JSON.stringify([valores, valoresActa])
  // El servidor puede normalizar lo guardado (recortar textos): vale como sin cambios igualar cualquiera de las dos versiones.
  const hayCambios = actual !== guardado && actual !== JSON.stringify([datosDesdePiar(piar), actaDelServidor])

  /** Con requisitos pendientes distintos del acta se explica qué falta (CIC.7) en vez de pedir el archivo. */
  const abrirActivacion = () =>
    setDialogo(soloFaltaActa(piar.activacion_faltantes) ? { tipo: "acta" } : { tipo: "bloqueos" })

  // Viene del menú ⁞ del listado (LIS.3).
  useEffect(() => {
    if (accion === "cerrar") setDialogo({ tipo: "cerrar" })
    if (accion === "acta") abrirActivacion()
    // Solo al entrar con la acción.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accion])

  const documento = async (p: Promise<ExportResult>) => {
    const r = await p
    if (r.status === "error") avisar("No pudimos generar el documento. Inténtelo de nuevo en unos minutos.")
  }
  const quitar = (url: string) => guardar.mutateAsync({ method: "patch", url }).catch((error) => avisar(mensajePiar(error)))

  return { piar, access, estado, version, gestiona, form, acta, guardando: guardar.isPending, hayCambios, dialogo, setDialogo, notice, setNotice, abrirActivacion, documento, quitar }
}

export type FichaPiar = ReturnType<typeof useFichaPiar>
