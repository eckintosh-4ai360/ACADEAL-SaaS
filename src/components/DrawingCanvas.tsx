"use client";

import { useRef, useEffect, useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Download,
  Pipette,
  PenTool,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DrawingCanvasProps = {
  onSave: (imageData: string) => void;
  onClose: () => void;
};

const BRUSH_SIZES = [2, 4, 8, 12, 16, 20];
const COLORS = [
  "#000000", // Black
  "#FFFFFF", // White
  "#FF0000", // Red
  "#00FF00", // Green
  "#0000FF", // Blue
  "#FFFF00", // Yellow
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#FFA500", // Orange
  "#800080", // Purple
  "#FFC0CB", // Pink
  "#A52A2A", // Brown
];

export function DrawingCanvas({ onSave, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState("#000000");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Fill with white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `drawing-${Date.now()}.png`;
    link.click();
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL("image/png");
    onSave(imageData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-4xl border-border/50">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-black tracking-tight">
              Drawing Canvas
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
            {/* Brush Size */}
            <div className="flex items-center gap-2">
              <PenTool className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1">
                {BRUSH_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={cn(
                      "h-9 w-9 rounded-lg border border-border/60 transition-colors",
                      brushSize === size
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-background hover:bg-muted"
                    )}
                    title={`Brush size: ${size}px`}
                  >
                    <div
                      className="mx-auto rounded-full bg-current"
                      style={{
                        width: Math.max(size / 2, 2),
                        height: Math.max(size / 2, 2),
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div className="relative flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                className="h-9 w-9 rounded-lg border-2 transition-all"
                style={{
                  backgroundColor: brushColor,
                  borderColor: isColorPickerOpen ? "#3b82f6" : "var(--border)",
                }}
                title="Current color"
              />

              {isColorPickerOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 grid w-48 grid-cols-4 gap-2 rounded-2xl border border-border/60 bg-background p-3 shadow-lg">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setBrushColor(color);
                        setIsColorPickerOpen(false);
                      }}
                      className={cn(
                        "h-8 w-8 rounded-lg border-2 transition-all",
                        brushColor === color
                          ? "border-primary scale-110"
                          : "border-border/60 hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="col-span-4 h-8 cursor-pointer rounded-lg border border-border/60"
                    title="Custom color"
                  />
                </div>
              )}
            </div>

            <div className="h-9 w-px bg-border/80" />

            {/* Clear Canvas */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearCanvas}
              className="gap-2"
              title="Clear canvas"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>

            {/* Download */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={downloadDrawing}
              className="gap-2"
              title="Download drawing"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>

            {/* Save to Note */}
            <Button
              type="button"
              onClick={saveDrawing}
              className="gap-2"
              title="Insert drawing into note"
            >
              <Plus className="h-4 w-4" />
              Insert to Note
            </Button>
          </div>

          {/* Canvas */}
          <div className="rounded-2xl border-2 border-border/60 bg-white shadow-sm overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full cursor-crosshair"
              style={{ minHeight: "500px", display: "block" }}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Click and drag to draw. Choose brush size and colors from the toolbar above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
