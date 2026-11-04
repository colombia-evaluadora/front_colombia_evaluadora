import { useMemo, useState } from "react"

import { queueNotice, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import type { ComiteDetalle, SesionDetalle } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { useActualizarSesionMutation, useCrearSesionMutation } from "@/features/gestion-estudiantil/convivencia/api/mutations/comite"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { useComiteNavegacion } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-navegacion"
import {
  asistentesVigentes,
  casoVacio,
  desdeSesion,
  hayQuorum,
  integrantesVigentesEn,
  invitadoVacio,
  quorumMinimo,
  sesionConErrores,
  sesionInput,
  validarSesion,
  valoresSesionVacios,
  type CasoFila,
  type InvitadoFila,
  type ValoresSesion,
} from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface Params {
  periodo: number
  comite: ComiteDetalle
  /** Sesión que se modifica; ausente al crear. */
  sesion?: SesionDetalle
}

/** Estado, cálculo de asistentes vigentes y quórum, validación y envío de Nueva sesión / Modificar (G.2.COM.SES.3). */
export function useSesionForm({ periodo, comite, sesion }: Params) {
  const editar = sesion != null
  const { notify } = useNotify()
  const nav = useComiteNavegacion()
  const [v, setV] = useState<ValoresSesion>(() => (sesion ? desdeSesion(sesion) : valoresSesionVacios()))
  const [intento, setIntento] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const crear = useCrearSesionMutation()
  const actualizar = useActualizarSesionMutation()

  const set = (patch: Partial<ValoresSesion>) => setV((prev) => ({ ...prev, ...patch }))

  /** Integrantes vigentes en la fecha elegida; se recalculan al cambiarla. */
  const vigentes = useMemo(() => integrantesVigentesEn(comite.integrantes, v.fecha), [comite.integrantes, v.fecha])
  const asistentes = asistentesVigentes(v.asistentes, vigentes)
  const total = vigentes.length
  const quorum = hayQuorum(asistentes.length, total)

  const errores = useMemo(() => (intento ? validarSesion(v) : { invitados: {}, casos: {} }), [intento, v])

  const cambiarFecha = (fecha: string) =>
    setV((prev) => ({
      ...prev,
      fecha,
      // Quien ya no es vigente en la nueva fecha deja de figurar como asistente.
      asistentes: asistentesVigentes(prev.asistentes, integrantesVigentesEn(comite.integrantes, fecha)),
    }))

  const marcarAsistente = (id: number, asistio: boolean) =>
    set({ asistentes: asistio ? [...new Set([...v.asistentes, id])] : v.asistentes.filter((a) => a !== id) })

  const cambiarInvitado = (key: string, patch: Partial<InvitadoFila>) =>
    set({ invitados: v.invitados.map((i) => (i.key === key ? { ...i, ...patch } : i)) })
  const cambiarCaso = (key: string, patch: Partial<CasoFila>) =>
    set({ casos: v.casos.map((c) => (c.key === key ? { ...c, ...patch } : c)) })

  async function guardar() {
    setIntento(true)
    const e = validarSesion(v)
    if (sesionConErrores(e)) {
      notify("Revise los campos marcados.", { variant: "error" })
      enfocarPrimerError()
      return
    }
    if (total === 0) {
      notify("No hay integrantes vigentes del Comité en esa fecha.", { variant: "error" })
      return
    }
    setGuardando(true)
    try {
      const input = sesionInput({ ...v, asistentes })
      if (editar) await actualizar.mutateAsync({ sesionId: sesion.id, ...input })
      else await crear.mutateAsync({ comiteId: comite.fk_comite as number, ...input })
      queueNotice(editar ? "Sesión modificada." : "Sesión registrada.", { variant: "success" })
      if (editar) nav.aSesion(sesion.id)
      else nav.aPestana(periodo)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setGuardando(false)
    }
  }

  return {
    editar,
    v,
    set,
    errores,
    intento,
    guardando,
    vigentes,
    asistentes,
    total,
    minimoQuorum: quorumMinimo(total),
    quorum,
    cambiarFecha,
    marcarAsistente,
    agregarInvitado: () => set({ invitados: [...v.invitados, invitadoVacio()] }),
    cambiarInvitado,
    quitarInvitado: (key: string) => set({ invitados: v.invitados.filter((i) => i.key !== key) }),
    agregarCaso: () => set({ casos: [...v.casos, casoVacio()] }),
    cambiarCaso,
    quitarCaso: (key: string) => set({ casos: v.casos.filter((c) => c.key !== key) }),
    guardar,
    volver: () => (editar ? nav.aSesion(sesion.id) : nav.aPestana(periodo)),
  }
}

export type SesionFormState = ReturnType<typeof useSesionForm>
