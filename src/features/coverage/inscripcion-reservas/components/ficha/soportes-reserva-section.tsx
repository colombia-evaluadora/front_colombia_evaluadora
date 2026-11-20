import { useRef, useState, type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CheckIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  PaperclipIcon,
  PlusIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  formatearFecha,
  formatearTamano,
  SOPORTE_ACCEPT,
  validarArchivoSoporte,
  type Soporte,
  type TipoSoporte,
} from "@/features/coverage/matricula/api/soportes"
import { MatriculaFormSection } from "@/features/coverage/matricula/components/forms/form-create-matricula/fields"
import {
  armarFilas,
  DialogReemplazarSoporte,
  DialogRevisarSoporte,
  DialogVerSoporte,
  RevisionBadge,
  type FilaSoporte,
} from "@/features/coverage/matricula/components/forms/form-create-matricula/soportes-section"

import type { SoportePendiente } from "@/features/coverage/inscripcion-reservas/api/mutations/asignar-grupo-reserva"

interface SoportesReservaSectionProps {
  /** Los de la matrícula fuente: se copian con su revisión al asignar grupo (la hoja firmada no). */
  soportes: Soporte[]
  pendientes: SoportePendiente[]
  onPendientes: (pendientes: SoportePendiente[]) => void
  editable: boolean
  /** Error de un archivo rechazado (tipo o tamaño). */
  onRechazo: (mensaje: string) => void
}

type Modal = { tipo: "ver" | "reemplazar" | "revisar"; fila: FilaSoporte } | null

/**
 * Bloque 14 antes de que exista la matrícula: los soportes de la matrícula anterior con su revisión.
 * Ver archivo, Reemplazar y Revisar soporte usan los modales de matrícula, pero no tocan la matrícula
 * anterior: el cambio queda pendiente y se aplica a la nueva al asignar grupo (como los que se agregan).
 */
