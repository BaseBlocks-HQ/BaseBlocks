import type { SVGProps } from "react";

export function NavIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      fill="none"
      {...props}
    >
      <path
        d="M3.474,2.784L14.897,6.958c.481,.176,.467,.861-.021,1.018l-5.228,1.673-1.673,5.228c-.156,.488-.842,.502-1.018,.021L2.784,3.474c-.157-.43,.26-.847,.69-.69Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
