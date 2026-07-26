const columns = [
  { height: 323, x: -16 },
  { height: 404, x: 125 },
  { height: 478, x: 266 },
  { height: 530, x: 407 },
  { height: 584, x: 549 },
  { height: 530, x: 689 },
  { height: 478, x: 831 },
  { height: 404, x: 972 },
  { height: 323, x: 1113 },
] as const;

export function FooterGradient() {
  return (
    <svg
      aria-hidden="true"
      className="landing-footer-gradient-art"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 1271 614"
    >
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          height="690"
          id="landing-footer-column-blur"
          width="1371"
          x="-50"
          y="-38"
        >
          <feGaussianBlur stdDeviation="15" />
        </filter>
        <linearGradient
          id="landing-footer-column-fill"
          x1="0"
          x2="0"
          y1="1"
          y2="0"
        >
          <stop stopColor="var(--landing-footer-core)" />
          <stop
            offset="0.46"
            stopColor="var(--landing-footer-mid)"
            stopOpacity="0.98"
          />
          <stop
            offset="0.78"
            stopColor="var(--landing-footer-mist)"
            stopOpacity="0.68"
          />
          <stop
            offset="1"
            stopColor="var(--landing-footer-mist)"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      <g filter="url(#landing-footer-column-blur)">
        {columns.map((column) => (
          <rect
            fill="url(#landing-footer-column-fill)"
            height={column.height}
            key={column.x}
            width="174"
            x={column.x}
            y={614 - column.height}
          />
        ))}
      </g>
    </svg>
  );
}
