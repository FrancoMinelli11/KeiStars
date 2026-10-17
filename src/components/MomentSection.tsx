import { estimateUtcOffsetMinutes, formatUtcOffset } from "../lib/time";
import type { PosterActions, PosterState } from "../state/poster";
import { Button, Field, InlineNote, Section, TextInput } from "./ui";

export function MomentSection({
  poster,
  actions,
}: {
  poster: PosterState;
  actions: PosterActions;
}) {
  const estimated = estimateUtcOffsetMinutes(poster.longitude);

  return (
    <Section
      index="01"
      title="El momento"
      hint="Fecha y hora locales del lugar del recuerdo. Con ellas d3-celestial calcula el tiempo sideral y orienta el mapa al cenit de ese instante."
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha" htmlFor="moment-date">
          <TextInput
            id="moment-date"
            type="date"
            value={poster.dateStr}
            onChange={(event) => actions.setDate(event.target.value)}
          />
        </Field>
        <Field label="Hora local" htmlFor="moment-time">
          <TextInput
            id="moment-time"
            type="time"
            value={poster.timeStr}
            onChange={(event) => actions.setTime(event.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Desfase UTC (minutos)"
        htmlFor="moment-utc"
        hint={`Equivale a ${formatUtcOffset(poster.utcOffsetMinutes)}${
          poster.offsetTouched
            ? " · ajustado a mano"
            : ` · estimado por longitud (p. ej. España necesita UTC+1 en verano)`
        }`}
      >
        <div className="flex gap-2">
          <TextInput
            id="moment-utc"
            type="number"
            step={30}
            min={-720}
            max={840}
            value={poster.utcOffsetMinutes}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) actions.setUtcOffsetMinutes(parsed);
            }}
          />
          <Button
            type="button"
            variant="quiet"
            onClick={actions.resetUtcOffset}
            disabled={!poster.offsetTouched}
            className="shrink-0 whitespace-nowrap"
          >
            Estimar
          </Button>
        </div>
      </Field>

      {poster.offsetTouched && Math.abs(poster.utcOffsetMinutes - estimated) > 60 ? (
        <InlineNote>
          El valor manual se aleja de la estimación solar ({formatUtcOffset(estimated)}) para esta
          longitud: revisa el huso horario del lugar si no es intencionado.
        </InlineNote>
      ) : null}
    </Section>
  );
}
