"use no memo"

import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MapPinIcon, XIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { useUbicar } from "@/features/coverage/inscripcion-reservas/api/mutations/territorial"
import { useOpcionesUbicacionQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import type {
  EnRedistribucion,
  OpcionUbicacion,
  TipoCupo,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"
import { km, num, wrap } from "@/features/coverage/inscripcion-reservas/components/table/territorial-comunes"

function ConfirmacionAcudiente({
  valor,
  onChange,
}: {
  valor: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2">
      <Switch
        checked={valor}
        onCheckedChange={onChange}
        className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
      />
      <span className="text-sm">Requiere confirmación del acudiente</span>
    </label>
  )
}

/** Cupo libre de la opción para el tipo dado. */
const cupoLibre = (o: OpcionUbicacion, t: TipoCupo) =>
  t === "OFICIAL" ? o.cupoOficialLibre : (o.cupoContratadoLibre ?? 0)

/**
 * Ubicar (3.10): elige sede y jornada con cupo, el tipo de cupo y si el acudiente
 * confirma. Con varios, todos son del mismo grado y modalidad y van a la misma
 * opción; solo se pueden elegir las que tienen cupo para todos.
 */
export function UbicarDialog({
  inscripciones,
  onOpenChange,
  onUbicado,
}: {
  inscripciones: EnRedistribucion[]
  onOpenChange: (open: boolean) => void
  onUbicado: () => void
}) {
  const primera = inscripciones[0]
  const n = inscripciones.length
  const { data: opciones = [], isPending } = useOpcionesUbicacionQuery(primera?.id)
  const ubicar = useUbicar()
  const [soloJornada, setSoloJornada] = useState(false)
  const [establecimiento, setEstablecimiento] = useState("")
  const [elegida, setElegida] = useState<number | null>(null)
  const [tipo, setTipo] = useState<TipoCupo>("OFICIAL")
  const [confirmacion, setConfirmacion] = useState(true)

  const alcanza = (o: OpcionUbicacion, t: TipoCupo) => cupoLibre(o, t) >= n
  // Solo las filas con cupo del tipo elegido para todos los marcados.
  const conCupo = (t: TipoCupo) => opciones.filter((o) => alcanza(o, t))
  const cambiarTipo = (t: TipoCupo) => {
    setTipo(t)
    if (!conCupo(t).some((o) => o.id === elegida)) setElegida(conCupo(t)[0]?.id ?? null)
  }

  // Cada apertura empieza limpia; la primera opción con cupo (la más cercana) llega marcada.
  const clave = inscripciones.map((r) => r.id).join(",")
  const [abiertaPara, setAbiertaPara] = useState("")
  if (n && abiertaPara !== clave && opciones.length) {
    setAbiertaPara(clave)
    setSoloJornada(false)
    setEstablecimiento("")
    setTipo("OFICIAL")
    setElegida(conCupo("OFICIAL")[0]?.id ?? null)
    setConfirmacion(true)
  }

  const visibles = conCupo(tipo).filter(
    (o) =>
      (!soloJornada || o.jornadaPedida) &&
      (!establecimiento || o.establecimiento === establecimiento),
  )
  const opcion = visibles.find((o) => o.id === elegida)
  // Con varios: quiénes pidieron una jornada distinta de la elegida.
  const otraJornada =
    opcion && n > 1 ? inscripciones.filter((r) => r.jornada !== opcion.jornada) : []
  const paraTodos = n > 1 ? ` para los ${n} estudiantes` : ""
  const cerrar = (o: boolean) => {
    if (ubicar.isPending) return
    if (!o) setAbiertaPara("")
    onOpenChange(o)
  }

  return (
    <Dialog open={n > 0} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {n === 1
              ? `Ubicar estudiante — ${primera.aspirante}`
              : `Ubicar estudiantes — ${n} estudiantes de ${primera?.grado} · ${primera?.modalidad}`}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Elija la sede y la jornada con cupo donde se reserva el cupo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={soloJornada} onCheckedChange={(v) => setSoloJornada(!!v)} />
            Solo la jornada pedida
          </label>
          <div className="w-64">
            <MatriculaSelectField
              id="ubicar-establecimiento"
              label="Establecimiento"
              placeholder="Todos"
              value={establecimiento}
              options={[...new Set(opciones.map((o) => o.establecimiento))]}
              onChange={setEstablecimiento}
            />
          </div>
        </div>
        {isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <RadioGroup
            value={elegida == null ? "" : String(elegida)}
            onValueChange={(v) => setElegida(Number(v))}
            className="overflow-x-auto rounded-md border border-border"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Establecimiento</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Jornada</TableHead>
                  <TableHead className={wrap}>Dentro del área de influencia</TableHead>
                  <TableHead className="text-center">Distancia (km)</TableHead>
                  <TableHead className={cn(wrap, "text-center")}>Cupo oficial libre</TableHead>
                  <TableHead className={cn(wrap, "text-center")}>Cupo contratado libre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {conCupo(tipo).length
                        ? "Ninguna sede con cupo cumple el filtro."
                        : n > 1
                          ? `Ninguna sede tiene cupo ${tipo === "OFICIAL" ? "oficial" : "contratado"} libre para los ${n} estudiantes: marque menos estudiantes.`
                          : `Ninguna sede tiene cupo ${tipo === "OFICIAL" ? "oficial" : "contratado"} libre.`}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibles.map((o) => {
                    return (
                      <TableRow
                        key={o.id}
                        data-state={o.id === elegida ? "selected" : undefined}
                        className="cursor-pointer"
                        onClick={() => setElegida(o.id)}
                      >
                        <TableCell>
                          <RadioGroupItem
                            value={String(o.id)}
                            aria-label={`${o.establecimiento}, ${o.sede}, ${o.jornada}`}
                          />
                        </TableCell>
                        <TableCell>{o.establecimiento}</TableCell>
                        <TableCell className={wrap}>{o.sede}</TableCell>
                        <TableCell>{o.jornada}</TableCell>
                        <TableCell>
                          <Badge
                            variant="soft"
                            color={o.dentroAreaInfluencia ? "success" : "neutral"}
                            className="text-xs font-medium tracking-normal"
                          >
                            {o.dentroAreaInfluencia && (
                              <span aria-hidden className="size-1.5 rounded-full bg-current" />
                            )}
                            {o.dentroAreaInfluencia ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(num, "text-center")}>
                          {km(o.distanciaKm)}
                        </TableCell>
                        <TableCell className={cn(num, "text-center")}>
                          {o.cupoOficialLibre}
                        </TableCell>
                        <TableCell className={cn(num, "text-center")}>
                          {o.cupoContratadoLibre ?? "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </RadioGroup>
        )}
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-medium">Tipo de cupo</span>
            <RadioGroup
              value={tipo}
              onValueChange={(v) => cambiarTipo(v as TipoCupo)}
              className="flex gap-4"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="OFICIAL" />
                Oficial
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="CONTRATADO" />
                Contratado
              </label>
            </RadioGroup>
            <ConfirmacionAcudiente valor={confirmacion} onChange={setConfirmacion} />
          </div>
          <p className="text-xs text-muted-foreground">
            Solo se muestran las sedes con cupo {tipo === "OFICIAL" ? "oficial" : "contratado"}{" "}
            libre
            {paraTodos}.
          </p>
        </div>
        {otraJornada.length > 0 && (
          <Aviso tono="warning">
            {otraJornada.length} de {n} estudiantes pidieron otra jornada (
            {otraJornada.map((r) => `${r.aspirante}: ${r.jornada}`).join(", ")}).
          </Aviso>
        )}
        {confirmacion && (
          <Aviso tono="info">
            {n > 1 ? "Cada acudiente tiene" : "El acudiente tiene"} 24 horas para confirmar.
          </Aviso>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={ubicar.isPending}
            onClick={() => cerrar(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            disabled={ubicar.isPending || !opcion}
            onClick={() =>
              ubicar.mutate(
                {
                  inscripciones: inscripciones.map((r) => r.id),
                  opcionId: opcion!.id,
                  tipoCupo: tipo,
                  requiereConfirmacion: confirmacion,
                },
                {
                  onSuccess: ({ ubicados, omitidos }) => {
                    // Mensajes de Ubicar por lote (Cobertura Educativa 3.10).
                    toast.success(
                      confirmacion
                        ? `Ubicación propuesta a ${ubicados} ${ubicados === 1 ? "estudiante" : "estudiantes"}. ${ubicados === 1 ? "El acudiente tiene" : "Cada acudiente tiene"} 24 horas para confirmar.`
                        : `${ubicados} ${ubicados === 1 ? "estudiante ubicado" : "estudiantes ubicados"}.`,
                    )
                    if (omitidos.length)
                      toast.warning(
                        `No se incluyó ${omitidos.length === 1 ? "la inscripción" : "las inscripciones"} ${omitidos.join(", ")}: ya no ${omitidos.length === 1 ? "estaba" : "estaban"} en redistribución.`,
                      )
                    cerrar(false)
                    onUbicado()
                  },
                },
              )
            }
          >
            {ubicar.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <MapPinIcon data-icon="inline-start" />
            )}
            Ubicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
