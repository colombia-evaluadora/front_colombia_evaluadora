import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { TrashIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  useCrearEtiqueta,
  useEliminarEtiqueta,
} from "@/features/comunicaciones/foros/api/mutations/use-acciones-foro"
import { etiquetaSchema } from "@/features/comunicaciones/foros/api/schema"
import { COLORES_ETIQUETA, type ColorEtiqueta, type Foro } from "@/features/comunicaciones/foros/api/types"
import { EtiquetaChip } from "@/features/comunicaciones/foros/components/etiqueta-chip"
import { CLASE_ETIQUETA, NOMBRE_COLOR } from "@/features/comunicaciones/foros/lib/foros"

// Etiquetas del foro (solo moderación): crear con color y quitar.
export function EtiquetasDialog({
  foro,
  open,
  onClose,
  disabled,
}: {
  foro: Foro
  open: boolean
  onClose: () => void
  // Sin conexión: se ven pero no se cambian.
  disabled: boolean
}) {
  const { notify } = useNotify()
  const [nombre, setNombre] = useState("")
  const [color, setColor] = useState<ColorEtiqueta>("BLUE")
  const [soloModeradores, setSoloModeradores] = useState(false)
  const [intento, setIntento] = useState(false)
  const crear = useCrearEtiqueta()
  const eliminar = useEliminarEtiqueta()
  const validacion = etiquetaSchema.safeParse({ nombre, color, soloModeradores })
  const error = intento && !validacion.success ? validacion.error.issues[0]?.message : undefined

  const agregar = () => {
    setIntento(true)
    if (!validacion.success) return
    crear.mutate(
      { foroId: foro.id, ...validacion.data },
      {
        onSuccess: (e) => {
          notify(`Se creó la etiqueta ${e.nombre}.`)
          setNombre("")
          setSoloModeradores(false)
          setIntento(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !crear.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Etiquetas de {foro.nombre}</DialogTitle>
          <DialogDescription>
            Ordenan las publicaciones y sirven de filtro. Las de moderación solo las pone la moderación (p. ej. "Anuncio").
          </DialogDescription>
        </DialogHeader>

        {foro.etiquetas.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {foro.etiquetas.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <EtiquetaChip etiqueta={e} />
                  {e.soloModeradores && <span className="text-xs text-muted-foreground">Solo moderación</span>}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  color="destructive"
                  size="icon-xs"
                  aria-label={`Eliminar la etiqueta ${e.nombre}`}
                  disabled={disabled || eliminar.isPending}
                  onClick={() =>
                    eliminar.mutate(
                      { id: e.id, foroId: foro.id },
                      {
                        onSuccess: () => notify(`Se eliminó la etiqueta ${e.nombre}.`),
                        onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
                      },
                    )
                  }
                >
                  <TrashIcon />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Este foro todavía no tiene etiquetas.</p>
        )}

        <form
          className="space-y-3 rounded-lg border p-3"
          onSubmit={(e) => {
            e.preventDefault()
            agregar()
          }}
        >
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="foro-etiqueta">Nueva etiqueta</FieldLabel>
            <Input
              id="foro-etiqueta"
              value={nombre}
              maxLength={40}
              disabled={disabled}
              aria-invalid={Boolean(error)}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="P. ej.: Tarea, Duda, Resuelta"
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Color</legend>
            <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
              {COLORES_ETIQUETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={NOMBRE_COLOR[c]}
                  disabled={disabled}
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-7 rounded-full border-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    CLASE_ETIQUETA[c],
                    color === c && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                  )}
                />
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={soloModeradores} onCheckedChange={setSoloModeradores} disabled={disabled} />
            Solo la moderación la pone
          </label>
          {crear.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(crear.error)}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={disabled || crear.isPending} aria-busy={crear.isPending}>
              Agregar etiqueta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
