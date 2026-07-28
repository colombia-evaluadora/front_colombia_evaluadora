import { CaretDownIcon, CheckIcon, XIcon } from "@/components/ui/icons";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  inputTriggerVariants,
  inputVariants,
  useInputVariant,
} from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { TeachingLevel } from "../../../api/types/academic-period/rating-scales";

interface TeachingLevelsMultiSelectProps {
  id?: string;
  levels: TeachingLevel[];
  value: number[];
  onChange: (ids: number[]) => void;
  invalid?: boolean;
}

export function TeachingLevelsMultiSelect({
  id,
  levels,
  value,
  onChange,
  invalid,
}: TeachingLevelsMultiSelectProps) {
  const selected = levels.filter((level) => value.includes(level.id));
  const resolvedVariant = useInputVariant();

  function toggle(levelId: number) {
    onChange(
      value.includes(levelId)
        ? value.filter((v) => v !== levelId)
        : [...value, levelId],
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            aria-invalid={invalid}
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex h-auto min-h-10 items-center justify-between gap-2 text-left",
            )}
          />
        }
      >
        <div className="flex flex-1 flex-wrap gap-1.5">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Seleccionar</span>
          ) : (
            selected.map((level) => (
              <span
                key={level.id}
                className="bg-muted flex items-center gap-1 rounded-none px-2 py-0.5 text-xs"
              >
                {level.nombre}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Quitar ${level.nombre}`}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(level.id);
                  }}
                >
                  <XIcon className="size-3" />
                </span>
              </span>
            ))
          )}
        </div>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="min-w-64 p-1">
        {levels.map((level) => {
          const isSelected = value.includes(level.id);
          return (
            <button
              key={level.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(level.id)}
              className="hover:bg-foreground/10 flex w-full cursor-pointer items-center justify-between gap-2 rounded-none px-2 py-1.5 text-left text-sm"
            >
              {level.nombre}
              {isSelected && <CheckIcon className="size-4 shrink-0" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
