import type { PosterActions, PosterState } from "../state/poster";
import { Button, Field, Section, TextInput } from "./ui";

export function CopySection({
  poster,
  actions,
}: {
  poster: PosterState;
  actions: PosterActions;
}) {
  return (
    <Section
      index="04"
      title="Los textos"
      hint="Solo tipografía y mensajes: no tocan el cálculo astronómico. Se pintan con las mismas medidas en la vista previa y en el PNG."
    >
      <Field label="Título" htmlFor="copy-title" hint={`${poster.title.length} / 64 caracteres`}>
        <TextInput
          id="copy-title"
          maxLength={64}
          value={poster.title}
          onChange={(event) => actions.setTitle(event.target.value)}
        />
      </Field>

      <Field
        label="Subtítulo"
        htmlFor="copy-subtitle"
        hint="Se rellena solo con la fecha mientras no lo edites."
      >
        <div className="flex gap-2">
          <TextInput
            id="copy-subtitle"
            maxLength={72}
            value={poster.subtitle}
            onChange={(event) => actions.setSubtitle(event.target.value)}
          />
          <Button
            type="button"
            variant="quiet"
            onClick={actions.resetSubtitle}
            disabled={!poster.subtitleTouched}
            className="shrink-0 whitespace-nowrap"
          >
            Auto
          </Button>
        </div>
      </Field>

      <Field
        label="Coordenadas decorativas"
        htmlFor="copy-coordinates"
        hint="Texto de pie; por defecto refleja la ubicación del lugar."
      >
        <div className="flex gap-2">
          <TextInput
            id="copy-coordinates"
            maxLength={48}
            value={poster.coordinates}
            onChange={(event) => actions.setCoordinates(event.target.value)}
          />
          <Button
            type="button"
            variant="quiet"
            onClick={actions.resetCoordinates}
            disabled={!poster.coordinatesTouched}
            className="shrink-0 whitespace-nowrap"
          >
            Lugar
          </Button>
        </div>
      </Field>
    </Section>
  );
}
