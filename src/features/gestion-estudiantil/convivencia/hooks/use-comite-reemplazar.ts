import { useState } from "react"

import type { Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import type { IntegranteComite } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { useReemplazarIntegranteMutation } from "@/features/gestion-estudiantil/convivencia/api/mutations/comite"
import type { PersonaValor } from "@/features/gestion-estudiantil/convivencia/components/comite/campo-persona"
import { dia, HOY, PERSONA_VACIA, type DatoCargo } from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** Qué identifica a la persona de un cargo, deducido de quien lo ocupa hoy. */
export const datoDeIntegrante = (i: Pick<IntegranteComite, "fk_funcionario" | "fk_matricula">): DatoCargo =>
  i.fk_funcionario != null ? "FUNCIONARIO" : i.fk_matricula != null ? "ESTUDIANTE" : "NOMBRE"

/** Estado y envío de «Reemplazar — Cargo» (G.2.COM.INT.2). */
export function useComiteReemplazar(integrante: IntegranteComite | null, onClose: () => void) {
  const { notify } = useNotify()
  const [persona, setPersona] = useState<PersonaValor>({ ...PERSONA_VACIA })
  const [fecha, setFecha] = useState(HOY())
  const [intento, setIntento] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const mut = useReemplazarIntegranteMutation()

  const dato = integrante ? datoDeIntegrante(integrante) : null
  const desde = dia(integrante?.desde)

  const errores = {
    persona:
      !intento || !dato
        ? undefined
        : dato === "FUNCIONARIO" && persona.fk_funcionario == null
          ? "Elija el funcionario."
          : dato === "ESTUDIANTE" && persona.fk_matricula == null
            ? "Elija el estudiante."
            : dato === "NOMBRE" && persona.nombre.trim().length < 3
              ? "Escriba el nombre (mínimo 3 caracteres)."
              : undefined,
    fecha: !intento ? undefined : !fecha ? "Indique la fecha." : fecha <= desde ? "Debe ser posterior al inicio del integrante actual." : undefined,
  }

  function cerrar() {
    setPersona({ ...PERSONA_VACIA })
    setFecha(HOY())
    setIntento(false)
    setNotice(null)
    onClose()
  }

  async function reemplazar() {
    setIntento(true)
    setNotice(null)
    if (!integrante || !dato) return
    const falta =
      (dato === "FUNCIONARIO" && persona.fk_funcionario == null) ||
      (dato === "ESTUDIANTE" && persona.fk_matricula == null) ||
      (dato === "NOMBRE" && persona.nombre.trim().length < 3) ||
      !fecha ||
      fecha <= desde
    if (falta) return
    try {
      await mut.mutateAsync({
        integranteId: integrante.id,
        ...(dato === "FUNCIONARIO" && { FK_FUNCIONARIO: persona.fk_funcionario as number }),
        ...(dato === "ESTUDIANTE" && { FK_MATRICULA: persona.fk_matricula as number }),
        ...(dato === "NOMBRE" && { NOMBRE: persona.nombre.trim() }),
        DESDE: fecha,
      })
      notify(`Integrante reemplazado en ${integrante.cargo_nombre}.`, { variant: "success" })
      cerrar()
    } catch (error) {
      setNotice({ id: Date.now(), message: getErrorMessage(error) })
    }
  }

  return {
    dato,
    persona,
    setPersona,
    fecha,
    setFecha,
    errores,
    notice,
    cerrarNotice: () => setNotice(null),
    pending: mut.isPending,
    reemplazar,
    cerrar,
  }
}
