import { useState, type ReactNode } from "react";
import { CopySection } from "./CopySection";
import { LocationSection } from "./LocationSection";
import { MomentSection } from "./MomentSection";
import { SkySection } from "./SkySection";
import { buildShareHref } from "../lib/storage";
import type { PosterActions, PosterState } from "../state/poster";
import { Button, InlineNote } from "./ui";

export function ControlPanel({
  poster,
  actions,
  locked,
  children,
}: {
  poster: PosterState;
  actions: PosterActions;
  /** Bloquea la edición mientras se exporta (React 19: atributo nativo `inert`). */
  locked?: boolean;
  children?: ReactNode;
}) {
  const [shareNote, setShareNote] = useState<string | null>(null);

  const share = async () => {
    const href = buildShareHref(poster);
    try {
      await navigator.clipboard.writeText(href);
      setShareNote("Enlace copiado al portapapeles: quién lo abra verá tu diseño exacto.");
    } catch {
      // Portapapeles bloqueado (permisos/HTTP no seguro): edición manual.
      window.prompt("Copia este enlace:", href);
      setShareNote("Copia el enlace del cuadro de diálogo para compartir tu diseño.");
    }
  };

  const confirmReset = () => {
    if (window.confirm("¿Restablecer todo el diseño (papel, cielo, textos y lugar)?")) {
      actions.resetAll();
    }
  };

  return (
    <aside
      inert={locked ? true : undefined}
      className={
        "border-b border-white/10 bg-[#0b0d14] pb-20 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r lg:pb-0"
      }
    >
      <header className="px-6 pb-7 pt-8">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-[#e8c478]">
          Carta celeste
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-none text-white">
          KeiStars
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

      <footer className="border-t border-white/10 px-6 py-6 text-[11px] leading-relaxed text-[#7f89a3]">
        Firmamento renderizado con d3-celestial (datos de IAU / Stellarium) sin salir de tu equipo.
        Las búsquedas de lugares consultan Nominatim · OpenStreetMap.
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="quiet"
            className="px-3 py-1.5 text-xs"
            onClick={() => void share()}
          >
            Compartir diseño
          </Button>
          <Button
            type="button"
            variant="quiet"
            className="px-3 py-1.5 text-xs"
            onClick={confirmReset}
          >
            Restablecer todo
          </Button>
        </div>
        {shareNote ? (
          <div className="mt-3">
            <InlineNote>{shareNote}</InlineNote>
          </div>
        ) : null}
      </footer>
      {children}
    </aside>
  );
}
