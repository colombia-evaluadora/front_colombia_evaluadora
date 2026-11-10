import { useNavigate } from "@tanstack/react-router"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { z } from "zod"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { range } from "@/lib/forms/messages"
import { coberturaConfigPeriodoRoute } from "@/router"

import { useModificarPeriodoInscripcion } from "@/features/coverage/inscripcion-reservas/api/mutations/configuracion"
import {
  nombrePeriodo,
  usePeriodoConfigQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-configuracion-query"
import type {
  ModoTraslado,
  PeriodoInscripcionConfig,
} from "@/features/coverage/inscripcion-reservas/api/types/configuracion"
import {
  Aviso,
  CampoLectura,
  SeccionFija,
} from "@/features/coverage/inscripcion-reservas/components/reserva-ui"
import { Opciones } from "@/features/coverage/inscripcion-reservas/pages/config-grupo-page"

const FORM_ID = "config-periodo-form"
const fecha = (iso: string) => format(parseISO(iso), "dd/MM/yyyy")
const volverA = `${paths.app.coberturaInscritos.getHref()}?tab=configuracion&conf=periodos`

/** Modificar período (Sección 3.7): liberación de reservas y aceptación de traslados. */
export function ConfigPeriodoPage() {
  const { periodoId } = coberturaConfigPeriodoRoute.useParams()
  const { data, isPending, isError, error } = usePeriodoConfigQuery(periodoId)

  if (isPending) {
    return (
      <TableScreen>
        <TableScreenBody>
          <Skeleton className="h-96 w-full" />
        </TableScreenBody>
      </TableScreen>
    )
  }
  if (isError) {
    return (
      <TableScreen>
        <TableScreenBody>
          <p className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</p>
        </TableScreenBody>
      </TableScreen>
    )
  }
  return <ConfigPeriodoForm key={data.id} periodo={data} />
}

function ConfigPeriodoForm({ periodo }: { periodo: PeriodoInscripcionConfig }) {
  const navigate = useNavigate()
  const volver = () => navigate({ to: volverA })
  const modificar = useModificarPeriodoInscripcion()

  const desde = periodo.fechaCierreInscripcion
  const hasta = periodo.fechaLimiteMatricula
  const schema = z.object({
    fechaLiberacionReservas: z
      .string()
      .nullable()
      .refine((v) => !v || ((!desde || v >= desde) && v <= hasta), "Fuera del rango permitido."),
    modoTraslado: z.enum(["MANUAL", "AUTOMATICA"]),
    plazoRespuestaTraslado: z
      .number(range(1, 60, "El plazo"))
      .int()
      .min(1, range(1, 60, "El plazo"))
      .max(60, range(1, 60, "El plazo")),
    requiereConfirmacionAcudiente: z.boolean(),
  })

  const form = useAppForm({
    defaultValues: {
      fechaLiberacionReservas: periodo.fechaLiberacionReservas,
      modoTraslado: periodo.modoTraslado as ModoTraslado,
      plazoRespuestaTraslado: periodo.plazoRespuestaTraslado,
      requiereConfirmacionAcudiente: periodo.requiereConfirmacionAcudiente,
    },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) =>
      modificar.mutateAsync(
        { id: periodo.id, ...value },
        {
          onSuccess: () => {
            toast.success(`Se guardó la configuración de ${nombrePeriodo(periodo)}.`)
            volver()
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      ),
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                color="neutral"
                disabled={modificar.isPending}
                onClick={volver}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button type="submit" form={FORM_ID} disabled={modificar.isPending}>
                {modificar.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </div>
          }
        >
          {nombrePeriodo(periodo)}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <form
          id={FORM_ID}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <SeccionFija titulo="Configuración del período">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
                <CampoLectura
                  id="periodo"
                  label="Período Académico"
                  value={`${nombrePeriodo(periodo)} · Ciclo ${periodo.ciclo}`}
                />
                <form.AppField name="fechaLiberacionReservas">
                  {(f) => (
                    <f.DateField
                      label="Fecha de liberación de reservas"
                      nullable
                      minDate={desde ? parseISO(desde) : undefined}
                      maxDate={parseISO(hasta)}
                      description={
                        desde
                          ? `Entre la Fecha de cierre de inscripción (${fecha(desde)}) y la Fecha límite de matrícula (${fecha(hasta)}).`
                          : `Hasta la Fecha límite de matrícula (${fecha(hasta)}).`
                      }
                    />
                  )}
                </form.AppField>
                <form.Field name="modoTraslado">
                  {(f) => (
                    <Opciones
                      legend="Modo de aceptación de traslados"
                      value={f.state.value}
                      onChange={(v) => f.handleChange(v as ModoTraslado)}
                      opciones={[
                        ["MANUAL", "Manual"],
                        ["AUTOMATICA", "Automática"],
                      ]}
                    />
                  )}
                </form.Field>
                <form.AppField name="plazoRespuestaTraslado">
                  {(f) => (
                    <f.NumberField
                      label="Plazo de respuesta del traslado"
                      required
                      valueAs="number"
                      maxDigits={2}
                      description="Días, de 1 a 60."
                    />
                  )}
                </form.AppField>
              </div>

              <form.Field name="requiereConfirmacionAcudiente">
                {(f) => (
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">
                      Requiere confirmación del acudiente <span className="text-red">*</span>
                    </span>
                    <label className="flex w-fit cursor-pointer items-center gap-2">
                      <Switch
                        checked={f.state.value}
                        onCheckedChange={f.handleChange}
                        className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
                      />
                      <span className="text-sm">{f.state.value ? "Sí" : "No"}</span>
                    </label>
                  </div>
                )}
              </form.Field>

              <Aviso tono="info">
                Usa la Fecha límite de matrícula y Habilitar reserva de cupos del Período Académico
                (módulo Establecimiento).
              </Aviso>
              <p className="text-xs text-muted-foreground">
                Los campos marcados con * son obligatorios
              </p>
            </div>
          </SeccionFija>
        </form>
      </TableScreenBody>
    </TableScreen>
  )
}
