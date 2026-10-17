import { useCitySearch } from "../hooks/useCitySearch";
import { parseCoordinate } from "../lib/coordinates";
import type { PosterActions, PosterState } from "../state/poster";
import { Field, InlineNote, Section, TextInput } from "./ui";

export function LocationSection({
  poster,
  actions,
}: {
  poster: PosterState;
  actions: PosterActions;
}) {
  const search = useCitySearch();

  const latitudeError =
    poster.latitudeText.trim() === ""
      ? "Indica una latitud."
      : parseCoordinate(poster.latitudeText, "latitude") === null
        ? "Latitud no válida: debe estar entre −90 y 90."
        : null;
  const longitudeError =
    poster.longitudeText.trim() === ""
      ? "Indica una longitud."
      : parseCoordinate(poster.longitudeText, "longitude") === null
        ? "Longitud no válida: debe estar entre −180 y 180."
        : null;

  return (
    <Section
      index="02"
      title="El lugar"
      hint="La ubicación fija qué porción de cielo se ve sobre el horizonte. Puedes buscar una ciudad o escribir las coordenadas a mano."
    >
      <Field label="Buscar ciudad o lugar" htmlFor="location-query">
        <TextInput
          id="location-query"
          type="search"
          autoComplete="off"
          placeholder="Mendoza, Madrid, Santiago…"
          value={search.query}
          onChange={(event) => search.setQuery(event.target.value)}
        />
      </Field>

      {search.status === "loading" ? (
        <p className="text-xs text-[#7f89a3]">Buscando lugares…</p>
      ) : null}

      {search.error ? <InlineNote tone="danger">{search.error}</InlineNote> : null}

      {search.status === "success" && search.results.length === 0 ? (
        <InlineNote>Sin resultados para «{search.query.trim()}». Prueba con otro nombre.</InlineNote>
      ) : null}

      {search.results.length > 0 ? (
        <ul className="overflow-hidden rounded-lg border border-white/12">
          {search.results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => {
                  actions.selectPlace(place);
                  search.clear();
                }}
                className="block w-full border-b border-white/8 px-3 py-2.5 text-left text-[13px] leading-snug text-[#c9cee0] transition last:border-b-0 hover:bg-white/[0.06] hover:text-white"
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Latitud" htmlFor="location-lat" error={latitudeError}>
          <TextInput
            id="location-lat"
            inputMode="decimal"
            value={poster.latitudeText}
            invalid={latitudeError !== null}
            onChange={(event) => actions.setLatitude(event.target.value)}
          />
        </Field>
        <Field label="Longitud" htmlFor="location-lon" error={longitudeError}>
          <TextInput
            id="location-lon"
            inputMode="decimal"
            value={poster.longitudeText}
            invalid={longitudeError !== null}
            onChange={(event) => actions.setLongitude(event.target.value)}
          />
        </Field>
      </div>

      <p className="text-xs leading-relaxed text-[#7f89a3]">
        {poster.placeLabel ? (
          <>
            <span className="text-[#9aa4bd]">{poster.placeLabel}</span> ·{" "}
          </>
        ) : null}
        Coordina en el póster:{" "}
        <span className="text-[#9aa4bd]">{poster.coordinates || "—"}</span>
      </p>

      <InlineNote>
        Las búsquedas usan Nominatim (OpenStreetMap) con respaldo en Photon, con retardo de 450 ms y
        un mínimo de 3 caracteres para respetar su política de uso.
      </InlineNote>
    </Section>
  );
}
