export default function createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas") as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;
    return canvas;
}