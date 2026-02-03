import type { SVGProps } from "react";

export function PagesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      fill="none"
      {...props}
    >
      <line
        x1="5.75"
        y1="6.75"
        x2="7.75"
        y2="6.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <line
        x1="5.75"
        y1="9.75"
        x2="12.25"
        y2="9.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <line
        x1="5.75"
        y1="12.75"
        x2="12.25"
        y2="12.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M2.75,14.25V3.75c0-1.105,.895-2,2-2h5.586c.265,0,.52,.105,.707,.293l3.914,3.914c.188,.188,.293,.442,.293,.707v7.586c0,1.105-.895,2-2,2H4.75c-1.105,0-2-.895-2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M15.16,6.25h-3.41c-.552,0-1-.448-1-1V1.852"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
