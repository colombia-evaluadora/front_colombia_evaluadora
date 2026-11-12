import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { ArrowsDownUpIcon, ArrowsLeftRightIcon, EyeIcon, IdentificationCardIcon, PencilIcon, UserSwitchIcon, EnvelopeIcon, ProhibitIcon, ArrowCounterClockwiseIcon, CloudSyncIcon } from "@/components/ui/icons"
import { useEffect, useState } from "react"
import { useNotify } from "@/components/notice/notice-context"
import { DialogUnificarEstudiantes } from "@/features/coverage/matricula/components/dialogs/dialog-unificar-estudiantes"
import {
  DialogAnularMatricula,
  DialogResponderSolicitudRetiro,
} from "@/features/coverage/matricula/components/dialogs/dialog-solicitud-retiro"
import { DialogReactivarMatricula } from "@/features/coverage/matricula/components/dialogs/dialog-reactivar-matricula"
import { ESTADOS_REACTIVABLES } from "@/features/coverage/matricula/api/reactivar"
import { useSnapshotPendienteQuery } from "@/features/coverage/matricula/api/query/use-snapshot-pendiente"
import { DialogHomologarSnapshot } from "@/features/coverage/matricula/components/notas-homologadas/dialog-homologar-snapshot"

import { paths } from "@/config/paths"
import { OnlineOnlyAction } from "@/components/offline/online-only-action"
import { EDUCATION_LEVEL_LABELS } from "@/features/coverage/shared/api/ui-mappings"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"
import type { AgeSituation, Matricula, MatriculaStatus } from "@/features/coverage/matricula/api/types/matricula"
import { DeleteMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-delete-matricula"
import { FilesMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-files-matricula"
import { RetirarMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-retirar-matricula"
import { ReingresarMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-reingresar-matricula"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

function formatEnrollmentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" })
}

function MatriculaGradeCell({ grade }: { grade: number }) {
  const gradeLabel = useMatriculaGradeLabel()
  return <span className="tabular-nums">{gradeLabel(grade)}</span>
}

const NOT_EDITABLE_STATUSES: MatriculaStatus[] = ["Reubicado", "Promovido"]

type BadgeColor = "info" | "muted" | "success" | "destructive" | "orange" | "warning"

// Colores del prototipo C.1.LIS; un estado nuevo cae en gris.
const STATUS_COLORS: Partial<Record<string, BadgeColor>> = {
  Cursando: "info",
  Promovido: "info",
  Retirado: "muted",
  Aprobado: "success",
  Reprobado: "destructive",
  Reubicado: "orange",
}

const STATUS_DOT: Record<BadgeColor, string> = {
  info: "bg-blue",
  muted: "bg-muted-foreground",
  success: "bg-green",
  destructive: "bg-red",
  orange: "bg-orange",
  warning: "bg-yellow",
}

function MatriculaStatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "muted"
  return (
    <Badge variant="outline" color={color} className="rounded-full bg-background text-xs font-medium tracking-normal">
      <span aria-hidden className={`size-1.5 rounded-full ${STATUS_DOT[color]}`} />
      {status}
    </Badge>
  )
}

/** Columnas que el prototipo deja fuera de la vista inicial; siguen en el menú de columnas. */
export const MATRICULA_INITIAL_VISIBILITY = {
  firstName: false,
  lastName: false,
  institution: false,
  campus: false,
  shift: false,
  educationLevel: false,
  grade: false,
  enrollmentDate: false,
  guardian: false,
}

export const MATRICULA_EXPORT_COLUMN_KEYS: Partial<Record<string, string | string[]>> = {
  documentNumber: "document_number",
  student: ["first_name", "last_name"],
  firstName: "first_name",
  lastName: "last_name",
  institution: "institution",
  campus: "campus",
  shift: "shift",
  educationLevel: "education_level",
  grade: "grade",
  group: "grupo",
  enrollmentDate: "enrollment_date",
  guardian: "guardian",
  status: "status",
  ageSituation: "age_situation",
}

const AGE_SITUATION_LABELS: Record<AgeSituation, string> = {
  EN_EDAD: "En edad",
  PREEXTRAEDAD: "Preextraedad",
  EXTRAEDAD: "Extraedad",
  BAJA_EDAD: "Baja edad",
  SIN_CALCULAR: "Sin calcular",
}

export const columnsMatricula: ColumnDef<Matricula>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Seleccionar página"
        className="translate-y-0.5"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Seleccionar ${row.original.firstName} ${row.original.lastName}`}
        className="translate-y-0.5"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    id: "documentNumber",
    accessorKey: "documentNumber",
    meta: { label: "Documento" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.documentNumber}</span>,
  },
  {
    id: "student",
    // Ordena por nombres: el backend no tiene un orden por nombre completo.
    accessorKey: "firstName",
    meta: { label: "Estudiante" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
    cell: ({ row }) => (
      <span className="font-medium">{`${row.original.firstName} ${row.original.lastName}`}</span>
    ),
    enableHiding: false,
  },
  {
    id: "firstName",
    accessorKey: "firstName",
    meta: { label: "Nombres" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombres" />,
    cell: ({ row }) => <span className="font-medium">{row.original.firstName}</span>,
  },
  {
    id: "lastName",
    accessorKey: "lastName",
    meta: { label: "Apellidos" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Apellidos" />,
    cell: ({ row }) => <span className="font-medium">{row.original.lastName}</span>,
  },
  {
    id: "institution",
    accessorKey: "institution",
    meta: { label: "Institución" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Institución" />,
    cell: ({ row }) => <span className="max-w-xs truncate">{row.original.institution}</span>,
  },
  {
    id: "campus",
    accessorKey: "campus",
    meta: { label: "Sede" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sede" />,
    cell: ({ row }) => <span>{row.original.campus}</span>,
  },
  {
    id: "shift",
    accessorKey: "shift",
    meta: { label: "Jornada" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    // Ya viene como nombre legible del catálogo de `TLISTA_VALOR` — no es el
    // `Shift` fijo de reservas, no necesita mapeo de labels.
    cell: ({ row }) => <span>{row.original.shift}</span>,
  },
  {
    id: "educationLevel",
    accessorKey: "educationLevel",
    meta: { label: "Nivel educativo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel educativo" />,
    cell: ({ row }) => <span>{EDUCATION_LEVEL_LABELS[row.original.educationLevel]}</span>,
  },
  {
    id: "grade",
    accessorKey: "grade",
    meta: { label: "Grado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grado" />,
    cell: ({ row }) => <MatriculaGradeCell grade={row.original.grade} />,
  },
  {
    id: "group",
    accessorKey: "group",
    meta: { label: "Grupo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
    cell: ({ row }) => <span>{row.original.group}</span>,
  },
  {
    id: "enrollmentDate",
    accessorKey: "enrollmentDate",
    meta: { label: "Fecha de matrícula" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de matrícula" />,
    cell: ({ row }) => (
      <span className="tabular-nums">{formatEnrollmentDate(row.original.enrollmentDate)}</span>
    ),
  },
  {
    id: "guardian",
    accessorKey: "guardian",
    meta: { label: "Acudiente" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Acudiente" />,
    cell: ({ row }) => <span className="max-w-xs truncate">{row.original.guardian}</span>,
  },
  {
    id: "status",
    accessorKey: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => (
      <span className="inline-flex flex-wrap items-center gap-1">
        <MatriculaStatusBadge status={row.original.status} />
        {row.original.retiroSolicitado ? (
          <Badge variant="soft" color="warning" className="rounded-full text-xs font-medium tracking-normal">
            Retiro solicitado
          </Badge>
        ) : row.original.anulacionPendiente ? (
          <Badge variant="soft" color="destructive" className="rounded-full text-xs font-medium tracking-normal">
            Anulación pendiente
          </Badge>
        ) : null}
      </span>
    ),
  },
  {
    id: "ageSituation",
    accessorKey: "ageSituation",
    meta: { label: "Edad" },
    // El backend la calcula por fila; no tiene orden propio.
    header: () => <span>Edad</span>,
    cell: ({ row }) => (
      <Badge variant="soft" color="muted" className="rounded-full text-xs font-medium tracking-normal">
        {AGE_SITUATION_LABELS[row.original.ageSituation ?? "SIN_CALCULAR"]}
      </Badge>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <ActionsCell matricula={row.original} />,
    enableSorting: false,
    enableHiding: false,
    size: 320,
  },
]

/**
 * Ver documentos es de solo lectura acá: va con Acceso. Sin conexión (P6:
 * lista de solo consulta) "Ver" queda activo y lleva al aviso estándar de
 * vista solo en línea; editar, documentos, retirar, reingresar y eliminar se
 * deshabilitan.
 */
function ActionsCell({ matricula }: { matricula: Matricula }) {
  const { puedeEditar, puedeEliminar } = useMenuPermission("MATRICULA")
  const row = { original: matricula }

  return (
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                aria-label={`Ver ${row.original.firstName} ${row.original.lastName}`}
                render={<Link to={paths.app.coberturaMatriculaDetalle.getHref(row.original.id)} search={(prev) => ({ ...prev, accion: undefined })} />}
                nativeButton={false}
              />
            }
          >
            <EyeIcon />
          </TooltipTrigger>
          <TooltipContent>{`Ver ${row.original.firstName} ${row.original.lastName}`}</TooltipContent>
        </Tooltip>
        {puedeEditar && !NOT_EDITABLE_STATUSES.includes(row.original.status) && (
          <OnlineOnlyAction>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Editar ${row.original.firstName} ${row.original.lastName}`}
                  render={<Link to={paths.app.coberturaMatriculaEditar.getHref(row.original.id)} search={(prev) => ({ ...prev, accion: undefined })} />}
                  nativeButton={false}
                />
              }
            >
              <PencilIcon />
            </TooltipTrigger>
            <TooltipContent>{`Editar ${row.original.firstName} ${row.original.lastName}`}</TooltipContent>
          </Tooltip>
          </OnlineOnlyAction>
        )}
        <OnlineOnlyAction>
          <FilesMatriculaDialog matricula={row.original} />
        </OnlineOnlyAction>
        {/* El estado se repite acá (el diálogo también lo filtra) para no dejar
            sin red un envoltorio vacío con tooltip. */}
        {/* Con solicitud pendiente, Retirar libre no se ofrece: va Responder o Anular (Sección 2.2). */}
        <SolicitudRetiroAccion matricula={row.original} />
        <ReactivarAccion matricula={row.original} />
        <HomologarSnapshotAccion matricula={row.original} />
        {puedeEditar && row.original.status === "Cursando" && !row.original.retiroSolicitado && !row.original.anulacionPendiente ? (
          <OnlineOnlyAction>
            <RetirarMatriculaDialog matricula={row.original} />
          </OnlineOnlyAction>
        ) : null}
        {puedeEditar && row.original.status === "Retirado" ? (
          <OnlineOnlyAction>
            <ReingresarMatriculaDialog matricula={row.original} />
          </OnlineOnlyAction>
        ) : null}
        {puedeEliminar ? (
          <OnlineOnlyAction>
            <DeleteMatriculaDialog matricula={row.original} />
          </OnlineOnlyAction>
        ) : null}
        <AccionesEditar matricula={row.original} />
        <UnificarAccion matricula={row.original} />
      </div>
  )
}

