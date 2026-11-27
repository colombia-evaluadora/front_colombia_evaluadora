import { useNavigate } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { ArrowsDownUpIcon, ArrowsLeftRightIcon, EyeIcon, IdentificationCardIcon, PencilIcon, UserSwitchIcon, EnvelopeIcon, ProhibitIcon, ArrowCounterClockwiseIcon, CloudSyncIcon, ShieldCheckIcon, StackIcon, FilePdfIcon, ClipboardCheckIcon } from "@/components/ui/icons"
import { downloadReport } from "@/lib/report-client"
import { DialogMarcarSimpade } from "@/features/coverage/matricula/components/dialogs/dialog-marcar-simpade"
import { useEffect, useState } from "react"
import { useNotify } from "@/components/notice/notice-context"
import { DialogUnificarEstudiantes } from "@/features/coverage/matricula/components/dialogs/dialog-unificar-estudiantes"
import {
  DialogAccionBloqueada,
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
import type { AgeSituation, Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { AccionesDocumentos } from "@/features/coverage/matricula/components/dialogs/acciones/documentos"
import { AccionesFila, BotonAccion } from "@/features/coverage/matricula/components/dialogs/acciones/boton-accion"
import { BadgeComplementaria } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"
import { DialogRegistrarAutorizacion } from "@/features/coverage/matricula/components/dialogs/dialog-registrar-autorizacion"
import { DialogAgregarComplementaria } from "@/features/coverage/matricula/components/dialogs/dialog-agregar-complementaria"
import { DialogCambiarEspecialidad } from "@/features/coverage/matricula-complementaria/components/dialogs-postulacion"
import { DialogCambiarGrupo } from "@/features/coverage/matricula/components/dialogs/acciones/dialog-cambiar-grupo"
import { useMatriculaCapacidades } from "@/features/coverage/matricula/api/query/use-matricula-capacidades"
import { DialogCambiarGrado } from "@/features/coverage/matricula/components/dialogs/acciones/dialog-cambiar-grado"
import { RetirarMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-retirar-matricula"
import { ReingresarMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-reingresar-matricula"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

// El back manda medianoche UTC («2026-09-16T00:00:00.000Z»): con `new Date` en hora de Bogotá salía el día anterior.
function formatFecha(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : ""
}

function MatriculaGradeCell({ grade }: { grade: number }) {
  const gradeLabel = useMatriculaGradeLabel()
  return <span className="tabular-nums">{gradeLabel(grade)}</span>
}

// Editar solo con la matrícula Cursando (tabla de acciones de la lista).

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

export function MatriculaStatusBadge({ status }: { status: string }) {
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
  institution: false,
  campus: false,
  shift: false,
  educationLevel: false,
  grade: false,
  enrollmentDate: false,
  guardian: false,
  metodologiaGrupo: false,
  nuevo: false,
  tipoMatricula: false,
  birthDate: false,
  address: false,
  phone: false,
  guardianDetail: false,
  guardianEmail: false,
  asignaturas: false,
  soportes: false,
}

export const MATRICULA_EXPORT_COLUMN_KEYS: Partial<Record<string, string | string[]>> = {
  documentNumber: "document_number",
  student: ["first_name", "last_name"],
  metodologiaGrupo: "metodologia_grupo",
  nuevo: "nuevo",
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

export const AGE_SITUATION_LABELS: Record<AgeSituation, string> = {
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
      <div className="grid justify-items-start gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{`${row.original.firstName} ${row.original.lastName}`}</span>
          <MarcaComplementaria matricula={row.original} />
        </div>
        {/* Regla 81: sin la autorización de datos del acudiente, la marca va debajo del nombre. */}
        {row.original.sinAutorizacion ? (
          <Badge variant="soft" color="warning" className="rounded-full text-xs font-medium tracking-normal">
            Sin autorización
          </Badge>
        ) : null}
      </div>
    ),
    enableHiding: false,
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
      <span className="tabular-nums">{formatFecha(row.original.enrollmentDate)}</span>
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
    id: "tipoMatricula",
    accessorFn: (m) => (m.tipo === "COMPLEMENTARIA" ? "Complementaria" : "Principal"),
    meta: { label: "Tipo de matrícula" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de matrícula" />,
  },
  {
    id: "birthDate",
    accessorKey: "birthDate",
    meta: { label: "Fecha de nacimiento" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de nacimiento" />,
    cell: ({ row }) => <span className="tabular-nums">{formatFecha(row.original.birthDate)}</span>,
  },
  {
    id: "address",
    accessorKey: "address",
    meta: { label: "Dirección" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dirección" />,
  },
  {
    id: "phone",
    accessorKey: "phone",
    meta: { label: "Teléfono" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
  },
  {
    id: "guardianDetail",
    accessorFn: (m) => [m.guardianRelationship, m.guardian].filter(Boolean).join(" · "),
    meta: { label: "Acudiente (parentesco y nombre)" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Acudiente (parentesco y nombre)" />,
  },
  {
    id: "guardianEmail",
    accessorKey: "guardianEmail",
    meta: { label: "Email acudiente" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email acudiente" />,
  },
  {
    id: "asignaturas",
    accessorKey: "asignaturas",
    meta: { label: "Asignaturas matriculadas" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Asignaturas matriculadas" />,
  },
  {
    id: "soportes",
    accessorKey: "soportes",
    meta: { label: "Soportes cargados" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Soportes cargados" />,
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
    id: "metodologiaGrupo",
    accessorKey: "metodologiaGrupo",
    meta: { label: "Metodología del grupo" },
    header: () => <span>Metodología del grupo</span>,
    cell: ({ row }) => row.original.metodologiaGrupo || "—",
    enableSorting: false,
  },
  {
    id: "nuevo",
    accessorKey: "nuevo",
    // Sin matrícula el año anterior en la entidad territorial.
    meta: { label: "Nuevo" },
    header: () => <span>Nuevo</span>,
    cell: ({ row }) => (row.original.nuevo ? "Sí" : "No"),
    enableSorting: false,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <ActionsCell matricula={row.original} />,
    enableSorting: false,
    enableHiding: false,
    // Solo el ⁞: todas las acciones van al menú.
    size: 48,
  },
]

/** Acciones de la fila que el menú ⁞ del prototipo no ofrece (siguen en el detalle). */
const FUERA_DEL_MENU = ["Generar paquete de soporte"]

/**
 * Menú ⁞ de la fila (C.1.LIS.3/3a-3d, SOL.4a/8a): todas las acciones van al
 * menú, en el orden del prototipo. Sin conexión (P6) «Ver detalle» queda activo
 * y las demás salen inactivas con el aviso estándar.
 */
function ActionsCell({ matricula }: { matricula: Matricula }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  // Retirar y reingresar: Administrador, Gestor o Supervisor de sede (Sección 4.1).
  // Editar: Administrador o Gestor (V177, mismo gate que reactivar).
  const { operar, reactivar } = useMatriculaCapacidades()
  const navigate = useNavigate()
  const nombre = `${matricula.firstName} ${matricula.lastName}`
  const retiroTraslado = matricula.status === "Retirado" && Boolean(matricula.retiroTraslado)
  // Con solicitud pendiente, Responder o Anular encabeza y Ver detalle cierra (SOL.4a/8a).
  const conSolicitud = matricula.status === "Cursando" && Boolean(matricula.retiroSolicitado || matricula.anulacionPendiente)
  const verDetalle = (
    <BotonAccion
      modo="icon"
      label="Ver detalle"
      ariaLabel={`Ver detalle de ${nombre}`}
      Icon={EyeIcon}
      onClick={() =>
        void navigate({ to: paths.app.coberturaMatriculaDetalle.getHref(matricula.id), search: (prev) => ({ ...prev, accion: undefined }) })
      }
    />
  )

  // Retirada por traslado (C.1.LIS.3b): solo Ver detalle, Reingresar, Generar acta y Marcar SIMPADE.
  if (retiroTraslado)
    return (
      <AccionesFila limite={0}>
        {verDetalle}
        {puedeEditar && operar ? (
          <OnlineOnlyAction>
            <ReingresarMatriculaDialog matricula={matricula} />
          </OnlineOnlyAction>
        ) : null}
        <RetiroTrasladoAcciones matricula={matricula} />
      </AccionesFila>
    )

  return (
    <AccionesFila limite={0} ocultar={FUERA_DEL_MENU}>
      <SolicitudRetiroAccion matricula={matricula} />
      {conSolicitud ? null : verDetalle}
      {puedeEditar && reactivar && matricula.status === "Cursando" && (
        <OnlineOnlyAction>
          <BotonAccion
            modo="icon"
            label="Editar"
            ariaLabel={`Editar ${nombre}`}
            Icon={PencilIcon}
            onClick={() =>
              void navigate({ to: paths.app.coberturaMatriculaEditar.getHref(matricula.id), search: (prev) => ({ ...prev, accion: undefined }) })
            }
          />
        </OnlineOnlyAction>
      )}
      <RegistrarAutorizacionAccion matricula={matricula} />
      {puedeEditar && operar && matricula.status === "Cursando" && !matricula.retiroSolicitado && !matricula.anulacionPendiente ? (
        <OnlineOnlyAction>
          <RetirarMatriculaDialog matricula={matricula} />
        </OnlineOnlyAction>
      ) : null}
      {puedeEditar && operar && matricula.status === "Retirado" ? (
        <OnlineOnlyAction>
          <ReingresarMatriculaDialog matricula={matricula} />
        </OnlineOnlyAction>
      ) : null}
      <ReactivarAccion matricula={matricula} />
      <AccionesEditar matricula={matricula} parte="cambios" />
      <AgregarComplementariaAccion matricula={matricula} />
      <AccionesEditar matricula={matricula} parte="identidad" />
      <UnificarAccion matricula={matricula} />
      <HomologarSnapshotAccion matricula={matricula} />
      <AccionesDocumentos matricula={matricula} />
      <CambiarEspecialidadAccion matricula={matricula} />
      {conSolicitud ? verDetalle : null}
    </AccionesFila>
  )
}

/**
 * Retirado por traslado (C.1.LIS.3b / RET.5): generar el acta de retiro (PDF) y
 * marcarla como ingresada al SIMPADE; ya marcada, la misma acción la corrige (RET.5).
 */
function RetiroTrasladoAcciones({ matricula }: { matricula: Matricula }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  // SIMPADE y acta: Administrador o Gestor con la sede y jornada (V178, V281).
  const { reactivar } = useMatriculaCapacidades()
  const { notify } = useNotify()
  const [abierto, setAbierto] = useState(false)
  const [generando, setGenerando] = useState(false)
  // El acta es opcional y solo para el Administrador o el Gestor administrativo (Sección 4.1).
  if (!puedeEditar || !reactivar || matricula.status !== "Retirado" || !matricula.retiroTraslado) return null
  const nombre = `${matricula.firstName} ${matricula.lastName}`

  async function generarActa() {
    setGenerando(true)
    const r = await downloadReport("matricula-acta-retiro", { format: "pdf", filters: { IDS: [Number(matricula.id)] } })
    setGenerando(false)
    if (r.status !== "ok") notify(r.message, { variant: "error" })
  }

  return (
    <>
      <OnlineOnlyAction>
        <BotonAccion
          modo="icon"
          label="Generar acta de retiro"
          ariaLabel={`Generar acta de retiro de ${nombre}`}
          Icon={FilePdfIcon}
          disabled={generando}
          onClick={() => void generarActa()}
        />
      </OnlineOnlyAction>
      <OnlineOnlyAction>
          <BotonAccion
            modo="icon"
            label="Marcar como ingresado al SIMPADE"
            ariaLabel={`Marcar como ingresado al SIMPADE: ${nombre}`}
            Icon={ClipboardCheckIcon}
            onClick={() => setAbierto(true)}
          />
          {abierto ? <DialogMarcarSimpade matricula={matricula} onClose={() => setAbierto(false)} /> : null}
      </OnlineOnlyAction>
    </>
  )
}

/**
 * Marca de la matrícula complementaria (Sección 2.16): la principal muestra
 * «Con matrícula complementaria»; la complementaria, «Complementaria» o, por
 * adscripción, «Complementaria de [Establecimiento de origen]».
 */
export function MarcaComplementaria({
  matricula,
}: {
  matricula: Pick<Matricula, "tipo" | "origenAdscripcion" | "tieneComplementaria">
}) {
  if (matricula.tipo === "COMPLEMENTARIA")
    return (
      <Badge variant="soft" color="secondary" className="rounded-full text-xs font-medium tracking-normal">
        {matricula.origenAdscripcion ? `Complementaria de ${matricula.origenAdscripcion}` : "Complementaria"}
      </Badge>
    )
  return matricula.tieneComplementaria ? <BadgeComplementaria /> : null
}

/**
 * Registrar autorización de datos (Sección 2.1, Regla 81): Cursando y sin la
 * autorización del acudiente. El rol (Administrador o Gestor administrativo
 * del establecimiento) lo valida el back.
 */
function RegistrarAutorizacionAccion({ matricula }: { matricula: Matricula }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  const [abierto, setAbierto] = useState(false)
  if (!puedeEditar || matricula.status !== "Cursando" || !matricula.sinAutorizacion) return null
  return (
    <OnlineOnlyAction>
      <BotonAccion
        modo="icon"
        label="Registrar autorización de datos"
        ariaLabel={`Registrar autorización de datos de ${matricula.firstName} ${matricula.lastName}`}
        Icon={ShieldCheckIcon}
        onClick={() => setAbierto(true)}
      />
      {abierto ? <DialogRegistrarAutorizacion matricula={matricula} onOpenChange={setAbierto} /> : null}
    </OnlineOnlyAction>
  )
}

/**
 * Cambiar de especialidad (Sección 2.16, Regla 80): solo desde la complementaria
 * Cursando, nunca desde la principal; la principal toma la nueva sola.
 */
function CambiarEspecialidadAccion({ matricula }: { matricula: Matricula }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  const [abierto, setAbierto] = useState(false)
  if (!puedeEditar || matricula.status !== "Cursando" || matricula.tipo !== "COMPLEMENTARIA") return null
  const nombre = `${matricula.firstName} ${matricula.lastName}`
  return (
    <OnlineOnlyAction>
      <BotonAccion
        modo="icon"
        label="Cambiar de especialidad"
        ariaLabel={`Cambiar de especialidad a ${nombre}`}
        Icon={StackIcon}
        onClick={() => setAbierto(true)}
      />
      {abierto ? (
        <DialogCambiarEspecialidad matriculaId={Number(matricula.id)} estudiante={nombre} onOpenChange={setAbierto} />
      ) : null}
    </OnlineOnlyAction>
  )
}

/**
 * Agregar matrícula complementaria (C.1.COM.1): principal Cursando, sin
 * complementaria, sin retiro solicitado (Regla 71) y con alguna sede que ofrezca
 * su grado y especialidad en otra jornada. El rol (Administrador, Gestor o
 * Supervisor con Guardar en la sede y jornada destino) lo valida el back.
 */
function AgregarComplementariaAccion({ matricula }: { matricula: Matricula }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  const [abierto, setAbierto] = useState(false)
  if (
    !puedeEditar ||
    matricula.status !== "Cursando" ||
    matricula.tipo === "COMPLEMENTARIA" ||
    matricula.tieneComplementaria ||
    !matricula.puedeAgregarComplementaria ||
    matricula.anulacionPendiente
  )
    return null
  return (
    <OnlineOnlyAction>
      <BotonAccion
        modo="icon"
        label="Agregar matrícula complementaria"
        ariaLabel={`Agregar matrícula complementaria a ${matricula.firstName} ${matricula.lastName}`}
        Icon={StackIcon}
        onClick={() => setAbierto(true)}
      />
      {/* Con retiro solicitado (Regla 71) abre el aviso de acción bloqueada (SOL.4b). */}
      {abierto && matricula.retiroSolicitado ? (
        <DialogAccionBloqueada
          matricula={matricula}
          accion="Agregar matrícula complementaria"
          onClose={() => setAbierto(false)}
        />
      ) : abierto ? (
        <DialogAgregarComplementaria matricula={matricula} onOpenChange={setAbierto} />
      ) : null}
    </OnlineOnlyAction>
  )
}

/**
 * Cambiar de grupo y de grado abren su modal (el mismo de la barra de lote);
 * corregir identidad se resuelve en Editar con `accion`.
 */
function AccionesEditar({ matricula, parte }: { matricula: Matricula; parte: "cambios" | "identidad" }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState<"grupo" | "grado" | null>(null)
  const [bloqueada, setBloqueada] = useState<string | null>(null)
  const capacidades = useMatriculaCapacidades()
  if (!puedeEditar || matricula.status !== "Cursando") return null
  // Con retiro solicitado (Regla 71) los cambios se muestran pero abren el aviso de
  // acción bloqueada (SOL.4b); con anulación pendiente no se ofrecen. Corregir identidad sí.
  const cambios = !matricula.anulacionPendiente
  const nombre = `${matricula.firstName} ${matricula.lastName}`
  const cerrar = (open: boolean) => !open && setAbierto(null)
  const abrir = (accion: "grupo" | "grado", label: string) =>
    matricula.retiroSolicitado ? setBloqueada(label) : setAbierto(accion)
  // Partido en dos: Agregar complementaria va entre los cambios y Corregir identidad (C.1.LIS.3).
  // Corregir identidad es del Administrador o el Gestor del establecimiento (Regla 43).
  if (parte === "identidad")
    return !capacidades.reactivar ? null : (
      <OnlineOnlyAction>
        <BotonAccion
          modo="icon"
          label="Corregir datos de identidad"
          ariaLabel={`Corregir datos de identidad de ${nombre}`}
          Icon={IdentificationCardIcon}
          onClick={() =>
            void navigate({ to: paths.app.coberturaMatriculaEditar.getHref(matricula.id), search: (prev) => ({ ...prev, accion: "corregir-identidad" }) })
          }
        />
      </OnlineOnlyAction>
    )
  return (
    <>
      {cambios ? (
        <>
          {capacidades.operar ? (
          <OnlineOnlyAction>
            <BotonAccion modo="icon" label="Cambiar de grupo" ariaLabel={`Cambiar de grupo a ${nombre}`} Icon={ArrowsLeftRightIcon} onClick={() => abrir("grupo", "Cambiar de grupo")} />
          </OnlineOnlyAction>
          ) : null}
          {capacidades.cambiarGrado ? (
            <OnlineOnlyAction>
              <BotonAccion modo="icon" label="Cambiar de grado" ariaLabel={`Cambiar de grado a ${nombre}`} Icon={ArrowsDownUpIcon} onClick={() => abrir("grado", "Cambiar de grado")} />
            </OnlineOnlyAction>
          ) : null}
        </>
      ) : null}
      {bloqueada ? <DialogAccionBloqueada matricula={matricula} accion={bloqueada} onClose={() => setBloqueada(null)} /> : null}
      {abierto === "grupo" ? <DialogCambiarGrupo matriculas={[matricula]} onOpenChange={cerrar} /> : null}
      {abierto === "grado" ? <DialogCambiarGrado matriculas={[matricula]} onOpenChange={cerrar} /> : null}
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
  // Principal Cursando (C.1.LIS.3a); con duplicado del informe de calidad se activa. El alcance (Regla 72) lo valida el back.
  if (!puedeEditar || matricula.status !== "Cursando" || matricula.tipo === "COMPLEMENTARIA") return null
  const nombre = `${matricula.firstName} ${matricula.lastName}`
  return (
    <OnlineOnlyAction>
      <BotonAccion
        modo="icon"
        label={"Unificar estudiantes"}
        ariaLabel={`Unificar estudiantes: ${nombre}`}
        Icon={UserSwitchIcon}
        onClick={() => setAbierto(true)}
        disabled={!matricula.posibleDuplicado}
        motivoInactiva="No hay un registro duplicado de este estudiante"
      />
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
      <BotonAccion modo="icon" label={label} ariaLabel={`${label}: ${matricula.firstName} ${matricula.lastName}`} Icon={origen ? EnvelopeIcon : ProhibitIcon} onClick={() => setAbierto(true)} destructivo={!origen} />
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
  const { reactivar } = useMatriculaCapacidades()
  const [abierto, setAbierto] = useState(false)
  if (!puedeEditar || !reactivar || !ESTADOS_REACTIVABLES.includes(matricula.status)) return null
  return (
    <OnlineOnlyAction>
      <BotonAccion modo="icon" label={"Reactivar"} ariaLabel={`Reactivar la matrícula de ${matricula.firstName} ${matricula.lastName}`} Icon={ArrowCounterClockwiseIcon} onClick={() => setAbierto(true)} />
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
  // Solo la principal llega por traslado con snapshot (C.1.LIS.3c); el rol lo valida el back (Regla 45).
  if (!puedeEditar || matricula.status !== "Cursando" || matricula.tipo === "COMPLEMENTARIA" || !matricula.snapshotPendiente)
    return null
  return (
    <OnlineOnlyAction>
      <BotonAccion modo="icon" label={"Homologar desde snapshot"} ariaLabel={`Homologar desde snapshot: ${matricula.firstName} ${matricula.lastName}`} Icon={CloudSyncIcon} onClick={() => setAbierto(true)} />
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

