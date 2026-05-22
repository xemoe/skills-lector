"use client";

import { useEffect, useRef } from "react";

type RGB = [number, number, number];

/** Gradient stops sweeping purple -> blue -> cyan -> warm, echoing the app palette. */
const LIGHT_STOPS: RGB[] = [
    [146, 118, 212],
    [112, 152, 218],
    [104, 190, 194],
    [224, 188, 110],
];

const DARK_STOPS: RGB[] = [
    [78, 62, 118],
    [52, 78, 122],
    [44, 88, 98],
    [100, 86, 54],
];

interface MeshPoint {
    baseX: number;
    baseY: number;
    x: number;
    y: number;
    ampX: number;
    ampY: number;
    phaseX: number;
    phaseY: number;
    speedX: number;
    speedY: number;
    pinned: boolean;
}

interface MeshTriangle {
    a: number;
    b: number;
    c: number;
    gradT: number;
    shade: number;
    color: string;
}

interface Mesh {
    points: MeshPoint[];
    triangles: MeshTriangle[];
}

function rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function sampleGradient(stops: RGB[], t: number): RGB {
    const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    const f = x - i;
    const a = stops[i];
    const b = stops[i + 1];
    return [
        a[0] + (b[0] - a[0]) * f,
        a[1] + (b[1] - a[1]) * f,
        a[2] + (b[2] - a[2]) * f,
    ];
}

function triangleColor(stops: RGB[], gradT: number, shade: number): string {
    const [r, g, b] = sampleGradient(stops, gradT);
    const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + shade)));
    return `rgb(${ch(r)}, ${ch(g)}, ${ch(b)})`;
}

/** Jittered triangle grid; edge points stay pinned so the mesh fully covers the area. */
function buildMesh(width: number, height: number): Mesh {
    const cell = rand(104, 152);
    const cols = Math.max(2, Math.ceil(width / cell) + 1);
    const rows = Math.max(2, Math.ceil(height / cell) + 1);
    const stepX = width / (cols - 1);
    const stepY = height / (rows - 1);
    const jitterX = stepX * 0.42;
    const jitterY = stepY * 0.42;

    const points: MeshPoint[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const onLeft = c === 0;
            const onRight = c === cols - 1;
            const onTop = r === 0;
            const onBottom = r === rows - 1;
            const pinned = onLeft || onRight || onTop || onBottom;

            let bx = c * stepX;
            let by = r * stepY;
            if (!onLeft && !onRight) bx += rand(-jitterX, jitterX);
            if (!onTop && !onBottom) by += rand(-jitterY, jitterY);
            if (onLeft) bx = 0;
            if (onRight) bx = width;
            if (onTop) by = 0;
            if (onBottom) by = height;

            points.push({
                baseX: bx,
                baseY: by,
                x: bx,
                y: by,
                ampX: pinned ? 0 : stepX * 0.15,
                ampY: pinned ? 0 : stepY * 0.15,
                phaseX: rand(0, Math.PI * 2),
                phaseY: rand(0, Math.PI * 2),
                speedX: rand(0.26, 0.58),
                speedY: rand(0.26, 0.58),
                pinned,
            });
        }
    }

    const triangles: MeshTriangle[] = [];
    const at = (r: number, c: number) => r * cols + c;
    for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
            const tl = at(r, c);
            const tr = at(r, c + 1);
            const bl = at(r + 1, c);
            const br = at(r + 1, c + 1);
            const quad: Array<[number, number, number]> =
                Math.random() < 0.5
                    ? [
                          [tl, tr, bl],
                          [tr, br, bl],
                      ]
                    : [
                          [tl, tr, br],
                          [tl, br, bl],
                      ];
            for (const [a, b, c2] of quad) {
                const cx =
                    (points[a].baseX + points[b].baseX + points[c2].baseX) / 3;
                const cy =
                    (points[a].baseY + points[b].baseY + points[c2].baseY) / 3;
                triangles.push({
                    a,
                    b,
                    c: c2,
                    gradT: (cx / width) * 0.55 + (cy / height) * 0.45,
                    shade: rand(-13, 13),
                    color: "",
                });
            }
        }
    }

    return { points, triangles };
}

function recolor(mesh: Mesh, stops: RGB[]): void {
    for (const tri of mesh.triangles) {
        tri.color = triangleColor(stops, tri.gradT, tri.shade);
    }
}

function draw(
    ctx: CanvasRenderingContext2D,
    mesh: Mesh,
    width: number,
    height: number,
): void {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    for (const tri of mesh.triangles) {
        const a = mesh.points[tri.a];
        const b = mesh.points[tri.b];
        const c = mesh.points[tri.c];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.closePath();
        ctx.fillStyle = tri.color;
        // Stroke in the fill colour to hide hairline seams between triangles.
        ctx.strokeStyle = tri.color;
        ctx.fill();
        ctx.stroke();
    }
}

/**
 * Full-viewport low-poly backdrop on a fixed canvas. The mesh is regenerated on
 * resize, recoloured when the light/dark theme changes, and drifts slowly unless
 * the user prefers reduced motion.
 */
export function LowPolyBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let mesh: Mesh = { points: [], triangles: [] };
        let width = 0;
        let height = 0;
        let rafId = 0;
        let resizeTimer = 0;
        let lastFrame = 0;
        let revealed = false;

        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        );

        const activeStops = (): RGB[] =>
            document.documentElement.classList.contains("dark")
                ? DARK_STOPS
                : LIGHT_STOPS;

        const render = (): void => {
            draw(ctx, mesh, width, height);
            if (!revealed) {
                revealed = true;
                canvas.style.opacity = "1";
            }
        };

        const setup = (): void => {
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            mesh = buildMesh(width, height);
            recolor(mesh, activeStops());
            render();
        };

        const animate = (now: number): void => {
            rafId = requestAnimationFrame(animate);
            if (now - lastFrame < 1000 / 30) return;
            lastFrame = now;
            const time = now / 1000;
            for (const p of mesh.points) {
                if (p.pinned) continue;
                p.x = p.baseX + Math.sin(time * p.speedX + p.phaseX) * p.ampX;
                p.y = p.baseY + Math.cos(time * p.speedY + p.phaseY) * p.ampY;
            }
            render();
        };

        const start = (): void => {
            if (rafId || reduceMotion.matches) return;
            lastFrame = 0;
            rafId = requestAnimationFrame(animate);
        };

        const stop = (): void => {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            }
        };

        const onResize = (): void => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                setup();
                if (!document.hidden) start();
            }, 160);
        };

        const onVisibility = (): void => {
            if (document.hidden) stop();
            else start();
        };

        const onThemeChange = (): void => {
            recolor(mesh, activeStops());
            if (!rafId) render();
        };

        const onMotionChange = (): void => {
            if (reduceMotion.matches) stop();
            else if (!document.hidden) start();
        };

        setup();
        start();

        window.addEventListener("resize", onResize);
        document.addEventListener("visibilitychange", onVisibility);
        reduceMotion.addEventListener("change", onMotionChange);
        const themeObserver = new MutationObserver(onThemeChange);
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => {
            stop();
            window.clearTimeout(resizeTimer);
            window.removeEventListener("resize", onResize);
            document.removeEventListener("visibilitychange", onVisibility);
            reduceMotion.removeEventListener("change", onMotionChange);
            themeObserver.disconnect();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-0 transition-opacity duration-700"
        />
    );
}