type AccionEditar = "cambiar-grupo" | "cambiar-grado" | "corregir-identidad"

const ACCIONES_EDITAR: { accion: AccionEditar; label: string; Icon: typeof EyeIcon }[] = [
  { accion: "cambiar-grupo", label: "Cambiar de grupo", Icon: ArrowsLeftRightIcon },
  { accion: "cambiar-grado", label: "Cambiar de grado", Icon: ArrowsDownUpIcon },
  { accion: "corregir-identidad", label: "Corregir datos de identidad", Icon: IdentificationCardIcon },
]

/**
 * Acciones de la tabla de acciones (C.1.LIS) que se resuelven en Editar: cada
 * ícono abre la edición con `accion`, que enfoca el campo o abre el modal.
 */
function AccionesEditar({ matricula }: { matricula: Matricula }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  if (!puedeEditar || matricula.status !== "Cursando") return null
  // Con retiro solicitado (Regla 71) no se cambia de grupo ni de grado; corregir identidad sí.
  const acciones = matricula.retiroSolicitado || matricula.anulacionPendiente
    ? ACCIONES_EDITAR.filter((a) => a.accion === "corregir-identidad")
    : ACCIONES_EDITAR
  const nombre = `${matricula.firstName} ${matricula.lastName}`
  return (
    <>
      {acciones.map(({ accion, label, Icon }) => (
        <OnlineOnlyAction key={accion}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`${label} de ${nombre}`}
                  render={
                    <Link
                      to={paths.app.coberturaMatriculaEditar.getHref(matricula.id)}
                      search={(prev) => ({ ...prev, accion })}
                    />
                  }
                  nativeButton={false}
                />
              }
            >
              <Icon />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        </OnlineOnlyAction>
      ))}
    </>
  )
}

