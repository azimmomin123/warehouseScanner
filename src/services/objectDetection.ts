import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { v4 as uuidv4 } from 'uuid';
import { BoundingBox, Detection, ObjectTemplate } from '../types';

// Shape detection using image processing (for circles/pipes and rectangles/boxes)
interface ShapeDetectionResult {
  type: 'circle' | 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

class ObjectDetectionService {
  private model: cocoSsd.ObjectDetection | null = null;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.model) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this._loadModel();
    return this.loadPromise;
  }

  private async _loadModel(): Promise<void> {
    try {
      this.isLoading = true;

      // Set backend to WebGL for better performance
      await tf.setBackend('webgl');
      await tf.ready();

      // Load COCO-SSD model (lightweight, works offline once cached)
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2', // Smaller model for mobile devices
      });

      console.log('Object detection model loaded successfully');
    } catch (error) {
      console.error('Failed to load object detection model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  isReady(): boolean {
    return this.model !== null && !this.isLoading;
  }

  async detectObjects(
    imageData: ImageData,
    template: ObjectTemplate,
    confidenceThreshold: number = 0.5
  ): Promise<Detection[]> {
    const frameId = uuidv4();
    const timestamp = Date.now();

    if (template === 'custom' && this.model) {
      // Use COCO-SSD for general object detection
      return this.detectWithCocoSsd(imageData, frameId, timestamp, confidenceThreshold);
    } else {
      // Use shape detection for circles/rectangles
      return this.detectShapes(imageData, template, frameId, timestamp, confidenceThreshold);
    }
  }

  private async detectWithCocoSsd(
    imageData: ImageData,
    frameId: string,
    timestamp: number,
    confidenceThreshold: number
  ): Promise<Detection[]> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    // Create a temporary canvas for the image
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    ctx.putImageData(imageData, 0, 0);

    // Run detection
    const predictions = await this.model.detect(canvas);

    return predictions
      .filter((pred) => pred.score >= confidenceThreshold)
      .map((pred) => ({
        id: uuidv4(),
        boundingBox: {
          id: uuidv4(),
          x: pred.bbox[0],
          y: pred.bbox[1],
          width: pred.bbox[2],
          height: pred.bbox[3],
          confidence: pred.score,
          label: pred.class,
          isManuallyAdded: false,
          isRemoved: false,
        },
        timestamp,
        frameId,
      }));
  }

  private async detectShapes(
    imageData: ImageData,
    template: ObjectTemplate,
    frameId: string,
    timestamp: number,
    confidenceThreshold: number
  ): Promise<Detection[]> {
    const shapes = await this.processImageForShapes(imageData, template);

    return shapes
      .filter((shape) => shape.confidence >= confidenceThreshold)
      .map((shape) => ({
        id: uuidv4(),
        boundingBox: {
          id: uuidv4(),
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          confidence: shape.confidence,
          label: template === 'circles' ? 'pipe/circle' : 'box/rectangle',
          isManuallyAdded: false,
          isRemoved: false,
        },
        timestamp,
        frameId,
      }));
  }

  private async processImageForShapes(
    imageData: ImageData,
    template: ObjectTemplate
  ): Promise<ShapeDetectionResult[]> {
    const { width, height, data } = imageData;
    const shapes: ShapeDetectionResult[] = [];

    // Convert to grayscale
    const grayscale = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }

    // Apply edge detection (Sobel operator)
    const edges = this.sobelEdgeDetection(grayscale, width, height);

    // Apply adaptive thresholding
    const binary = this.adaptiveThreshold(edges, width, height);

    // Find contours and detect shapes
    const contours = this.findContours(binary, width, height);

    for (const contour of contours) {
      if (template === 'circles') {
        const circle = this.fitCircle(contour);
        if (circle && circle.confidence > 0.5) {
          shapes.push({
            type: 'circle',
            x: circle.x - circle.radius,
            y: circle.y - circle.radius,
            width: circle.radius * 2,
            height: circle.radius * 2,
            confidence: circle.confidence,
          });
        }
      } else if (template === 'rectangles') {
        const rect = this.fitRectangle(contour);
        if (rect && rect.confidence > 0.5) {
          shapes.push({
            type: 'rectangle',
            ...rect,
          });
        }
      }
    }

    // Remove overlapping detections
    return this.nonMaxSuppression(shapes, 0.3);
  }

  private sobelEdgeDetection(
    grayscale: Uint8Array,
    width: number,
    height: number
  ): Uint8Array {
    const edges = new Uint8Array(width * height);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            gx += grayscale[idx] * sobelX[kernelIdx];
            gy += grayscale[idx] * sobelY[kernelIdx];
          }
        }

        edges[y * width + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      }
    }

    return edges;
  }

  private adaptiveThreshold(
    edges: Uint8Array,
    width: number,
    height: number
  ): Uint8Array {
    const binary = new Uint8Array(width * height);
    const blockSize = 15;
    const C = 5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;

        for (let dy = -blockSize; dy <= blockSize; dy++) {
          for (let dx = -blockSize; dx <= blockSize; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              sum += edges[ny * width + nx];
              count++;
            }
          }
        }

        const mean = sum / count;
        binary[y * width + x] = edges[y * width + x] > mean - C ? 255 : 0;
      }
    }

    return binary;
  }

  private findContours(
    binary: Uint8Array,
    width: number,
    height: number
  ): Array<Array<{ x: number; y: number }>> {
    const visited = new Set<number>();
    const contours: Array<Array<{ x: number; y: number }>> = [];
    const minContourSize = 20;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (binary[idx] === 255 && !visited.has(idx)) {
          const contour = this.traceContour(binary, width, height, x, y, visited);
          if (contour.length >= minContourSize) {
            contours.push(contour);
          }
        }
      }
    }

    return contours;
  }

  private traceContour(
    binary: Uint8Array,
    width: number,
    height: number,
    startX: number,
    startY: number,
    visited: Set<number>
  ): Array<{ x: number; y: number }> {
    const contour: Array<{ x: number; y: number }> = [];
    const stack = [{ x: startX, y: startY }];
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (stack.length > 0 && contour.length < 1000) {
      const { x, y } = stack.pop()!;
      const idx = y * width + x;

      if (visited.has(idx)) continue;
      visited.add(idx);

      if (binary[idx] === 255) {
        contour.push({ x, y });

        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = ny * width + nx;
            if (!visited.has(nidx) && binary[nidx] === 255) {
              stack.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    return contour;
  }

  private fitCircle(
    contour: Array<{ x: number; y: number }>
  ): { x: number; y: number; radius: number; confidence: number } | null {
    if (contour.length < 10) return null;

    // Calculate centroid
    let cx = 0;
    let cy = 0;
    for (const p of contour) {
      cx += p.x;
      cy += p.y;
    }
    cx /= contour.length;
    cy /= contour.length;

    // Calculate average radius and variance
    let avgRadius = 0;
    const radii: number[] = [];
    for (const p of contour) {
      const r = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      radii.push(r);
      avgRadius += r;
    }
    avgRadius /= contour.length;

    // Skip if radius is too small
    if (avgRadius < 10) return null;

    // Calculate circularity (how close to a perfect circle)
    let variance = 0;
    for (const r of radii) {
      variance += (r - avgRadius) ** 2;
    }
    variance = Math.sqrt(variance / radii.length);

    // Confidence based on circularity
    const confidence = Math.max(0, 1 - variance / avgRadius);

    return { x: cx, y: cy, radius: avgRadius, confidence };
  }

  private fitRectangle(
    contour: Array<{ x: number; y: number }>
  ): { x: number; y: number; width: number; height: number; confidence: number } | null {
    if (contour.length < 4) return null;

    // Find bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of contour) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const width = maxX - minX;
    const height = maxY - minY;

    // Skip if too small
    if (width < 20 || height < 20) return null;

    // Calculate rectangularity
    const expectedArea = width * height;
    const actualPoints = contour.length;
    const expectedPerimeter = 2 * (width + height);

    // Rough confidence based on how well points fill the perimeter
    const perimeterRatio = actualPoints / expectedPerimeter;
    const confidence = Math.min(1, perimeterRatio * 0.5 + 0.3);

    return { x: minX, y: minY, width, height, confidence };
  }

  private nonMaxSuppression(
    shapes: ShapeDetectionResult[],
    iouThreshold: number
  ): ShapeDetectionResult[] {
    if (shapes.length === 0) return [];

    // Sort by confidence descending
    shapes.sort((a, b) => b.confidence - a.confidence);

    const keep: ShapeDetectionResult[] = [];

    for (const shape of shapes) {
      let shouldKeep = true;

      for (const kept of keep) {
        const iou = this.calculateIoU(shape, kept);
        if (iou > iouThreshold) {
          shouldKeep = false;
          break;
        }
      }

      if (shouldKeep) {
        keep.push(shape);
      }
    }

    return keep;
  }

  private calculateIoU(a: ShapeDetectionResult, b: ShapeDetectionResult): number {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);

    if (x2 < x1 || y2 < y1) return 0;

    const intersection = (x2 - x1) * (y2 - y1);
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    const union = areaA + areaB - intersection;

    return intersection / union;
  }

  dispose(): void {
    if (this.model) {
      this.model = null;
    }
  }
}

// Singleton instance
export const objectDetectionService = new ObjectDetectionService();
