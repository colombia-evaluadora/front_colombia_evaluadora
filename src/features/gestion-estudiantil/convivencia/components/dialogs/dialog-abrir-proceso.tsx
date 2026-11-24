import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { MarcoOpciones } from "@/components/marco-opciones"
import { GavelIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"

import { useEstudiantesCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-apertura-query"
import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"
import { DialogCasoShell } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-caso-shell"

interface Props {
  caso: CasoResumen
  onClose: () => void
}

/**
 * Abrir proceso disciplinario desde el caso (G.2.CAS.DIS.2): se elige el estudiante entre los del caso (los que ya
 * tienen proceso salen deshabilitados) y el formulario se abre con el caso y el estudiante fijos.
 */
export function DialogAbrirProceso({ caso, onClose }: Props) {
  const navigate = useNavigate()
  const estudiantes = useEstudiantesCasoQuery(caso.id)
  const [elegido, setElegido] = useState("")
  const [intento, setIntento] = useState(false)
  const lista = estudiantes.data ?? []

  const continuar = () => {
    const e = lista.find((x) => String(x.fk_tmatricula) === elegido)
    if (!e) {
      setIntento(true)
      return
    }
    navigate({
      to: paths.app.convivenciaProcesoNuevo.getHref(),
      search: { caso: caso.id, matricula: e.fk_tmatricula, nombre: e.nombre },
    } as never)
  }

  return (
    <DialogCasoShell
      caso={caso}
      titulo="Abrir proceso disciplinario"
      onClose={onClose}
      error={estudiantes.error}
      pending={false}
      confirmar={{ label: "Abrir proceso disciplinario", icon: <GavelIcon data-icon="inline-start" />, onClick: continuar, disabled: estudiantes.isPending }}
    >
      {estudiantes.isPending ? (
        <Skeleton className="h-20" />
      ) : (
        <MarcoOpciones
          id="proceso-estudiante"
          label="Estudiante"
          required
          error={intento && !elegido ? "Elija el estudiante del proceso." : undefined}
        >
          <RadioGroup aria-labelledby="proceso-estudiante-label" value={elegido} onValueChange={setElegido}>
            {lista.map((e) => {
              const yaTiene = e.proceso_numero != null
              return (
                <label key={e.fk_tmatricula} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={String(e.fk_tmatricula)} disabled={yaTiene} />
                  <span className={yaTiene ? "text-muted-foreground" : undefined}>
                    {[e.nombre, e.grado_grupo].filter(Boolean).join(" · ")}
                    {yaTiene && ` · ya tiene el proceso ${e.proceso_numero}`}
                  </span>
                </label>
              )
            })}
            {lista.length === 0 && <p className="text-sm text-muted-foreground">El caso no tiene estudiantes disponibles.</p>}
          </RadioGroup>
        </MarcoOpciones>
      )}
    </DialogCasoShell>
  )
}
