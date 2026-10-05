import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  CheckIcon,
  MagnifyingGlassIcon,
  SpinnerIcon,
} from "@/components/ui/icons";
import { useNotify } from "@/components/notice/notice-context";
import { getErrorMessage } from "@/lib/api-client";

import { useCalificacionesQuery } from "@/features/planeador/api/query/use-calificaciones-query";
import { useInstrumentoActividadQuery } from "@/features/planeador/api/query/use-instrumento-actividad-query";
import { useCalificarBulkMutation } from "@/features/planeador/api/mutations/use-calificar-bulk";
import { buildBulkInputs } from "@/features/planeador/components/planilla/calificar-actividad-bulk";
import {
  InstrumentoGradingFields,
  instrumentoCompletitud,
  instrumentoSinBulk,
  resolverInstrumentoEfectivo,
} from "@/features/planeador/components/planilla/instrumento-grading-fields";
import type { Actividad } from "@/features/planeador/api/types/actividad";
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion";
import { planeadorKeys } from "@/features/planeador/api/query-keys";

interface CalificacionesAprobacionViewProps {
  actividad: Actividad;
}

export function CalificacionesAprobacionView({
  actividad,
}: CalificacionesAprobacionViewProps) {
  const {
    data: calificaciones = [],
    isPending,
    isError,
    refetch,
  } = useCalificacionesQuery(actividad.id, actividad.fechaInicio);
  const { data: instrumento, isPending: isPendingInstrumento } =
    useInstrumentoActividadQuery(actividad.id);
  const sinSalida = instrumento?.instrumento == null;

  const queryClient = useQueryClient();
  const { notify } = useNotify();

  const [seleccionados, setSeleccionados] = useState<Set<number>>(() => {
    if (calificaciones.length === 0) return new Set();
    return new Set(calificaciones.map((c) => c.id));
  });
  // Se re-sincroniza cuando llegan las calificaciones y todavía no se tocó
  // nada (caso "todos" → marcar todos por default).
  const [inicializado, setInicializado] = useState(false);
  if (!inicializado && calificaciones.length > 0) {
    setSeleccionados(new Set(calificaciones.map((c) => c.id)));
    setInicializado(true);
  }

  const [nota, setNota] = useState<NotaCriterio[]>([]);
  const [filtro, setFiltro] = useState("");
  const [dirty, setDirty] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const filtrados = useMemo(() => {
    const term = filtro.trim().toLowerCase();
    if (!term) return calificaciones;
    return calificaciones.filter((c) =>
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(term),
    );
  }, [calificaciones, filtro]);

  const toggle = (id: number) => {
    setDirty(true);
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const calificarBulk = useCalificarBulkMutation();
  const completitud = instrumentoCompletitud(instrumento, nota);
  const efectivoBulk = resolverInstrumentoEfectivo(instrumento);
  const escalaSinBulk = instrumentoSinBulk(efectivoBulk);

  async function guardarCalificacionBulk() {
    if (!instrumento) return;
    const inputs = buildBulkInputs(
      instrumento,
      nota,
      actividad.id,
      [...seleccionados],
      actividad.fechaInicio,
    );
    if (inputs.length === 0) return;
    setGuardando(true);
    try {
      await Promise.all(
        inputs.map((input) => calificarBulk.mutateAsync(input)),
      );
      queryClient.invalidateQueries({
        queryKey: planeadorKeys.actividad.calificaciones(actividad.id),
      });
      notify("Calificación en bloque guardada.");
      setDirty(false);
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" });
    } finally {
      setGuardando(false);
    }
  }

  if (isPending || isPendingInstrumento) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
        <Spinner /> Cargando estudiantes…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-red text-sm">
          Ocurrió un error al cargar los estudiantes.
        </p>
        <Button
          variant="outline"
          color="neutral"
          size="sm"
          onClick={() => refetch()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (calificaciones.length === 0) {
    return (
      <div className="text-muted-foreground px-6 py-12 text-center text-sm">
        Esta actividad todavía no tiene estudiantes asignados.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <h4 className="text-base font-semibold">
        Instrumento:{" "}
        {instrumento?.instrumentoNombre ??
          actividad.instrumento ??
          "Sin definir"}
      </h4>

      {sinSalida && (
        <p className="border-input text-muted-foreground rounded-md border px-4 py-3 text-sm">
          Esta actividad todavía no se puede evaluar: no tiene instrumento, así
          que no hay nota que registrar. Defina un instrumento de evaluación.
        </p>
      )}

      {sinSalida ? null : (
        <InstrumentoGradingFields
          actividadId={actividad.id}
          value={nota}
          onChange={(next) => {
            setDirty(true);
            setNota(next);
          }}
        />
      )}

      {escalaSinBulk && (
        <p className="text-muted-foreground text-xs">
          Este instrumento no admite calificación en bloque — califique
          estudiante por estudiante desde la grilla ("Marcar").
        </p>
      )}

      <Field variant="outlined">
        <FieldLabel>Apellidos y nombres</FieldLabel>
        <div className="relative">
          <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-9"
          />
        </div>
      </Field>

      <ul className="border-input flex-1 overflow-y-auto rounded-md border">
        {filtrados.map((estudiante) => {
          const nombreCompleto =
            `${estudiante.nombres} ${estudiante.apellidos}`.trim();
          return (
            <li
              key={estudiante.id}
              className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <Checkbox
                checked={seleccionados.has(estudiante.id)}
                onCheckedChange={() => toggle(estudiante.id)}
                aria-label={`Aprobar a ${nombreCompleto}`}
              />
              <span className="min-w-0 flex-1 font-medium uppercase">
                {nombreCompleto}
              </span>
            </li>
          );
        })}
      </ul>

      {dirty && (
        <footer className="bg-sidebar sticky bottom-0 z-30 -mx-3 -mb-3">
          <div className="border-border bg-background text-card-foreground flex flex-wrap items-center justify-between gap-4 border-t px-4 py-2.5 text-sm">
            <p className="text-muted-foreground text-sm">
              {completitud.mensaje ??
                "Se detectaron cambios. Guarda para conservar la información."}
            </p>
            <Button
              variant="fill"
              color="primary"
              size="sm"
              disabled={
                seleccionados.size === 0 ||
                !completitud.completo ||
                guardando ||
                escalaSinBulk
              }
              onClick={guardarCalificacionBulk}
            >
              {guardando ? (
                <SpinnerIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
