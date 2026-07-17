import { ArrowLeftIcon, CheckIcon } from "@phosphor-icons/react"
import { Link, useParams } from "@tanstack/react-router"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"

import { useAuditSessionQuery } from "../api/query/use-audit-session-query"
import {
  SESSION_STATUS_BADGE,
  SESSION_STATUS_LABELS,
} from "../api/ui-mappings"
import { SessionOperationsDataTable } from "../components/table/session-operations-table"

export function SessionOperationsPage() {
  const { sessionId } = useParams({ strict: false }) as { sessionId: string }

  const { data: session, isPending, isError } = useAuditSessionQuery({ sessionId })

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

  return (
    <Card>
      <CardHeader>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            render={<Link to={paths.app.auditoriaSesiones.getHref()} />}
            nativeButton={false}
          >
            <ArrowLeftIcon weight="bold" className="size-4" />
            Volver
          </Button>
        </CardAction>
        {isPending ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Spinner /> Cargando sesión…
          </div>
        ) : isError || !session ? (
          <CardTitle>Sesión no encontrada</CardTitle>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Avatar>
                {session.authorAvatarUrl && (
                  <AvatarImage src={session.authorAvatarUrl} alt="" />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
                {session.authorVerified && (
                  <AvatarBadge>
                    <CheckIcon weight="bold" />
                  </AvatarBadge>
                )}
              </Avatar>
              <CardTitle>{session.authorName}</CardTitle>
              <Badge variant="fill" color="muted">
                {session.ip}
              </Badge>
              <Badge {...SESSION_STATUS_BADGE[session.status]}>
                {SESSION_STATUS_LABELS[session.status]}
              </Badge>
            </div>
            <CardDescription>
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
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        <SessionOperationsDataTable sessionId={sessionId} />
      </CardContent>
    </Card>
  )
}