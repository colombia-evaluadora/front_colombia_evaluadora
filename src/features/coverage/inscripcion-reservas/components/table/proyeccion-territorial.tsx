import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeftIcon,
  ArrowUUpLeftIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  XIcon,
} from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { cn } from "@/lib/utils"
import { coberturaInscritosRoute } from "@/router"

import {
  useAprobarProyeccion,
  useDevolverProyeccion,
} from "@/features/coverage/inscripcion-reservas/api/mutations/territorial"
import { useProyeccionDetalleQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import type {
  EstadoProyeccion,
  ProyeccionEstablecimiento,
  ProyeccionGrado,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"
import { Marca } from "@/features/coverage/inscripcion-reservas/components/table/columns-inscripciones"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

export const ESTADO_PROYECCION_UI: Record<
  EstadoProyeccion,
  { label: string; color: "success" | "neutral"; punto: boolean }
> = {
  APROBADA: { label: "Aprobada", color: "success", punto: true },
  PROYECTADA: { label: "Proyectada", color: "neutral", punto: false },
}

const num = "tabular-nums"
const wrap = "whitespace-normal"
const cifra = (n: number | null) => (n == null ? "—" : n)
const conSigno = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))

/** Grados con cupo libre negativo: el déficit se mide para el establecimiento completo. */
const conDeficit = (detalle: ProyeccionGrado[]) =>
  detalle.filter((g) => g.cupoLibre != null && g.cupoLibre < 0)

/** "1° (−10 cupos)" para el aviso de Aprobar. */
const textoDeficit = (detalle: ProyeccionGrado[]) =>
  conDeficit(detalle)
    .map((g) => `${g.grado} (${conSigno(g.cupoLibre!)} cupos)`)
    .join(", ")

function MarcaMetodologia({ grado }: { grado: ProyeccionGrado }) {
  const distintas = grado.metodologias.filter((m) => !/^tradicional/i.test(m.nombre))
  if (!distintas.length) return <Marca label="Tradicional" color="neutral" punto={false} />
  const parcial = distintas.length === 1 && distintas[0].grupos < grado.grupos
  return (
    <Marca
      label={`≠ Tradicional: ${distintas.map((m) => m.nombre).join(", ")}${
        parcial ? ` (${distintas[0].grupos} de ${grado.grupos} grupos)` : ""
      }`}
      color="orange"
      punto
    />
  )
}

