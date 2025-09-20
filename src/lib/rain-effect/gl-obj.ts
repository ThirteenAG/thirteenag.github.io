import type { UniformType } from "./webgl";
import * as WebGLUtils from "./webgl";

export default class GL {
    canvas!: HTMLCanvasElement;
    gl!: WebGLRenderingContext;
    program!: WebGLProgram;
    width = 0;
    height = 0;

    constructor(canvas: HTMLCanvasElement, options: WebGLContextAttributes = {}, vert: string, frag: string) {
        this.init(canvas, options, vert, frag);
    }

    init(canvas: HTMLCanvasElement, options: WebGLContextAttributes = {}, vert: string, frag: string): void {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;

        const gl = WebGLUtils.getContext(canvas, options);
        if (!gl) {
            throw new Error("WebGL context not available");
        }
        this.gl = gl;

        const program = this.createProgram(vert, frag);
        if (!program) {
            throw new Error("Failed to create WebGL program");
        }
        this.useProgram(program);
    }

    createProgram(vert: string, frag: string): WebGLProgram | null {
        const program = WebGLUtils.createProgram(this.gl, vert, frag);
        return program;
    }

    useProgram(program: WebGLProgram): void {
        this.program = program;
        this.gl.useProgram(program);
    }

    createTexture(source: TexImageSource | null, i: number): WebGLTexture {
        // WebGLUtils.createTexture tolerates null sources at runtime; cast for TS.
        return WebGLUtils.createTexture(this.gl, source, i);
    }

    createUniform(type: UniformType, name: string, ...v: Array<number | boolean | Float32List | Int32List>): void {
        WebGLUtils.createUniform(this.gl, this.program, type, name, ...v);
    }

    activeTexture(i: number): void {
        WebGLUtils.activeTexture(this.gl, i);
    }

    updateTexture(source: TexImageSource): void {
        WebGLUtils.updateTexture(this.gl, source);
    }

    draw(): void {
        WebGLUtils.setRectangle(this.gl, -1, -1, 2, 2);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}