export function SoportesReservaSection({
  soportes,
  pendientes,
  onPendientes,
  editable,
  onRechazo,
}: SoportesReservaSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const destino = useRef<TipoSoporte | null>(null)
  const [modal, setModal] = useState<Modal>(null)

  // La hoja firmada es de cada matrícula: la de la anterior no pasa a la nueva.
  const filas = armarFilas(soportes.filter((s) => s.tipo !== "HOJA_FIRMADA"))
  const cambioDe = (s: Soporte | null) =>
    s?.archivoId != null ? pendientes.find((p) => p.archivoBase === s.archivoId) : undefined
  const nuevoDe = (tipo: TipoSoporte) => pendientes.find((p) => p.tipo === tipo && p.archivoBase == null)
  const otrosNuevos = pendientes.filter((p) => p.tipo === "OTRO" && p.archivoBase == null)
  const totalOtros = filas.filter((f) => f.tipo === "OTRO").length + otrosNuevos.length

  function elegir(tipo: TipoSoporte) {
    destino.current = tipo
    inputRef.current?.click()
  }

  function onArchivo(archivo: File | undefined) {
    const tipo = destino.current
    if (inputRef.current) inputRef.current.value = ""
    if (!archivo || !tipo) return
    const error = validarArchivoSoporte(archivo)
    if (error) return onRechazo(error)
    onPendientes([
      ...pendientes,
      { key: crypto.randomUUID(), tipo, archivo, archivoBase: null, revision: null },
    ])
  }

  /** Un solo cambio por soporte copiado: reemplazar descarta la revisión pendiente y viceversa. */
  function cambiar(fila: FilaSoporte, cambio: Pick<SoportePendiente, "archivo" | "revision">) {
    const base = fila.soporte?.archivoId ?? null
    onPendientes([
      ...pendientes.filter((p) => p.archivoBase !== base),
      { key: crypto.randomUUID(), tipo: fila.tipo, archivoBase: base, ...cambio },
    ])
  }

  const quitar = (key: string) => onPendientes(pendientes.filter((p) => p.key !== key))

  return (
    <MatriculaFormSection title="Archivo de soporte" columns={2}>
      <div className="flex flex-col gap-3 md:col-span-2">
        <input
          ref={inputRef}
          type="file"
          accept={SOPORTE_ACCEPT}
          className="hidden"
          onChange={(e) => onArchivo(e.target.files?.[0])}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Soporte</TableHead>
              <TableHead>Archivo</TableHead>
              <TableHead>Revisión</TableHead>
              <TableHead>Revisado por y fecha</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((fila) => {
              const s = fila.soporte
              const cargado = s?.archivoId != null
              const cambio = cambioDe(s)
              const nuevo = !cargado && fila.tipo !== "OTRO" ? nuevoDe(fila.tipo) : undefined
              const etiqueta = fila.sub ? `${fila.etiqueta}, ${fila.sub}` : fila.etiqueta
              return (
                <TableRow key={fila.key}>
                  <TableCell>
                    <span className="block">{fila.etiqueta}</span>
                    {fila.sub ? (
                      <span className="block text-xs text-muted-foreground">
                        {fila.sub.replace(/de \d+$/, `de ${totalOtros}`)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {cambio?.archivo ? (
                      <ArchivoPendiente archivo={cambio.archivo} nota="Reemplaza al asignar" />
                    ) : cargado ? (
                      <span className="text-sm">
                        {s.archivoNombre} · {formatearTamano(s.archivoTamano)}
                      </span>
                    ) : nuevo?.archivo ? (
                      <ArchivoPendiente archivo={nuevo.archivo} nota="Se sube al asignar" />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        color="neutral"
                        size="sm"
                        disabled={!editable}
                        onClick={() => elegir(fila.tipo)}
                      >
                        <PaperclipIcon data-icon="inline-start" />
                        Adjuntar archivo
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <RevisionBadge
                      revision={cambio?.revision?.resultado ?? (cambio?.archivo ? "SIN_REVISAR" : (s?.revision ?? "SIN_REVISAR"))}
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {cambio?.revision
                      ? "Se guarda al asignar"
                      : !cambio?.archivo && s?.revisadoPor
                        ? `${s.revisadoPor} · ${formatearFecha(s.revisadoAt)}`
                        : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {cargado || nuevo ? (
                    <MenuSoporte etiqueta={etiqueta}>
                      {cargado ? (
                        <DropdownMenuItem onClick={() => setModal({ tipo: "ver", fila })}>
                          <EyeIcon /> Ver archivo
                        </DropdownMenuItem>
                      ) : null}
                      {cargado && editable ? (
                        <>
                          <DropdownMenuItem onClick={() => setModal({ tipo: "reemplazar", fila })}>
                            <UploadSimpleIcon /> Reemplazar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={Boolean(cambio?.archivo)}
                            onClick={() => setModal({ tipo: "revisar", fila })}
                          >
                            <CheckIcon /> Revisar soporte
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      {cambio && editable ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => quitar(cambio.key)}>
                            <XIcon /> Deshacer {cambio.archivo ? "reemplazo" : "revisión"}
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      {nuevo && editable ? (
                        <DropdownMenuItem variant="destructive" onClick={() => quitar(nuevo.key)}>
                          <TrashIcon /> Quitar
                        </DropdownMenuItem>
                      ) : null}
                    </MenuSoporte>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
            {otrosNuevos.map((p, i) => (
              <TableRow key={p.key}>
                <TableCell>
                  <span className="block">Otros documentos relevantes</span>
                  <span className="block text-xs text-muted-foreground">
                    Documento {totalOtros - otrosNuevos.length + i + 1} de {totalOtros}
                  </span>
                </TableCell>
                <TableCell>{p.archivo ? <ArchivoPendiente archivo={p.archivo} nota="Se sube al asignar" /> : null}</TableCell>
                <TableCell>
                  <RevisionBadge revision="SIN_REVISAR" />
                </TableCell>
                <TableCell className="text-sm">—</TableCell>
                <TableCell className="text-right">
                  {editable ? (
                    <MenuSoporte etiqueta={`Otros documentos relevantes, ${p.archivo?.name ?? ""}`}>
                      <DropdownMenuItem variant="destructive" onClick={() => quitar(p.key)}>
                        <TrashIcon /> Quitar
                      </DropdownMenuItem>
                    </MenuSoporte>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {editable ? (
          <div>
            <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => elegir("OTRO")}>
              <PlusIcon data-icon="inline-start" />
              Agregar documento
            </Button>
          </div>
        ) : null}
      </div>

      {modal?.tipo === "ver" ? <DialogVerSoporte fila={modal.fila} onClose={() => setModal(null)} /> : null}
      {modal?.tipo === "reemplazar" ? (
        <DialogReemplazarSoporte
          matriculaId=""
          fila={modal.fila}
          onClose={() => setModal(null)}
          onGuardar={(archivo) => cambiar(modal.fila, { archivo, revision: null })}
        />
      ) : null}
      {modal?.tipo === "revisar" ? (
        <DialogRevisarSoporte
          matriculaId=""
          fila={conRevisionPendiente(modal.fila, cambioDe(modal.fila.soporte))}
          onClose={() => setModal(null)}
          onGuardar={(revision) => cambiar(modal.fila, { archivo: null, revision })}
        />
      ) : null}
    </MatriculaFormSection>
  )
}

/** Al reabrir Revisar, el modal arranca con la revisión pendiente y no con la de la matrícula anterior. */
function conRevisionPendiente(fila: FilaSoporte, cambio: SoportePendiente | undefined): FilaSoporte {
  if (!cambio?.revision || !fila.soporte) return fila
  return {
    ...fila,
    soporte: { ...fila.soporte, revision: cambio.revision.resultado, observacion: cambio.revision.observacion },
  }
}

function ArchivoPendiente({ archivo, nota }: { archivo: File; nota: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      {archivo.name} · {formatearTamano(archivo.size)}
      <Badge variant="soft" color="info" className="rounded-full text-xs font-medium tracking-normal">
        {nota}
      </Badge>
    </span>
  )
}

function MenuSoporte({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de ${etiqueta}`} />
        }
      >
        <DotsThreeVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
