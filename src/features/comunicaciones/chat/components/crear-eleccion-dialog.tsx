import { useEffect, useState } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageUploadField } from "@/components/image-upload-field"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusCircleIcon,
  XIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, required } from "@/lib/forms/messages"
import { cn } from "@/lib/utils"
import { useJornadasQuery } from "@/features/establishment/academic-period/api/query/use-jornadas"
import {
  useCrearEleccion,
  type CandidatoNuevo,
} from "@/features/comunicaciones/chat/api/mutations/use-crear-eleccion"
import { iniciales } from "@/features/comunicaciones/chat/lib/chat-format"

const MIN_CANDIDATOS = 2

const datosSchema = z
  .object({
    nombre: z.string().trim().min(1, required("El nombre")).max(80, maxLength(80, "El nombre")),
    descripcion: z.string().max(500, maxLength(500, "La descripción")),
    fechaInicio: z.string().nullable(),
    fechaCierre: z.string().nullable(),
    jornadaId: z.number().min(1, required("La jornada", { femenino: true })),
    verResultadosEnVivo: z.boolean(),
    permitirComentarios: z.boolean(),
  })
  .refine((v) => !v.fechaInicio || !v.fechaCierre || v.fechaCierre > v.fechaInicio, {
    path: ["fechaCierre"],
    message: "La fecha final debe ser posterior a la de inicio.",
  })

type Datos = z.infer<typeof datosSchema>

const DATOS_INICIALES: Datos = {
  nombre: "",
  descripcion: "",
  fechaInicio: null,
  fechaCierre: null,
  jornadaId: 0,
  verResultadosEnVivo: false,
  permitirComentarios: false,
}

interface CandidatoLocal extends CandidatoNuevo {
  clave: number
}

// `yyyy-MM-dd'T'HH:mm` local → ISO para el back.
const aIso = (v: string | null) => (v ? new Date(v).toISOString() : null)

export function CrearEleccionDialog({
  open,
  onClose,
  onCreada,
}: {
  open: boolean
  onClose: () => void
  onCreada: (conversacionId: number) => void
}) {
  const { notify } = useNotify()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [candidatos, setCandidatos] = useState<CandidatoLocal[]>([])
  const [descartar, setDescartar] = useState(false)
  const crear = useCrearEleccion()
  const { data: jornadas = [] } = useJornadasQuery()

  const datos = useAppForm({
    defaultValues: DATOS_INICIALES,
    validators: { onSubmit: datosSchema },
    onSubmit: () => setPaso(2),
  })

  const reiniciar = () => {
    datos.reset()
    setCandidatos([])
    setPaso(1)
    crear.reset()
    onClose()
  }

  const intentarCerrar = () => {
    if (crear.isPending) return
    if (datos.state.isDirty || candidatos.length > 0) setDescartar(true)
    else reiniciar()
  }

  const crearEleccion = () => {
    const v = datos.state.values
    crear.mutate(
      {
        nombre: v.nombre.trim(),
        descripcion: v.descripcion.trim(),
        fechaInicio: aIso(v.fechaInicio),
        fechaCierre: aIso(v.fechaCierre),
        jornadaId: v.jornadaId,
        verResultadosEnVivo: v.verResultadosEnVivo,
        permitirComentarios: v.permitirComentarios,
        candidatos: candidatos.map(({ clave: _clave, ...c }) => c),
      },
      {
        onSuccess: (canal) => {
          notify(`Se creó la elección ${canal.nombre}.`)
          reiniciar()
          onCreada(canal.id)
        },
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && intentarCerrar()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear una Elección</DialogTitle>
          </DialogHeader>

          {paso === 1 ? (
            <form
              id="eleccion-datos"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void datos.handleSubmit()
              }}
              className="space-y-4"
            >
              <datos.AppField name="nombre">
                {(f) => (
                  <f.TextField
                    label="Nombre"
                    required
                    maxLength={80}
                    placeholder="Por ejemplo, Elección Personero 2026"
                  />
                )}
              </datos.AppField>
              <datos.AppField name="descripcion">
                {(f) => <f.TextareaField label="Descripción" maxLength={500} />}
              </datos.AppField>
              <div className="grid gap-4 sm:grid-cols-2">
                <datos.AppField name="fechaInicio">
                  {(f) => <f.DateField label="Fecha inicio" mode="datetime" minDate={new Date()} />}
                </datos.AppField>
                <datos.AppField name="fechaCierre">
                  {(f) => (
                    <f.DateField
                      label="Fecha final"
                      mode="datetime"
                      minDate={new Date()}
                      description="Al llegar esta fecha se cierra la votación."
                    />
                  )}
                </datos.AppField>
              </div>
              <datos.AppField name="jornadaId">
                {(f) => (
                  <f.SelectField
                    label="Jornada"
                    required
                    emptyValue={0}
                    placeholder="Seleccionar"
                    options={jornadas.map((j) => ({ value: j.id, label: j.name }))}
                  />
                )}
              </datos.AppField>
              <fieldset className="rounded-lg border px-3 pt-1 pb-3">
                <legend className="px-1 text-sm font-medium">Permitir</legend>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <datos.AppField name="verResultadosEnVivo">
                    {(f) => <f.CheckboxField label="Ver resultados en tiempo real" />}
                  </datos.AppField>
                  <datos.AppField name="permitirComentarios">
                    {(f) => <f.CheckboxField label="Comentarios" />}
                  </datos.AppField>
                </div>
              </fieldset>
            </form>
          ) : (
            <PasoCandidatos candidatos={candidatos} onCambio={setCandidatos} />
          )}

          {crear.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(crear.error)}
            </p>
          )}

          <DialogFooter className="sm:justify-between">
            {paso === 1 ? (
              <Button type="submit" form="eleccion-datos" className="sm:ml-auto">
                Siguiente
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            ) : (
              <>
                <Button type="button" onClick={() => setPaso(1)} disabled={crear.isPending}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Atrás
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={crearEleccion}
                    disabled={candidatos.length < MIN_CANDIDATOS || crear.isPending}
                    aria-busy={crear.isPending}
                    title={
                      candidatos.length < MIN_CANDIDATOS
                        ? `Agrega al menos ${MIN_CANDIDATOS} candidatos`
                        : undefined
                    }
                  >
                    Crear
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                  <Button
                    type="button"
                    color="neutral"
                    onClick={intentarCerrar}
                    disabled={crear.isPending}
                  >
                    <XIcon data-icon="inline-start" />
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog
        open={descartar}
        onOpenChange={setDescartar}
        onConfirm={() => {
          setDescartar(false)
          reiniciar()
        }}
      />
    </>
  )
}