/**
 * Unificar estudiantes (Regla 72): en un estudiante con matrícula principal
 * vigente. Lo hacen el Administrador y el Gestor administrativo; el back
 * restringe el rol y pide el Administrador territorial entre establecimientos.
 */
function UnificarAccion({ matricula }: { matricula: Matricula }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  const { notify } = useNotify()
  const [abierto, setAbierto] = useState(false)
  if (!puedeEditar || matricula.status !== "Cursando") return null
  const nombre = `${matricula.firstName} ${matricula.lastName}`
  return (
    <OnlineOnlyAction>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`Unificar estudiantes: ${nombre}`}
              onClick={() => setAbierto(true)}
            />
          }
        >
          <UserSwitchIcon />
        </TooltipTrigger>
        <TooltipContent>Unificar estudiantes</TooltipContent>
      </Tooltip>
      {abierto ? (
        <DialogUnificarEstudiantes
          open
          onOpenChange={setAbierto}
          documentoInicial={matricula.documentNumber}
          onUnified={(mensaje) => {
            setAbierto(false)
            notify(mensaje, { variant: "success" })
          }}
        />
      ) : null}
    </OnlineOnlyAction>
  )
}

/**
 * Solicitud de retiro (Sección 2.2, Regla 71): en el origen, Responder solicitud
 * de retiro; en el destino tras «Cerrar sin retiro», Anular matrícula. Las dos
 * reemplazan a Retirar en la fila.
 */
