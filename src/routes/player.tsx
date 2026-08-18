import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Player } from "@/components/Player";
import { QueueSidebar } from "@/components/QueueSidebar";
import { RoomHostPanel } from "@/components/RoomHostPanel";

export const Route = createFileRoute("/player")({
  component: PlayerPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Now Playing — Karaoke" },
      { name: "description", content: "Karaoke player with a live Reserve-Next queue. Songs play from YouTube in order." },
    ],
  }),
});

const HOST_KEY = "karaoke.hosted-room";

function PlayerPage() {
  const [hosting, setHosting] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        setHosting(!!localStorage.getItem(HOST_KEY));
      } catch {
        setHosting(false);
      }
    };
    check();
    const onChange = () => check();
    window.addEventListener("storage", onChange);
    window.addEventListener("karaoke:host-changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("karaoke:host-changed", onChange);
    };
  }, []);

  return (
    <>
      {/* Keep RoomHostPanel mounted once so its event listeners and modal
          state survive layout switches between hosting / not hosting. */}
      <ClientOnly fallback={null}>
        <RoomHostPanel hideBar />
      </ClientOnly>


      {hosting ? (
        <div className="fixed inset-0 flex flex-col overflow-hidden bg-background px-3 py-3 sm:px-4 sm:py-4 landscape:max-lg:px-2 landscape:max-lg:py-2">
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-4 landscape:max-lg:grid-cols-[minmax(0,1fr)_280px] landscape:max-lg:grid-rows-1 landscape:max-lg:gap-2 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1">
            <div className="flex min-w-0 min-h-0 flex-col gap-3">
              <ClientOnly fallback={<div className="aspect-video w-full rounded-3xl shimmer lg:aspect-auto lg:min-h-0 lg:flex-1 landscape:max-lg:aspect-auto landscape:max-lg:min-h-0 landscape:max-lg:flex-1" />}>
                <Player fill />
              </ClientOnly>
            </div>
            <div className="min-w-0 min-h-0 overflow-hidden">
              <QueueSidebar />
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 landscape:max-lg:px-3 landscape:max-lg:py-3">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 landscape:max-lg:grid-cols-[minmax(0,1fr)_260px] landscape:max-lg:gap-2 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-3">
              <ClientOnly fallback={<div className="aspect-video w-full rounded-3xl shimmer" />}>
                <Player />
              </ClientOnly>
            </div>
            <div className="min-w-0 h-[560px] landscape:max-lg:h-[calc(100svh-120px)] lg:h-[calc(100vh-140px)]">
              <QueueSidebar />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
