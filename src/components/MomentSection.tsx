import { useEffect, useState, type FormEvent } from "react";
import { buildSkyDate, clamp, estimateUtcOffsetMinutes, formatUtcOffset } from "../lib/time";
import { describeTimeZone } from "../lib/timezone";
import type { PosterActions, PosterState } from "../state/poster";
import { Button, Field, InlineNote, Section, TextInput } from "./ui";

/**
 * El desfase manual usa un borrador de texto: si el usuario borra el campo,
 * el valor no salta a 0 — solo se confirma con Enter o al salir del campo.
 */
export function MomentSection({
  poster,
  actions,
}: {
  poster: PosterState;
  actions: PosterActions;
}) {
  const estimated = estimateUtcOffsetMinutes(poster.longitude);
  const [offsetDraft, setOffsetDraft] = useState(() => String(poster.utcOffsetMinutes));
  const [offsetInvalid, setOffsetInvalid] = useState(false);

  // El draft sigue los cambios del dominio (auto-offset, lugar, reset…).
  useEffect(() => {
    setOffsetDraft(String(poster.utcOffsetMinutes));
    setOffsetInvalid(false);
  }, [poster.utcOffsetMinutes]);

  const commitOffset = () => {
    const parsed = Number(offsetDraft.trim());
    if (offsetDraft.trim() === "" || !Number.isFinite(parsed)) {
      setOffsetInvalid(true);
      return;
    }
    setOffsetInvalid(false);
    actions.setUtcOffsetMinutes(clamp(Math.round(parsed), -720, 840));
  };

  const onSubmitDraft = (event: FormEvent) => {
    event.preventDefault();
    commitOffset();
  };

  const dateEmpty = poster.dateStr.trim() === "";
  const timeEmpty = poster.timeStr.trim() === "";
  const dateInvalid = !dateEmpty && !/^(\d{4})-(\d{2})-(\d{2})$/.test(poster.dateStr.trim());
  const wall = buildSkyDate(poster.dateStr, poster.timeStr);
  const momentInvalid = !dateEmpty && !timeEmpty && wall === null;

  return (
    <Section
      index="01"
      title="El momento"
      hint="Fecha y hora locales del lugar del recuerdo. Con ellas d3-celestial calcula el tiempo sideral y orienta el mapa al cenit de ese instante."
    >
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Fecha"
          htmlFor="moment-date"
          error={dateInvalid ? "Fecha incompleta o inválida." : null}
        >
          <TextInput
            id="moment-date"
            type="date"
            value={poster.dateStr}
            invalid={dateInvalid}
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

      {momentInvalid ? (
        <InlineNote tone="danger">
          La fecha u hora no existen en el calendario (p. ej. 30 de febrero). Corrige alguno de los
          dos campos para retomar el cielo.
        </InlineNote>
      ) : null}

      <Field
        label="Desfase UTC (minutos)"
        htmlFor="moment-utc"
        error={offsetInvalid ? "Escribe un número entero entre −720 y 840." : null}
        hint={
          poster.timeZone
            ? `Zona del lugar: ${describeTimeZone(poster.timeZone, poster.utcOffsetMinutes)}${
                poster.offsetTouched ? " · fijado a mano" : ""
              }`
            : undefined
        }
      >
        <form onSubmit={onSubmitDraft} className="flex gap-2">
          <TextInput
            id="moment-utc"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={offsetDraft}
            invalid={offsetInvalid}
            aria-label="Desfase UTC en minutos"
            onChange={(event) => setOffsetDraft(event.target.value)}
            onBlur={commitOffset}
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
        </form>
      </Field>

      {!poster.offsetTouched && poster.timeZone ? (
        <InlineNote>
          Desfase automático por zona horaria real (IANA), con horario de verano incluido. «Estimar»
          lo recupera si lo cambias a mano.
        </InlineNote>
      ) : poster.offsetTouched && Math.abs(poster.utcOffsetMinutes - estimated) > 60 ? (
        <InlineNote>
          El valor manual se aleja de la estimación solar ({formatUtcOffset(estimated)}) para esta
          longitud: revisa el huso horario del lugar si no es intencionado.
        </InlineNote>
      ) : null}
    </Section>
  );
}
