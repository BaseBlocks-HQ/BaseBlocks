import type { SVGProps } from "react";

export function FormsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      fill="none"
      {...props}
    >
      <path
        d="M16.25,12v.75c0,1.105-.895,2-2,2H3.75c-1.105,0-2-.895-2-2v-.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M1.75,6v-.75c0-1.105,.895-2,2-2H14.25c1.105,0,2,.895,2,2v.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <polyline
        points="11.798 12.25 9.068 5.75 8.932 5.75 6.202 12.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <line
        x1="6.832"
        y1="10.75"
        x2="11.168"
        y2="10.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle cx="1.75" cy="9" r=".75" fill="currentColor" />
      <circle cx="16.25" cy="9" r=".75" fill="currentColor" />
    </svg>
  );
}
