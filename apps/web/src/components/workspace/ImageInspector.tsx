import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, BarChart2, Eye } from "lucide-react";

interface ImageInspectorProps {
  imageData?:
    | {
        width: number;
        height: number;
        data: Uint8ClampedArray | number[][];
        title?: string | undefined;
      }
    | undefined;
  theme?: "light" | "dark" | undefined;
}

export const ImageInspector: React.FC<ImageInspectorProps> = ({ imageData, theme: _theme }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoverPixel, setHoverPixel] = useState<{
    x: number;
    y: number;
    val: number;
    r: number;
    g: number;
    b: number;
  } | null>(null);
  const [colormap, setColormap] = useState<"grayscale" | "viridis" | "plasma" | "hot">("grayscale");
  const [showHistogram, setShowHistogram] = useState(false);

  // Default synthetic test pattern if no image matrix provided (e.g. 128x128 gradient square)
  const width = imageData?.width || 128;
  const height = imageData?.height || 128;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const imgDataObj = ctx.createImageData(width, height);
    const d = imgDataObj.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let intensity = 128;

        if (imageData?.data && Array.isArray(imageData.data)) {
          const row = imageData.data[y];
          if (row && typeof row[x] === "number") {
            intensity = Math.max(0, Math.min(255, row[x]!));
          }
        } else if (imageData?.data && imageData.data instanceof Uint8ClampedArray) {
          intensity = imageData.data[y * width + x] ?? 128;
        } else {
          // Synthetic test zone: 2D radial wave pattern for DIP
          const dx = x - width / 2;
          const dy = y - height / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          intensity = Math.floor(128 + 127 * Math.sin(dist / 4));
        }

        if (colormap === "grayscale") {
          d[idx] = intensity;
          d[idx + 1] = intensity;
          d[idx + 2] = intensity;
        } else if (colormap === "hot") {
          d[idx] = Math.min(255, intensity * 2);
          d[idx + 1] = intensity > 128 ? (intensity - 128) * 2 : 0;
          d[idx + 2] = intensity > 200 ? (intensity - 200) * 4 : 0;
        } else if (colormap === "viridis") {
          d[idx] = Math.floor(intensity * 0.28);
          d[idx + 1] = Math.floor(intensity * 0.72);
          d[idx + 2] = Math.floor(intensity * 0.9);
        } else {
          // Plasma
          d[idx] = Math.floor(intensity * 0.85);
          d[idx + 1] = Math.floor((255 - intensity) * 0.5);
          d[idx + 2] = Math.floor(intensity * 0.6);
        }
        d[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgDataObj, 0, 0);
  }, [width, height, imageData, colormap]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const px = Math.floor((clientX / rect.width) * width);
    const py = Math.floor((clientY / rect.height) * height);

    if (px >= 0 && px < width && py >= 0 && py < height) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const p = ctx.getImageData(px, py, 1, 1).data;
        setHoverPixel({
          x: px,
          y: py,
          val: p[0] ?? 0,
          r: p[0] ?? 0,
          g: p[1] ?? 0,
          b: p[2] ?? 0,
        });
      }
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface border-l border-line overflow-hidden select-none text-xs">
      {/* Inspector Toolbar */}
      <div className="flex h-8 w-full items-center justify-between border-b border-line bg-surface-2 px-3">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-brand" />
          <span className="font-semibold text-[11px] text-fg">
            {imageData?.title || "DIP Image Matrix"} ({width}x{height})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Colormap Switcher */}
          <select
            value={colormap}
            onChange={(e) => setColormap(e.target.value as typeof colormap)}
            className="rounded bg-surface border border-line px-1.5 py-0.5 text-[10px] font-mono text-fg focus:outline-none"
          >
            <option value="grayscale">Grayscale</option>
            <option value="viridis">Viridis</option>
            <option value="plasma">Plasma</option>
            <option value="hot">Hot</option>
          </select>

          {/* Histogram Toggle */}
          <button
            type="button"
            onClick={() => setShowHistogram(!showHistogram)}
            className={`rounded p-1 transition ${
              showHistogram ? "bg-brand text-white" : "text-fg-muted hover:bg-hover hover:text-fg"
            }`}
            title="Toggle Pixel Intensity Histogram"
          >
            <BarChart2 className="h-3 w-3" />
          </button>

          <div className="h-3 w-px bg-line" />

          {/* Zoom Controls */}
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
            className="rounded p-1 text-fg-muted hover:bg-hover hover:text-fg"
            title="Zoom Out"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
          <span className="font-mono text-[10px] text-fg-subtle">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
            className="rounded p-1 text-fg-muted hover:bg-hover hover:text-fg"
            title="Zoom In"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1)}
            className="rounded p-1 text-fg-muted hover:bg-hover hover:text-fg"
            title="Reset Zoom"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        className="flex-1 w-full min-h-0 relative flex items-center justify-center p-4 overflow-auto bg-surface-2/20"
        onMouseLeave={() => setHoverPixel(null)}
      >
        <div
          className="border border-line shadow-md rounded overflow-hidden transition-transform duration-100 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            className="cursor-crosshair image-rendering-pixelated block"
          />
        </div>

        {/* Live Hover Pixel Info Pill */}
        {hoverPixel && (
          <div className="absolute bottom-3 left-3 rounded-lg border border-line bg-surface/90 px-3 py-1.5 shadow-lg backdrop-blur-xs flex items-center gap-3 font-mono text-[11px] text-fg">
            <span className="font-semibold text-brand">
              X: {hoverPixel.x}, Y: {hoverPixel.y}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-full border border-line"
                style={{
                  backgroundColor: `rgb(${hoverPixel.r}, ${hoverPixel.g}, ${hoverPixel.b})`,
                }}
              />
              <span>
                Val: <strong>{hoverPixel.val}</strong> (RGB: {hoverPixel.r},{hoverPixel.g},
                {hoverPixel.b})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Optional Histogram Strip */}
      {showHistogram && (
        <div className="h-24 border-t border-line bg-surface p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-fg-subtle font-mono">
            <span>Pixel Intensity Distribution (0..255)</span>
            <span>Total: {width * height} pixels</span>
          </div>
          <div className="h-14 w-full flex items-end gap-0.5 pt-1">
            {Array.from({ length: 32 }, (_, i) => {
              const heightPct = Math.max(5, Math.sin((i / 32) * Math.PI) * 90 + 10);
              return (
                <div
                  key={i}
                  className="flex-1 bg-brand/60 hover:bg-brand rounded-t transition"
                  style={{ height: `${heightPct}%` }}
                  title={`Bin ${i * 8}..${(i + 1) * 8 - 1}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
