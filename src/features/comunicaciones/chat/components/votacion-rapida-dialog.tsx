import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowRightIcon, XIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, required } from "@/lib/forms/messages"
import type { Mensaje, TipoVotacionRapida } from "@/features/comunicaciones/chat/api/types"
import {
  useCrearVotacionRapida,
  useEditarVotacionRapida,
} from "@/features/comunicaciones/chat/api/mutations/use-votacion-rapida"
import { MINUTOS_VOTACION_RAPIDA } from "@/features/comunicaciones/chat/lib/votacion-rapida"

const FORM_ID = "votacion-rapida"

const schema = z.object({
  pregunta: z.string().trim().min(1, required("La pregunta", { femenino: true })).max(200, maxLength(200, "La pregunta")),
  tipo: z.enum(["VERDADERO_FALSO", "SI_NO"]),
  minutos: z.number(),
})

const TIPOS: [TipoVotacionRapida, string][] = [
  ["VERDADERO_FALSO", "Verdadero / Falso"],
  ["SI_NO", "Sí / No"],
]

const OPCIONES_MINUTOS = MINUTOS_VOTACION_RAPIDA.map((m) => ({
  value: m,
  label: m === 1 ? "1 minuto" : `${m} minutos`,
}))

// Crear o editar una votación rápida. `editar` = mensaje con la votación abierta.
export function VotacionRapidaDialog({
  conversacionId,
  editar,
  open,
  onClose,
}: {
  conversacionId: number
  editar?: Mensaje
  open: boolean
  onClose: () => void
}) {
  const crear = useCrearVotacionRapida(conversacionId)
  const editarMutation = useEditarVotacionRapida()
  const mutacion = editar ? editarMutation : crear
  const v = editar?.votacion

  const form = useAppForm({
    defaultValues: {
      pregunta: v?.pregunta ?? "",
      tipo: v?.tipo ?? ("SI_NO" as TipoVotacionRapida),
      minutos: v?.minutos ?? 5,
    },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      const datos = { ...value, pregunta: value.pregunta.trim() }
      const listo = { onSuccess: cerrar }
      if (editar) editarMutation.mutate({ mensajeId: editar.id, ...datos }, listo)
      else crear.mutate(datos, listo)
    },
  })

  function cerrar() {
    if (mutacion.isPending) return
    form.reset()
    crear.reset()
    editarMutation.reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editar ? "Editar la votación rápida" : "Crear una Votación rápida"}</DialogTitle>
        </DialogHeader>

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
          className="space-y-4 rounded-lg border p-3"
        >
          <form.AppField name="pregunta">
            {(f) => <f.TextField label="Pregunta" placeholder="¿Suspender clases mañana?" maxLength={200} />}
          </form.AppField>

          <form.Field name="tipo">
            {(f) => (
              <fieldset className="rounded-lg border px-3 pt-1 pb-3">
                <legend className="px-1 text-sm font-medium">Tipo de respuesta</legend>
                <RadioGroup
                  value={f.state.value}
                  onValueChange={(t) => f.handleChange(t as TipoVotacionRapida)}
                  className="flex flex-wrap gap-x-6 gap-y-2"
                >
                  {TIPOS.map(([valor, etiqueta]) => (
                    <label key={valor} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={valor} />
                      {etiqueta}
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
            )}
          </form.Field>

          <form.AppField name="minutos">
            {(f) => (
              <f.SelectField
                label="Tiempo límite"
                options={OPCIONES_MINUTOS}
                description="Al terminar el tiempo se cierra sola y se muestran los resultados."
              />
            )}
          </form.AppField>
        </form>

        {editar && (
          <p className="text-xs text-muted-foreground">Al guardar se reinician los votos y el tiempo.</p>
        )}
        {mutacion.isError && (
          <p role="alert" className="text-sm text-red">
            {getErrorMessage(mutacion.error)}
          </p>
        )}

        {/* Los botones aparecen cuando ya hay una pregunta escrita. */}
        <form.Subscribe selector={(st) => st.values.pregunta.trim() !== ""}>
          {(lleno) =>
            lleno && (
              <DialogFooter>
                <Button type="submit" form={FORM_ID} disabled={mutacion.isPending} aria-busy={mutacion.isPending}>
                  {editar ? "Guardar" : "Crear"}
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
                <Button type="button" color="neutral" onClick={cerrar} disabled={mutacion.isPending}>
                  <XIcon data-icon="inline-start" />
                  Cancelar
                </Button>
              </DialogFooter>
            )
          }
        </form.Subscribe>
      </DialogContent>
    </Dialog>
  )
}
