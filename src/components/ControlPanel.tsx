import { CopySection } from "./CopySection";
import { LocationSection } from "./LocationSection";
import { MomentSection } from "./MomentSection";
import { SkySection } from "./SkySection";
import type { PosterActions, PosterState } from "../state/poster";

export function ControlPanel({ poster, actions }: { poster: PosterState; actions: PosterActions }) {
  return (
    <aside className="border-b border-white/10 bg-[#0b0d14] lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <header className="px-6 pb-7 pt-8">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-[#e8c478]">
          Carta celeste
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-none text-white">
          keiStars
        </h1>
        <p className="mt-3 max-w-[34ch] text-[13px] leading-relaxed text-[#9aa4bd]">
          Diseña un póster con el cielo tal y como se vio —o se verá— desde un lugar y un momento
          concretos. Todo se calcula en tu navegador.
        </p>
      </header>

      <MomentSection poster={poster} actions={actions} />
      <LocationSection poster={poster} actions={actions} />
      <SkySection poster={poster} actions={actions} />
      <CopySection poster={poster} actions={actions} />

      <footer className="border-t border-white/10 px-6 py-6 text-[11px] leading-relaxed text-[#66708a]">
        Firmamento renderizado con d3-celestial (datos de IAU / Stellarium) sin salir de tu equipo.
        Las búsquedas de lugares usan Nominatim · OpenStreetMap.
      </footer>
    </aside>
  );
}