const candidatoSchema = z.object({
  nombre: z.string().trim().min(1, required("El nombre")).max(80, maxLength(80, "El nombre")),
  numero: z.string().trim().min(1, required("El número")),
  lema: z.string().max(80, maxLength(80, "El lema")),
})

let siguienteClave = 1

function PasoCandidatos({
  candidatos,
  onCambio,
}: {
  candidatos: CandidatoLocal[]
  onCambio: (c: CandidatoLocal[]) => void
}) {
  const [foto, setFoto] = useState<File | null>(null)

  const form = useAppForm({
    defaultValues: { nombre: "", numero: "", lema: "" },
    validators: { onSubmit: candidatoSchema },
    onSubmit: ({ value }) => {
      onCambio([
        ...candidatos,
        {
          clave: siguienteClave++,
          nombre: value.nombre.trim(),
          numero: value.numero.trim(),
          lema: value.lema.trim(),
          foto,
        },
      ])
      form.reset()
      setFoto(null)
    },
  })

  return (
    <div className="space-y-4">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
        className="space-y-3 border-b pb-4"
      >
        <h3 className="text-sm font-semibold">Agregar candidato</h3>
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <ImageUploadField
            value={foto}
            onValueChange={setFoto}
            description="la foto del candidato"
            deleteLabel="Quitar foto"
            className="min-h-40 sm:h-full"
          />
          <div className="space-y-3">
            <form.AppField name="nombre">
              {(f) => <f.TextField label="Nombre" required maxLength={80} />}
            </form.AppField>
            <form.AppField
              name="numero"
              validators={{
                onSubmit: ({ value }) =>
                  candidatos.some((c) => c.numero === value.trim())
                    ? "Ya hay un candidato con ese número."
                    : undefined,
              }}
            >
              {(f) => <f.NumberField label="Número" required maxDigits={3} />}
            </form.AppField>
            <form.AppField name="lema">
              {(f) => <f.TextField label="Lema" maxLength={80} />}
            </form.AppField>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            <PlusCircleIcon data-icon="inline-start" />
            Agregar
          </Button>
        </div>
      </form>

      <ul className="space-y-2" aria-label="Candidatos agregados">
        {candidatos.map((c) => (
          <li key={c.clave}>
            <TarjetaCandidato
              candidato={c}
              onQuitar={() => onCambio(candidatos.filter((x) => x.clave !== c.clave))}
            />
          </li>
        ))}
        <li className="rounded-lg border px-4 py-3 text-sm font-semibold">Voto en blanco</li>
      </ul>
      {candidatos.length < MIN_CANDIDATOS && (
        <p className="text-sm text-muted-foreground">
          Agrega al menos {MIN_CANDIDATOS} candidatos para crear la elección.
        </p>
      )}
    </div>
  )
}

function TarjetaCandidato({
  candidato: c,
  onQuitar,
}: {
  candidato: CandidatoLocal
  onQuitar: () => void
}) {
  const url = useUrlArchivo(c.foto)
  return (
    <div className="relative flex items-center gap-3 rounded-lg border px-4 py-3">
      <span className="w-8 shrink-0 text-lg font-bold text-muted-foreground tabular-nums">
        {c.numero}
      </span>
      <FotoCandidato url={url} nombre={c.nombre} />
      <div className="min-w-0 flex-1 pr-6">
        <p className="truncate font-semibold">{c.nombre}</p>
        {c.lema && <p className="truncate text-sm text-muted-foreground">{c.lema}</p>}
      </div>
      <button
        type="button"
        aria-label={`Quitar a ${c.nombre}`}
        onClick={onQuitar}
        className="absolute top-2 right-2 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}

export function FotoCandidato({
  url,
  nombre,
  className,
}: {
  url: string | null
  nombre: string
  className?: string
}) {
  return url ? (
    <img src={url} alt="" className={cn("size-12 shrink-0 rounded-md object-cover", className)} />
  ) : (
    <span
      aria-hidden
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-md bg-navy-22 text-sm font-semibold text-navy",
        className,
      )}
    >
      {iniciales(nombre)}
    </span>
  )
}

// URL temporal para previsualizar un archivo local; se libera al cambiar.
function useUrlArchivo(archivo: File | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!archivo) return
    const u = URL.createObjectURL(archivo)
    setUrl(u)
    return () => {
      URL.revokeObjectURL(u)
      setUrl(null)
    }
  }, [archivo])
  return url
}
