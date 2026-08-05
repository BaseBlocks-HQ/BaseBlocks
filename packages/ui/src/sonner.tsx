"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert01Icon,
  CheckmarkCircle01Icon,
  InformationCircleIcon,
  OctagonIcon,
} from "@hugeicons/core-free-icons";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Spinner } from "./spinner";

const Toaster = ({ theme = "system", ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-4" />
        ),
        info: <HugeiconsIcon icon={InformationCircleIcon} className="size-4" />,
        warning: <HugeiconsIcon icon={Alert01Icon} className="size-4" />,
        error: <HugeiconsIcon icon={OctagonIcon} className="size-4" />,
        loading: <Spinner className="size-4" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
