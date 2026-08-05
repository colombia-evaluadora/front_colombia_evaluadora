import { ArrowLeftIcon, CheckIcon } from "@/components/ui/icons"
import { Link, useParams } from "@tanstack/react-router"

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"

import { useAuditSessionQuery } from "../api/query/use-audit-session-query"
import { useAuditSessionStatusesQuery } from "../api/query/use-audit-session-statuses-query"
import { SESSION_STATUS_BADGE } from "../api/ui-mappings"
import { SessionOperationsDataTable } from "../components/table/session-operations-table"

export function SessionOperationsPage() {
  const { sessionId } = useParams({ strict: false }) as { sessionId: string }

  const { data: session, isPending, isError } = useAuditSessionQuery({ sessionId })

  // El label del estado lo entrega el backend (`{ key, label }`). Si la
  // query todavía no llegó, caemos al `key` como fallback.
  const { data: statusOptions = [] } = useAuditSessionStatusesQuery()
  const statusLabel = session
    ? (statusOptions.find((o) => o.key === session.status)?.label ?? session.status)
    : null

  const initials = session
    ? session.authorName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
    : ""

  const started = session ? new Date(session.startedAt) : null
  const ended = session?.endedAt ? new Date(session.endedAt) : null
  const durationMs = started && ended ? ended.getTime() - started.getTime() : null
  const minutes = durationMs ? Math.round(durationMs / 60000) : null
  const durationLabel =
    minutes === null
      ? "—"
      : minutes < 60
        ? `${minutes}m`
        : `${Math.floor(minutes / 60)}h ${minutes % 60}m`

  const title = isPending ? (
    <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
      <Spinner /> Cargando sesión…
    </div>
  ) : isError || !session ? (
    "Sesión no encontrada"
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <Avatar>
        {session.authorAvatarUrl && <AvatarImage src={session.authorAvatarUrl} alt="" />}
        <AvatarFallback>{initials}</AvatarFallback>
        {session.authorVerified && (
          <AvatarBadge>
            <CheckIcon weight="bold" />
          </AvatarBadge>
        )}
      </Avatar>
      {session.authorName}
      <Badge variant="soft" color="muted">
        {session.ip}
      </Badge>
      <Badge {...SESSION_STATUS_BADGE[session.status]}>{statusLabel}</Badge>
    </div>
  )

  const description =
    session && !isPending && !isError ? (
      <>
        {started?.toLocaleString("es", {
          dateStyle: "short",
          timeStyle: "short",
        })}
        {ended
          ? ` → ${ended.toLocaleString("es", {
              dateStyle: "short",
              timeStyle: "short",
            })}`
          : " · En curso"}
        {" · "}
        {durationLabel}
        {" · "}
        {session.operationsCount} operación(es)
      </>
    ) : undefined

  return (
    // El encabezado sticky y el cuerpo son dos Cards independientes, NO se
    // encapsulan en una misma Card aquí — eso lo hace internamente
    // `SessionOperationsDataTable` para que el body y su data-fetching
    // compartan el ciclo de vida.
    <SessionOperationsDataTable
      sessionId={sessionId}
      title={title}
      description={description}
      action={
        <Button
          variant="ghost"
          size="sm"
          render={<Link to={paths.app.auditoriaSesiones.getHref()} />}
          nativeButton={false}
        >
          <ArrowLeftIcon weight="bold" className="size-4" />
          Volver
        </Button>
      }
    />
  )
}
