"use client";

import { useId } from "react";

/**
 * Canje en bares y cafeterías: se sirve un café en una taza (diseño POINT, fase canje café).
 * Colores del local: --marca-texto (taza y vapor, sobre el fondo de la marca), --marca-acento (café).
 * Keyframes en globals.css (ptCafe*), con versión quieta para "reducir movimiento".
 */
export function CafeCanje({ tamaño = 190 }: { tamaño?: number }) {
  const id = useId().replace(/:/g, "");
  const clip = `pt-cafe-clip-${id}`;
  const taza = "M92 145 H192 C201 145 208 152 208 161 V197 C208 210 197 221 184 221 H106 C93 221 82 210 82 197 V161 C82 152 89 145 92 145 Z";
  const trazo = { stroke: "var(--marca-texto)", strokeWidth: 8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg className="pt-cafe-svg" viewBox="0 0 300 300" width={tamaño} height={tamaño} role="img" aria-label="Café servido">
      <defs>
        <clipPath id={clip}>
          <path d={taza} />
        </clipPath>
      </defs>
      <ellipse cx="150" cy="232" rx="68" ry="11" style={{ fill: "#000", opacity: 0.18 }} />

      <g className="pt-cafe-taza">
        {/* Vidrio: se ve el café que sube */}
        <path d={taza} style={{ fill: "var(--marca-texto)", fillOpacity: 0.14 }} />
        <g clipPath={`url(#${clip})`}>
          <rect className="pt-cafe-liquido" x="80" y="150" width="130" height="90" style={{ fill: "var(--marca-acento)" }} />
          <ellipse className="pt-cafe-superficie" cx="145" cy="156" rx="62" ry="9" style={{ fill: "color-mix(in oklab, var(--marca-acento), white 22%)" }} />
          <circle className="pt-cafe-plic" cx="142" cy="164" r="3" style={{ fill: "none", stroke: "var(--marca-texto)", strokeWidth: 2.5, opacity: 0 }} />
        </g>
        <path d={taza} style={{ fill: "none", ...trazo }} />
        <path d="M208 160 C226 158 236 169 236 183 C236 197 227 208 211 207" style={{ fill: "none", ...trazo }} />
        <ellipse cx="145" cy="145" rx="63" ry="9" style={{ fill: "none", ...trazo, strokeWidth: 6 }} />
        <path d="M82 230 H208" style={{ fill: "none", ...trazo }} />
      </g>

      <g className="pt-cafe-chorro">
        <path d="M173 63 C173 92 165 112 153 130 C147 139 143 147 142 160" style={{ fill: "none", stroke: "var(--marca-acento)", strokeWidth: 8, strokeLinecap: "round" }} />
      </g>

      <g className="pt-cafe-gota">
        <path d="M142 143 C146 149 148 153 148 157 C148 161 145 164 142 164 C139 164 136 161 136 157 C136 153 138 149 142 143 Z" style={{ fill: "var(--marca-acento)" }} />
      </g>

      <g className="pt-cafe-jarra">
        <path d="M0 0 C7 -8 17 -12 28 -12 H70 C86 -12 98 -1 98 15 V46 C98 59 87 70 74 70 H24 C11 70 0 59 0 46 Z" style={{ fill: "var(--marca-texto)" }} />
        <path d="M10 12 H86" style={{ fill: "none", stroke: "var(--marca-acento)", strokeWidth: 8, strokeLinecap: "round" }} />
        <path d="M98 25 C114 25 122 32 122 42 C122 52 114 58 100 57" style={{ fill: "none", ...trazo }} />
        <path d="M38 -12 V-22 C38 -29 44 -34 50 -34 C56 -34 62 -29 62 -22 V-12" style={{ fill: "none", ...trazo }} />
        <path d="M-8 28 C-14 28 -18 31 -20 35 C-22 39 -22 43 -22 48 C-22 48 -15 44 -7 42" style={{ fill: "var(--marca-texto)", ...trazo }} />
      </g>

      {[
        "M116 132 C109 121 126 117 119 104 C114 96 116 88 123 80",
        "M142 128 C135 116 152 112 145 99 C140 91 142 83 149 74",
        "M168 132 C161 121 178 117 171 104 C166 96 168 88 175 80",
      ].map((d, i) => (
        <g key={i} className={`pt-cafe-vapor pt-cafe-vapor-${i + 1}`}>
          <path d={d} style={{ fill: "none", stroke: "var(--marca-texto)", strokeWidth: 5, strokeLinecap: "round" }} />
        </g>
      ))}
    </svg>
  );
}
