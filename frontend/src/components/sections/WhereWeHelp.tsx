import { useEffect, useRef } from "react";
import { Map, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import Reveal from "@/components/ui/Reveal";

function WhereWeHelp() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    if (mapRef.current) {
      return;
    }

    const map = new Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": "#FBFAF7",
            },
          },
        ],
      },
      center: [54.3, 24.3],
      zoom: 5.4,
      minZoom: 4.5,
      maxZoom: 12,
    });

    map.addControl(
      new NavigationControl({
        showCompass: false,
      }),
      "top-right",
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <section
      id="where-we-help"
      className="overflow-hidden bg-white py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A98C4F]">
              Where We Help
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#071B2D] sm:text-4xl">
              Explore Property Areas Across the UAE
            </h2>

            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
              Explore property areas across the UAE and discover financing
              guidance from First Home.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-[#FBFAF7] shadow-sm">
            <div className="relative h-[500px] w-full sm:h-[600px] lg:h-[680px]">
              <div
                ref={mapContainerRef}
                className="absolute inset-0"
                aria-label="Interactive UAE property area map"
              />

              <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur sm:left-7 sm:top-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A98C4F]">
                  First Home
                </p>

                <p className="mt-1 text-sm font-semibold text-[#071B2D]">
                  UAE Property Areas
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Zoom and move around the map
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default WhereWeHelp;