/** Ver detalle de la proyección (3.10): comparación por grado con lo que viene del grado anterior. */
export function ProyeccionDetalleVista({ id }: { id: number }) {
  const navigate = coberturaInscritosRoute.useNavigate()
  const { data, isPending, isError, error, refetch } = useProyeccionDetalleQuery(id)
  const [aprobar, setAprobar] = useState(false)
  const [devolver, setDevolver] = useState(false)
  // Los grados con déficit llegan abiertos: es lo que hay que revisar.
  const [abiertos, setAbiertos] = useState<Set<string> | null>(null)
  const volver = () => navigate({ search: (prev) => ({ ...prev, terrId: undefined }) })

  if (isPending)
    return (
      <div className="grid gap-4 px-(--screen-spacing)">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  if (isError)
    return (
      <div className="grid justify-items-center gap-3 px-(--screen-spacing) py-10 text-sm">
        <p className="text-red">{getErrorMessage(error)}</p>
        <div className="flex gap-2">
          <Button variant="outline" color="neutral" onClick={volver}>
            <ArrowLeftIcon data-icon="inline-start" />
            Proyección
          </Button>
          <Button variant="outline" color="neutral" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    )

  const deficit = conDeficit(data.detalle)
  const abiertosHoy = abiertos ?? new Set(deficit.map((g) => g.codigo))
  const alternar = (codigo: string) => {
    const r = new Set(abiertosHoy)
    if (r.has(codigo)) r.delete(codigo)
    else r.add(codigo)
    setAbiertos(r)
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 px-(--screen-spacing)">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" color="neutral" size="sm" onClick={volver}>
          <ArrowLeftIcon data-icon="inline-start" />
          Proyección
        </Button>
        <span className="text-sm font-medium">
          {data.establecimiento} · {data.periodo}
        </span>
        <Marca {...ESTADO_PROYECCION_UI[data.estado]} />
        {data.metodologiaDistinta && (
          <Marca label={`≠ Tradicional: ${data.metodologiaDistinta}`} color="orange" punto />
        )}
        {deficit.length > 0 && (
          <Marca
            label={`${deficit.length} ${deficit.length === 1 ? "grado" : "grados"} con déficit`}
            color="destructive"
            punto
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" color="neutral" size="sm" onClick={() => setDevolver(true)}>
          <ArrowUUpLeftIcon data-icon="inline-start" />
          Devolver con observaciones
        </Button>
        {data.estado === "PROYECTADA" && (
          <Button size="sm" onClick={() => setAprobar(true)}>
            <CheckIcon data-icon="inline-start" />
            Aprobar
          </Button>
        )}
      </div>
      {data.observacion && (
        <Aviso tono="warning">Devuelta con la observación: {data.observacion}</Aviso>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Grado</TableHead>
              <TableHead>Grupos</TableHead>
              <TableHead>Metodología</TableHead>
              <TableHead className={wrap}>Cupo proyectado</TableHead>
              <TableHead className={wrap}>Vienen del grado anterior</TableHead>
              <TableHead>Repitentes</TableHead>
              <TableHead className={wrap}>Prematrículas Continúa</TableHead>
              <TableHead className={wrap}>Cupo libre para nuevos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.detalle.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  El establecimiento aún no tiene grupos en el período proyectado.
                </TableCell>
              </TableRow>
            ) : (
              data.detalle.flatMap((g) => {
                const abierto = abiertosHoy.has(g.codigo)
                return [
                  <TableRow key={g.codigo}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        color="muted"
                        size="icon-sm"
                        aria-expanded={abierto}
                        aria-label={`${abierto ? "Ocultar" : "Mostrar"} las sedes de ${g.grado}`}
                        onClick={() => alternar(g.codigo)}
                      >
                        {abierto ? <CaretDownIcon /> : <CaretRightIcon />}
                      </Button>
                    </TableCell>
                    <TableCell className={wrap}>{g.grado}</TableCell>
                    <TableCell className={num}>{g.grupos}</TableCell>
                    <TableCell>
                      <MarcaMetodologia grado={g} />
                    </TableCell>
                    <TableCell className={num}>{g.cupoProyectado}</TableCell>
                    <TableCell className={num}>{cifra(g.vienen)}</TableCell>
                    <TableCell className={num}>{cifra(g.repitentes)}</TableCell>
                    <TableCell className={num}>{g.prematriculasContinua}</TableCell>
                    <TableCell className={num}>
                      {g.cupoLibre != null && g.cupoLibre < 0 ? (
                        <Marca label={conSigno(g.cupoLibre)} color="destructive" punto />
                      ) : (
                        cifra(g.cupoLibre)
                      )}
                    </TableCell>
                  </TableRow>,
                  ...(abierto ? [<SedesFila key={`${g.codigo}/sedes`} grado={g} />] : []),
                ]
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AprobarProyeccionDialog
        proyeccion={aprobar ? data : null}
        onOpenChange={(o) => !o && setAprobar(false)}
      />
      <DevolverProyeccionDialog
        proyeccion={devolver ? data : null}
        onOpenChange={(o) => !o && setDevolver(false)}
      />
    </div>
  )
}

/** Desglose por sede, informativo: el déficit se mide para el establecimiento completo. */
function SedesFila({ grado }: { grado: ProyeccionGrado }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={9} className="bg-muted/20 p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-10" />
              <th className="px-3 py-3 text-left font-medium">Sede</th>
              <th className="px-3 py-3 text-left font-medium">Cupo proyectado</th>
              <th className="px-3 py-3 text-left font-medium whitespace-normal">
                Estudiantes de la sede que vienen
              </th>
              <th className="px-3 py-3 text-left font-medium">Pasan a otra sede</th>
            </tr>
          </thead>
          <tbody>
            {grado.sedes.map((s) => (
              <tr key={s.sede} className="border-b border-border last:border-0">
                <td />
                <td className="px-3 py-3">{s.sede}</td>
                <td className={cn("px-3 py-3", num)}>{s.cupoProyectado}</td>
                <td className={cn("px-3 py-3", num)}>{cifra(s.vienen)}</td>
                <td className={cn("px-3 py-3", num)}>{cifra(s.pasanOtraSede)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCell>
    </TableRow>
  )
}

/** Título de los diálogos: "IE Sur · 2027" cuando el detalle ya cargó. */
function useTitulo(proyeccion: ProyeccionEstablecimiento | null) {
  const { data } = useProyeccionDetalleQuery(proyeccion?.id)
  const nombre = proyeccion?.establecimiento ?? ""
  return { detalle: data, nombre: data?.anio ? `${nombre} · ${data.anio}` : nombre }
}

/** Aprobar (3.10): avisa los grados con déficit, sin bloquear, y habilita los grupos no tradicionales. */
export function AprobarProyeccionDialog({
  proyeccion,
  onOpenChange,
}: {
  proyeccion: ProyeccionEstablecimiento | null
  onOpenChange: (open: boolean) => void
}) {
  const aprobar = useAprobarProyeccion()
  const { detalle, nombre } = useTitulo(proyeccion)
  const deficit = detalle ? conDeficit(detalle.detalle) : []
  const nDeficit = detalle ? deficit.length : (proyeccion?.gradosConDeficit ?? 0)
  return (
    <Dialog open={proyeccion != null} onOpenChange={(o) => !aprobar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprobar la proyección — {nombre}</DialogTitle>
          <DialogDescription className="sr-only">
            Confirme la aprobación de la proyección de cupos.
          </DialogDescription>
        </DialogHeader>
        {nDeficit > 0 && (
          <Aviso tono="warning">
            Hay {nDeficit} {nDeficit === 1 ? "grado" : "grados"} con déficit
            {deficit.length ? `: ${textoDeficit(detalle!.detalle)}` : ""}.
          </Aviso>
        )}
        <Aviso tono="info">
          {proyeccion?.metodologiaDistinta
            ? `Los grupos de ${proyeccion.metodologiaDistinta} quedan habilitados para recibir matrículas. `
            : ""}
          Se avisa al establecimiento.
        </Aviso>
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={aprobar.isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            disabled={aprobar.isPending}
            onClick={() =>
              aprobar.mutate(proyeccion!.id, {
                onSuccess: () => {
                  toast.success(`Se aprobó la proyección de ${nombre}.`)
                  onOpenChange(false)
                },
              })
            }
          >
            {aprobar.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const devolverSchema = z.object({
  observacion: z
    .string()
    .trim()
    .min(10, "La observación debe tener al menos 10 caracteres.")
    .max(500, "La observación tiene máximo 500 caracteres."),
})

/** Devolver la proyección (3.10): Observación obligatoria; vuelve a Proyectada y avisa al establecimiento. */
export function DevolverProyeccionDialog({
  proyeccion,
  onOpenChange,
}: {
  proyeccion: ProyeccionEstablecimiento | null
  onOpenChange: (open: boolean) => void
}) {
  const devolver = useDevolverProyeccion()
  const { nombre } = useTitulo(proyeccion)
  const form = useAppForm({
    defaultValues: { observacion: "" },
    validators: { onSubmit: devolverSchema },
    onSubmit: ({ value }) =>
      devolver.mutateAsync(
        { id: proyeccion?.id ?? 0, observacion: value.observacion.trim() },
        {
          onSuccess: () => {
            toast.success(`Se devolvió la proyección de ${nombre}.`)
            form.reset()
            onOpenChange(false)
          },
        },
      ),
  })
  const cerrar = () => {
    if (devolver.isPending) return
    form.reset()
    onOpenChange(false)
  }
  return (
    <Dialog open={proyeccion != null} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Devolver la proyección — {nombre}</DialogTitle>
          <DialogDescription>Los campos marcados con * son obligatorios</DialogDescription>
        </DialogHeader>
        <form
          id="devolver-proyeccion-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.AppField name="observacion">
            {(f) => (
              <f.TextareaField
                label="Observación"
                required
                maxLength={500}
                rows={3}
                description="De 10 a 500 caracteres."
              />
            )}
          </form.AppField>
        </form>
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={devolver.isPending} onClick={cerrar}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="submit" form="devolver-proyeccion-form" disabled={devolver.isPending}>
            {devolver.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ArrowUUpLeftIcon data-icon="inline-start" />
            )}
            Devolver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
