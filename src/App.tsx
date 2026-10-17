import { useMemo, useState } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { PosterStage } from "./components/PosterStage";
import { createDefaultPoster, createPosterActions, type PosterState } from "./state/poster";

export default function App() {
  const [poster, setPoster] = useState<PosterState>(createDefaultPoster);
  const actions = useMemo(() => createPosterActions(setPoster), []);

  return (
    <div className="min-h-screen bg-[#070912] text-[#e7e9f2] lg:grid lg:grid-cols-[minmax(380px,440px)_1fr]">
      <ControlPanel poster={poster} actions={actions} />
      <PosterStage poster={poster} />
    </div>
  );
}
