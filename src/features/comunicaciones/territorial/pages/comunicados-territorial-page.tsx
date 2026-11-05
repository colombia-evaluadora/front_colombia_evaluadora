import { useState } from "react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { DotsThreeVerticalIcon } from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/api-client"
import { CLASES_HTML, htmlSeguro } from "@/features/comunicaciones/chat/lib/html-seguro"
import { resumenDestinatarios } from "@/features/comunicaciones/chat/lib/destinos-comunicado"
import {
  useComunicadoTerritorialQuery,
  useComunicadosTerritorialQuery,
  useEstablecimientosTerritorialQuery,
  type ComunicadoTerritorial,
  type EstadoTerritorial,
} from "@/features/comunicaciones/territorial/api/comunicados-territorial"

const ESTADOS: Record<EstadoTerritorial, { etiqueta: string; color: "success" | "neutral" | "destructive" }> = {
  PUBLICADO: { etiqueta: "Publicado", color: "success" },
  VENCIDO: { etiqueta: "Vencido", color: "neutral" },
  ANULADO: { etiqueta: "Anulado", color: "destructive" },
}

function Estado({ estado }: { estado: EstadoTerritorial }) {
  const { etiqueta, color } = ESTADOS[estado]
  return (
    <Badge variant="soft" color={color}>
      {etiqueta}
    </Badge>
  )
}

const dirigidoA = (c: ComunicadoTerritorial) => resumenDestinatarios(c.audiencia, c.destinos) || "—"

/**
 * Comunicados institucionales del Supervisor territorial y el Administrador territorial (Guía
 * M.1.TER.1): solo consulta. Sin "Nuevo comunicado" ni "Recibidos", con la columna y el filtro de
 * establecimiento, y el menú reducido a "Ver detalle". El alcance lo aplica comms-service.
 */
export function ComunicadosTerritorialPage() {
  const [q, setQ] = useState("")
  const [establecimiento, setEstablecimiento] = useState("")
  const [estado, setEstado] = useState("")
  const [desde, setDesde] = useState("")
  const [abierto, setAbierto] = useState<number | null>(null)
  const establecimientos = useEstablecimientosTerritorialQuery()
  const lista = useComunicadosTerritorialQuery({ q: q.trim(), establecimiento, estado, desde })
  const filas = lista.data ?? []
  const hayFiltros = !!(q || establecimiento || estado || desde)

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-semibold">Comunicados institucionales</h1>
        <p className="text-sm text-muted-foreground">Consulta de los comunicados de sus establecimientos, sin publicar.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <Field>
          <FieldLabel htmlFor="territorial-q">Buscar por título</FieldLabel>
          <Input id="territorial-q" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="territorial-est">Establecimiento</FieldLabel>
          <NativeSelect id="territorial-est" value={establecimiento} onChange={(e) => setEstablecimiento(e.target.value)}>
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {(establecimientos.data ?? []).map((o) => (
              <NativeSelectOption key={o.valor} value={o.valor}>
                {o.etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="territorial-estado">Estado</FieldLabel>
          <NativeSelect id="territorial-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <NativeSelectOption value="">Todos</NativeSelectOption>
            {(Object.keys(ESTADOS) as EstadoTerritorial[]).map((k) => (
              <NativeSelectOption key={k} value={k}>
                {ESTADOS[k].etiqueta}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="territorial-desde">Desde</FieldLabel>
          <Input id="territorial-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Field>
        <Button
          variant="ghost"
          color="neutral"
          disabled={!hayFiltros}
          onClick={() => {
            setQ("")
            setEstablecimiento("")
            setEstado("")
            setDesde("")
          }}
        >
          Limpiar
        </Button>
      </div>

      {lista.isPending ? (
        <Spinner className="m-6" />
      ) : lista.isError ? (
        <p className="text-sm text-muted-foreground">
          {getErrorMessage(lista.error)}{" "}
          <button type="button" onClick={() => void lista.refetch()} className="font-medium text-primary underline">
            Reintentar
          </button>
        </p>
      ) : filas.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No hay comunicados para mostrar.</p>
      ) : (
        <>
          {/* Móvil: tarjetas, para no desbordar con todas las columnas. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {filas.map((c) => (
              <li key={c.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-medium break-words">{c.titulo}</p>
                  <Estado estado={c.estado} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(c.publicarEn), "dd/MM/yyyy")} · {c.establecimiento}
                </p>
                <p className="text-xs break-words text-muted-foreground">
                  {c.publicadoPor} · {c.destinatarios} destinatarios
                </p>
                <Button size="sm" variant="link" className="mt-1 px-0" onClick={() => setAbierto(c.id)}>
                  Ver detalle
                </Button>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Establecimiento</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Publicado por</TableHead>
                  <TableHead>Tipos</TableHead>
                  <TableHead className="text-right">Destinatarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{format(new Date(c.publicarEn), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{c.establecimiento}</TableCell>
                    <TableCell>{c.titulo}</TableCell>
                    <TableCell>{c.publicadoPor}</TableCell>
                    <TableCell className="max-w-56 truncate" title={dirigidoA(c)}>
                      {dirigidoA(c)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.destinatarios}</TableCell>
                    <TableCell>
                      <Estado estado={c.estado} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Opciones de ${c.titulo}`}
                          className="grid size-8 place-items-center rounded-md hover:bg-muted"
                        >
                          <DotsThreeVerticalIcon className="size-4.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setAbierto(c.id)}>Ver detalle</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {abierto != null && <DetalleDialog id={abierto} onClose={() => setAbierto(null)} />}
    </div>
  )
}

function DetalleDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useComunicadoTerritorialQuery(id)
  const d = q.data
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d?.comunicado.titulo ?? "Comunicado"}</DialogTitle>
        </DialogHeader>
        {q.isPending ? (
          <Spinner className="m-6" />
        ) : q.isError || !d ? (
          <p className="text-sm text-muted-foreground">{q.isError ? getErrorMessage(q.error) : "El comunicado no existe."}</p>
        ) : (
          <div className="min-h-0 space-y-3 overflow-y-auto text-sm">
            <dl className="text-xs text-muted-foreground">
              <div>
                <dt className="inline">Establecimiento: </dt>
                <dd className="inline">{d.comunicado.establecimiento}</dd>
              </div>
              <div>
                <dt className="inline">Publicado por: </dt>
                <dd className="inline">{d.comunicado.publicadoPor}</dd>
              </div>
              <div>
                <dt className="inline">Fecha: </dt>
                <dd className="inline">{format(new Date(d.comunicado.publicarEn), "dd/MM/yyyy - hh:mm a")}</dd>
              </div>
              <div>
                <dt className="inline">Dirigido a: </dt>
                <dd className="inline">{dirigidoA(d.comunicado)}</dd>
              </div>
            </dl>
            <Estado estado={d.comunicado.estado} />
            {d.comunicado.estado === "ANULADO" ? (
              <p className="text-muted-foreground">El contenido ya no está disponible.</p>
            ) : (
              // Saneado con DOMPurify: solo etiquetas de formato, sin scripts ni on*.
              <div className={CLASES_HTML} dangerouslySetInnerHTML={{ __html: htmlSeguro(d.contenidoHtml) }} />
            )}
            {d.adjuntos.length > 0 && <p className="text-xs text-muted-foreground">Adjuntos: {d.adjuntos.join(", ")}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