function SolicitudRetiroAccion({ matricula }: { matricula: Matricula }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  const { notify } = useNotify()
  const [abierto, setAbierto] = useState(false)
  if (!puedeEditar || matricula.status !== "Cursando") return null
  if (!matricula.retiroSolicitado && !matricula.anulacionPendiente) return null
  const origen = Boolean(matricula.retiroSolicitado)
  const label = origen ? "Responder solicitud de retiro" : "Anular matrícula"
  const Dialogo = origen ? DialogResponderSolicitudRetiro : DialogAnularMatricula
  return (
    <OnlineOnlyAction>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              color={origen ? "neutral" : "destructive"}
              size="icon-sm"
              aria-label={`${label}: ${matricula.firstName} ${matricula.lastName}`}
              onClick={() => setAbierto(true)}
            />
          }
        >
          {origen ? <EnvelopeIcon /> : <ProhibitIcon />}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      {abierto ? (
        <Dialogo
          matricula={matricula}
          onOpenChange={setAbierto}
          onDone={(mensaje) => {
            setAbierto(false)
            notify(mensaje, { variant: "success" })
          }}
        />
      ) : null}
    </OnlineOnlyAction>
  )
}

/**
 * Reactivar (Sección 4.4, Regla 15): solo en Promovido, Reubicado, Aprobado o
 * Reprobado. El período abierto y los demás bloqueos los dice el modal.
 */
function ReactivarAccion({ matricula }: { matricula: Matricula }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  const { notify } = useNotify()
  const [abierto, setAbierto] = useState(false)
  if (!puedeEditar || !ESTADOS_REACTIVABLES.includes(matricula.status)) return null
  return (
    <OnlineOnlyAction>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`Reactivar la matrícula de ${matricula.firstName} ${matricula.lastName}`}
              onClick={() => setAbierto(true)}
            />
          }
        >
          <ArrowCounterClockwiseIcon />
        </TooltipTrigger>
        <TooltipContent>Reactivar</TooltipContent>
      </Tooltip>
      {abierto ? (
        <DialogReactivarMatricula
          matricula={matricula}
          onOpenChange={setAbierto}
          onDone={(mensaje) => {
            setAbierto(false)
            notify(mensaje, { variant: "success" })
          }}
        />
      ) : null}
    </OnlineOnlyAction>
  )
}

/**
 * Homologar desde snapshot (Sección 4.5): traslado guardado con «No homologar
 * por ahora». Lo hacen Administrador, Gestor administrativo y Supervisor de sede.
 */
function HomologarSnapshotAccion({ matricula }: { matricula: Matricula }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  const [abierto, setAbierto] = useState(false)
  if (!puedeEditar || matricula.status !== "Cursando" || !matricula.snapshotPendiente) return null
  return (
    <OnlineOnlyAction>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`Homologar desde snapshot: ${matricula.firstName} ${matricula.lastName}`}
              onClick={() => setAbierto(true)}
            />
          }
        >
          <CloudSyncIcon />
        </TooltipTrigger>
        <TooltipContent>Homologar desde snapshot</TooltipContent>
      </Tooltip>
      {abierto ? <HomologarSnapshotDialogo matricula={matricula} onClose={() => setAbierto(false)} /> : null}
    </OnlineOnlyAction>
  )
}

function HomologarSnapshotDialogo({ matricula, onClose }: { matricula: Matricula; onClose: () => void }) {
  const { notify } = useNotify()
  const gradeLabel = useMatriculaGradeLabel()
  const { data: snapshot, isError } = useSnapshotPendienteQuery(matricula.id)
  useEffect(() => {
    if (!isError) return
    notify("No se pudo cargar el snapshot del traslado.", { variant: "error" })
    onClose()
  }, [isError, notify, onClose])
  if (!snapshot) return null
  const estudiante = `${matricula.firstName} ${matricula.lastName} (${[
    gradeLabel(matricula.grade),
    matricula.group,
    matricula.institution,
    matricula.shift,
  ]
    .filter(Boolean)
    .join(" · ")})`
  return (
    <DialogHomologarSnapshot
      matriculaId={matricula.id}
      snapshot={snapshot}
      estudiante={estudiante}
      onOpenChange={(open) => !open && onClose()}
      onHomologated={({ notasHomologadas, pendientes }) => {
        onClose()
        notify(
          `Se homologaron ${notasHomologadas} notas del traslado` +
            (pendientes > 0 ? `; ${pendientes} quedan pendientes por nivelación.` : "."),
          { variant: "success" },
        )
      }}
    />
  )
}

