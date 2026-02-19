"use client";

import type { ElementRendererProps } from "@/components/elements/registry";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@repo/ui/carousel";
import { useBannerDismissals } from "@/hooks/use-banner-dismissals";
import { cn } from "@/lib/utils";
import type { BannerAlert } from "@repo/types/elements";
import Autoplay from "embla-carousel-autoplay";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function BannerRenderer({ content }: ElementRendererProps<"banner">) {
  const { isDismissed, dismiss } = useBannerDismissals();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const autoplayRef = useRef(
    Autoplay({
      delay: content.settings.cycleIntervalMs || 5000,
      stopOnInteraction: true,
    }),
  );

  const visibleAlerts = useMemo(
    () =>
      content.alerts.filter(
        (alert) => !content.settings.dismissible || !isDismissed(alert.id),
      ),
    [content.alerts, content.settings.dismissible, isDismissed],
  );

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    onSelect();
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const handleDismiss = useCallback(
    (alert: BannerAlert) => {
      dismiss(alert.id);
    },
    [dismiss],
  );

  const getPreset = useCallback(
    (alert: BannerAlert) => {
      return (
        content.importancePresets.find((p) => p.id === alert.importance) ??
        content.importancePresets[0]
      );
    },
    [content.importancePresets],
  );

  // Don't render if no alerts exist or all are dismissed
  if (!content.alerts || content.alerts.length === 0) return null;
  if (visibleAlerts.length === 0) return null;

  // Single alert - no carousel needed
  if (visibleAlerts.length === 1) {
    const alert = visibleAlerts[0]!;
    const preset = getPreset(alert);

    return (
      <div
        className="w-full relative overflow-hidden"
        style={{
          borderRadius: "var(--radius-pill, var(--radius-xl))",
          backgroundColor: preset?.color ?? "#2563EB",
          color: preset?.foreground ?? "#FFFFFF",
        }}
      >
        <div className="px-4 py-2.5 flex items-center justify-center">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm whitespace-nowrap">
              {alert.title}
            </span>
            {alert.description && (
              <span className="text-sm opacity-90 truncate">
                {alert.description}
              </span>
            )}
          </div>
        </div>
        {content.settings.dismissible && (
          <button
            type="button"
            onClick={() => handleDismiss(alert)}
            className="absolute top-1 right-1 p-1 rounded-md hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // Multiple alerts - use carousel
  const plugins = content.settings.autoCycle ? [autoplayRef.current] : [];

  return (
    <div
      className="w-full relative overflow-hidden"
      style={{
        borderRadius: "var(--radius-pill, var(--radius-xl))",
      }}
    >
      <Carousel
        opts={{ loop: true }}
        plugins={plugins}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {visibleAlerts.map((alert) => {
            const preset = getPreset(alert);
            return (
              <CarouselItem key={alert.id} className="pl-0">
                <div
                  className="w-full relative"
                  style={{
                    backgroundColor: preset?.color ?? "#2563EB",
                    color: preset?.foreground ?? "#FFFFFF",
                  }}
                >
                  <div className="px-4 pt-2.5 pb-5 flex items-center justify-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm whitespace-nowrap">
                        {alert.title}
                      </span>
                      {alert.description && (
                        <span className="text-sm opacity-90 truncate">
                          {alert.description}
                        </span>
                      )}
                    </div>
                  </div>
                  {content.settings.dismissible && (
                    <button
                      type="button"
                      onClick={() => handleDismiss(alert)}
                      className="absolute top-1 right-1 p-1 rounded-md hover:bg-white/20 transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
      {/* Dot indicators */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {visibleAlerts.map((alert, index) => (
          <button
            type="button"
            key={alert.id}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-opacity",
              index === currentIndex ? "bg-white/90" : "bg-white/40",
            )}
            aria-label={`Go to alert ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
