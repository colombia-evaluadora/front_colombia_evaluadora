import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, UserSwitchIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"

import { useAsignarGestor } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { useGestoresCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { DialogCasoShell } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-caso-shell"

interface Props {
  caso: CasoResumen | null
  onClose: () => void
}

/** Asignar gestor (caso sin gestor) o Reasignar (G.2.CAS.GES.1/2, Regla 27). */
export function DialogGestor({ caso, onClose }: Props) {
  const { notify } = useNotify()
  const [gestor, setGestor] = useState("")
  const [intento, setIntento] = useState(false)
  const [errorMutacion, setErrorMutacion] = useState<unknown>(null)
  const candidatos = useGestoresCasoQuery(caso?.id)
  const asignar = caso != null && !caso.fk_gestor

  function cerrar() {
    setGestor("")
    setIntento(false)
    setErrorMutacion(null)
    onClose()
  }

  const mut = useAsignarGestor({
    mutationConfig: {
      onSuccess: () => {
        const nombre = candidatos.data?.find((c) => String(c.fk_tfuncionario) === gestor)?.nombre
        notify(nombre ? `Caso asignado a ${nombre}.` : "Gestor asignado.", { variant: "success" })
        cerrar()
      },
      onError: (error) => setErrorMutacion(error),
    },
  })

  const opciones = (candidatos.data ?? [])
    .filter((c) => !c.es_actual)
    .map((c) => ({ value: String(c.fk_tfuncionario), label: c.es_reportante ? `${c.nombre} (reportó el caso)` : c.nombre }))
  const error = intento && !gestor ? "Elija el nuevo gestor." : undefined

  return (
    <DialogCasoShell
      caso={caso}
      titulo={asignar ? "Asignar gestor" : "Reasignar"}
      onClose={cerrar}
      error={errorMutacion}
      pending={mut.isPending}
      confirmar={{
        label: asignar ? "Asignar" : "Reasignar",
        icon: <UserSwitchIcon data-icon="inline-start" />,
        onClick: () => {
          setIntento(true)
          if (!caso || !gestor) return
          mut.mutate({ casoId: caso.id, funcionarioId: Number(gestor) })
        },
      }}
    >
      <ComboOpciones
        id="gestor-nuevo"
        label={asignar ? "Gestor" : "Nuevo gestor"}
        required
        size="default"
        todos={false}
        value={gestor}
        options={opciones}
        disabled={candidatos.isPending}
        placeholder={
          candidatos.isPending
            ? "Cargando…"
            : opciones.length
              ? "Seleccione"
              : "No hay Supervisores de sede en la sede y jornada de los estudiantes"
        }
        error={error}
        onChange={setGestor}
      />
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>
          Solo aparecen los Supervisores de sede con rol activo en la sede y jornada de un estudiante del caso. Las
          citaciones automáticas pendientes del caso pasan al nuevo gestor.
        </AlertDescription>
      </Alert>
    </DialogCasoShell>
  )
}
