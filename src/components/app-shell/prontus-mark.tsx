import { useId } from "react";

/*
 * Símbolo do Prontus: um "P" em contorno que também é uma ficha (linhas),
 * cortado por um check. O degradê usa --logo-from/--logo-to, que mudam
 * com o tema (globals.css).
 */
const P_OUTLINE = "M18 18H312A209 209 0 0 1 312 436H205V608H18Z";
const CHECK = "M182 240L264 333L514 67";
const STRIPES_Y = [100, 185, 270, 354];

export function ProntusMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const grad = `${id}-grad`;
  const knock = `${id}-knock`;
  const bowl = `${id}-bowl`;

  return (
    <svg
      viewBox="-52 -7 640 640"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient
          id={grad}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="536"
          y2="627"
        >
          <stop offset="0.25" style={{ stopColor: "var(--logo-from)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-to)" }} />
        </linearGradient>
        {/* Abre o espaço em volta do check */}
        <mask id={knock} maskUnits="userSpaceOnUse">
          <rect x="-52" y="-7" width="640" height="640" fill="white" />
          <path d={CHECK} stroke="black" strokeWidth="85" fill="none" />
          <path d="M190 230L264 333L350 240Z" fill="black" />
        </mask>
        {/* Linhas internas terminam acompanhando a curva do P */}
        <clipPath id={bowl}>
          <rect x="79" y="0" width="233" height="460" />
          <circle cx="312" cy="227" r="152" />
        </clipPath>
      </defs>

      <g stroke={`url(#${grad})`} strokeWidth="37" fill="none">
        <g mask={`url(#${knock})`}>
          <path d={P_OUTLINE} />
          <g clipPath={`url(#${bowl})`}>
            {STRIPES_Y.map((y) => (
              <path key={y} d={`M79 ${y}H480`} />
            ))}
          </g>
          <path d="M79 437H205M79 525H205" />
        </g>
        <path d={CHECK} />
      </g>
    </svg>
  );
}
