import { cn } from "@/lib/utils";

/**
 * WaveSpinner — a faithful React port of the spinner from spinner-grid.html.
 *
 * An N×N grid of dots animated by one shared keyframe (`wave-spinner` in
 * globals.css, identical values to the original `waveAnimation`). Each dot's
 * grid position maps to a phase in [0,1] via {@link phase}; that phase becomes
 * a negative `animation-delay` so the grid loads mid-motion and loops
 * seamlessly. Color is interpolated across the palette by that same phase
 * (the original's "gradient" mix mode — deterministic, so it is SSR-safe), and
 * each dot carries the original neon glow `box-shadow`. A blurred backdrop glow
 * sits behind the grid, exactly like the original `.stage > .glow`.
 *
 * Pure render — no state — safe in server or client components. The motion is
 * always on (matching the original file — no reduced-motion gating).
 */

// Must match the duration in the `wave-spinner` keyframe (globals.css).
const DURATION_S = 1.4;

// The original spinner-grid.html default selection (cyan / amber / rose).
const DEFAULT_COLORS = ["#00ffff", "#ffaa00", "#ff0080"];

export type WaveSpinnerPattern =
    | "waveLR"
    | "waveRL"
    | "waveTB"
    | "waveBT"
    | "diagTL"
    | "diagBR"
    | "rippleOut"
    | "rippleIn"
    | "sweep"
    | "spiralOut"
    | "spiralIn"
    | "pinwheel"
    | "cross"
    | "checker"
    | "pulse"
    | "sparkle";

const frac = (x: number): number => x - Math.floor(x);

/** Map a dot at (row, col) in an N×N grid to a phase in [0, 1]. */
function phase(row: number, col: number, n: number, type: WaveSpinnerPattern): number {
    const m = n - 1;
    const cx = m / 2;
    const cy = m / 2;
    const dx = col - cx;
    const dy = row - cy;
    const dist = Math.hypot(dx, dy);
    const maxDist = Math.hypot(cx, cy) || 1;
    const rad = dist / maxDist; // 0 center -> 1 edge
    const ang = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI); // 0..1 around circle
    switch (type) {
        case "waveLR":
            return m ? col / m : 0;
        case "waveRL":
            return m ? (m - col) / m : 0;
        case "waveTB":
            return m ? row / m : 0;
        case "waveBT":
            return m ? (m - row) / m : 0;
        case "diagTL":
            return (row + col) / (2 * m || 1);
        case "diagBR":
            return (m - row + (m - col)) / (2 * m || 1);
        case "rippleOut":
            return rad;
        case "rippleIn":
            return 1 - rad;
        case "sweep":
            return ang;
        case "spiralOut":
            return frac(ang + rad);
        case "spiralIn":
            return frac(ang + (1 - rad));
        case "pinwheel":
            return frac(ang * 3);
        case "cross":
            return Math.min(Math.abs(dx), Math.abs(dy)) / (m / 2 || 1);
        case "checker":
            return (row + col) % 2 ? 0.5 : 0;
        case "pulse":
            return 0;
        case "sparkle":
            return frac(Math.sin(row * 12.9898 + col * 78.233) * 43758.5453);
        default:
            return 0;
    }
}

// --- color helpers (ported verbatim from spinner-grid.html) ---
function hexToRgb(h: string): { r: number; g: number; b: number } {
    const n = parseInt(h.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}
function lerpColor(stops: string[], t: number): string {
    if (stops.length === 1) return stops[0];
    const tt = Math.min(1, Math.max(0, t));
    const seg = tt * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(seg));
    const f = seg - i;
    const a = hexToRgb(stops[i]);
    const b = hexToRgb(stops[i + 1]);
    return rgbToHex(a.r + (b.r - a.r) * f, a.g + (b.g - a.g) * f, a.b + (b.b - a.b) * f);
}

interface WaveSpinnerProps {
    /** Motion pattern. Defaults to "sweep" (radar-style). */
    pattern?: WaveSpinnerPattern;
    /** Grid dimension — renders `size × size` dots. Defaults to 5. */
    size?: number;
    /** Overall footprint in px. Defaults to 112 (the original's footprint). */
    box?: number;
    /** Palette interpolated across the grid by phase. Defaults to cyan/amber/rose. */
    colors?: string[];
    /** Extra classes on the stage container. */
    className?: string;
}

export function WaveSpinner({
    pattern = "sweep",
    size = 5,
    box = 112,
    colors = DEFAULT_COLORS,
    className,
}: WaveSpinnerProps) {
    const n = Math.max(2, Math.floor(size));
    const cell = box / n;
    const dot = cell * 0.72;
    const gap = cell * 0.28;
    const stops = colors.length ? colors : ["#00ffff"];
    const glowBg =
        stops.length === 1 ? stops[0] : `linear-gradient(135deg, ${stops.join(", ")})`;

    return (
        <div
            role="presentation"
            aria-hidden
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: `${box}px`, height: `${box}px` }}
        >
            {/* Blurred backdrop glow — the original .stage > .glow */}
            <span
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{ background: glowBg, filter: "blur(38px)", opacity: 0.3 }}
            />
            <div
                className="relative grid place-content-center"
                style={{
                    gridTemplateColumns: `repeat(${n}, ${dot.toFixed(2)}px)`,
                    gap: `${gap.toFixed(2)}px`,
                }}
            >
                {Array.from({ length: n * n }, (_, i) => {
                    const row = Math.floor(i / n);
                    const col = i % n;
                    const ph = phase(row, col, n, pattern);
                    const hex = lerpColor(stops, ph);
                    const delay = -(ph * DURATION_S);
                    return (
                        <span
                            key={i}
                            className="wave-spinner-dot block"
                            style={{
                                width: `${dot.toFixed(2)}px`,
                                height: `${dot.toFixed(2)}px`,
                                borderRadius: "22%",
                                backgroundColor: hex,
                                boxShadow: `0 0 8px ${hex}, 0 0 16px ${hex}80`,
                                animationDelay: `${delay.toFixed(3)}s`,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
