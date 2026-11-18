import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { GavelIcon, InfoIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"

import { useEstudiantesCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-apertura-query"
import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"
import { DialogCasoShell } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-caso-shell"

interface Props {
  /** Caso abierto; null cierra el modal. */
  caso: CasoResumen | null
  onClose: () => void
}

/**
 * G.2.CAS.DIS.2: antes del formulario se elige el estudiante del proceso entre los
 * presuntos agresores del caso que aún no tienen un proceso activo por él
 * (`opciones/estudiantes-caso`). Continuar abre el formulario (G.2.CAS.DIS.3) con
 * ese estudiante y el caso como origen.
 */
export function DialogElegirEstudianteProceso({ caso, onClose }: Props) {
  const navigate = useNavigate()
  const estudiantes = useEstudiantesCasoQuery(caso?.id ?? null)
  const [elegido, setElegido] = useState("")
  const [intentado, setIntentado] = useState(false)
  const opciones = estudiantes.data ?? []

  function continuar() {
    setIntentado(true)
    const estudiante = opciones.find((e) => String(e.fk_tmatricula) === elegido)
    if (!caso || !estudiante) return
    navigate({
      to: paths.app.convivenciaProcesoNuevo.getHref(),
      search: { caso: caso.id, matricula: estudiante.fk_tmatricula, nombre: estudiante.nombre },
    } as never)
  }

  return (
    <DialogCasoShell
      caso={caso}
      titulo="Abrir proceso disciplinario"
      onClose={() => {
        setElegido("")
        setIntentado(false)
        onClose()
      }}
      error={estudiantes.error}
      pending={false}
      confirmar={{
        label: "Abrir proceso disciplinario",
        icon: <GavelIcon />,
        onClick: continuar,
        disabled: estudiantes.isPending || opciones.length === 0,
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">
          Estudiante <span data-required-mark="">*</span>
        </legend>
        {estudiantes.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : opciones.length === 0 ? (
          <Alert variant="info">
            <InfoIcon />
            <AlertDescription>
              Ningún presunto agresor del caso está disponible: todos tienen ya un proceso activo por este caso o no siguen
              Cursando.
            </AlertDescription>
          </Alert>
        ) : (
          <RadioGroup value={elegido} onValueChange={(v) => setElegido(String(v))} className="flex flex-col gap-2">
            {opciones.map((e) => (
              <label
                key={e.fk_tmatricula}
                className="has-data-checked:border-primary has-data-checked:bg-primary-22 flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm"
              >
                <RadioGroupItem value={String(e.fk_tmatricula)} />
                <span className="font-medium">{e.nombre}</span>
                <span className="text-muted-foreground">· {e.grado_grupo}</span>
              </label>
            ))}
          </RadioGroup>
        )}
        {intentado && !elegido && opciones.length > 0 && <p className="text-red text-xs">Elija el estudiante.</p>}
        <p className="text-muted-foreground text-xs">
          Solo se ofrecen los presuntos agresores del caso con matrícula Cursando y sin un proceso activo por este caso.
        </p>
      </fieldset>
    </DialogCasoShell>
  )
}
