import createCanvas from "./create-canvas";
import GL from "./gl-obj";

// Import shaders as raw strings (using Vite)
import vertShader from "./shaders/simple.vert?raw";
import fragShader from "./shaders/water.frag?raw";

interface RainRendererOptions {
    renderShadow: boolean;
    minRefraction: number;
    maxRefraction: number;
    brightness: number;
    alphaMultiply: number;
    alphaSubtract: number;
    parallaxBg: number;
    parallaxFg: number;
}

const defaultOptions: RainRendererOptions = {
    renderShadow: false,
    minRefraction: 256,
    maxRefraction: 512,
    brightness: 1,
    alphaMultiply: 20,
    alphaSubtract: 5,
    parallaxBg: 5,
    parallaxFg: 20
}

export default class RainRenderer {
    canvas: HTMLCanvasElement;
    gl!: GL;
    canvasLiquid: HTMLCanvasElement;
    width = 0;
    height = 0;
    imageShine: ImageData | null = null;
    imageFg: HTMLCanvasElement;
    imageBg: HTMLCanvasElement;
    textures: { name: string; img: TexImageSource; }[] = [];
    programWater!: WebGLProgram;
    programBlurX = null;
    programBlurY = null;
    parallaxX = 0;
    parallaxY = 0;
    renderShadow = false;
    options: RainRendererOptions;

    constructor(
        canvas: HTMLCanvasElement,
        canvasLiquid: HTMLCanvasElement,
        imageFg: HTMLCanvasElement,
        imageBg: HTMLCanvasElement,
        imageShine: ImageData | null = null,
        options: Partial<RainRendererOptions> = {}
    ) {
        this.canvas = canvas;
        this.canvasLiquid = canvasLiquid;
        this.imageShine = imageShine;
        this.imageFg = imageFg;
        this.imageBg = imageBg;
        this.options = { ...defaultOptions, ...options };
        this.init();
    }

    init() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.gl = new GL(this.canvas, { alpha: false }, vertShader, fragShader);
        const gl = this.gl;
        this.programWater = gl.program;

        gl.createUniform("2f", "resolution", this.width, this.height);
        gl.createUniform("1f", "textureRatio", this.imageBg.width / this.imageBg.height);
        gl.createUniform("1i", "renderShine", this.imageShine != null);
        gl.createUniform("1i", "renderShadow", this.options.renderShadow);
        gl.createUniform("1f", "minRefraction", this.options.minRefraction);
        gl.createUniform("1f", "refractionDelta", this.options.maxRefraction - this.options.minRefraction);
        gl.createUniform("1f", "brightness", this.options.brightness);
        gl.createUniform("1f", "alphaMultiply", this.options.alphaMultiply);
        gl.createUniform("1f", "alphaSubtract", this.options.alphaSubtract);
        gl.createUniform("1f", "parallaxBg", this.options.parallaxBg);
        gl.createUniform("1f", "parallaxFg", this.options.parallaxFg);


        gl.createTexture(null, 0);

        this.textures = [
            { name: 'textureShine', img: this.imageShine ?? createCanvas(2, 2) },
            { name: 'textureFg', img: this.imageFg },
            { name: 'textureBg', img: this.imageBg }
        ];

        this.textures.forEach((texture, i) => {
            gl.createTexture(texture.img, i + 1);
            gl.createUniform("1i", texture.name, i + 1);
        });

        this.draw();
    }

    draw() {
        this.gl.useProgram(this.programWater);
        // Update uniforms that depend on canvas size each frame to survive resizes
        this.gl.createUniform("2f", "resolution", this.width, this.height);
        this.gl.createUniform("1f", "textureRatio", this.imageBg.width / this.imageBg.height);
        this.gl.createUniform("2f", "parallax", this.parallaxX, this.parallaxY);
        this.updateTexture();
        this.gl.draw();

        requestAnimationFrame(this.draw.bind(this));
    }

    updateTextures() {
        this.textures.forEach((texture, i) => {
            this.gl.activeTexture(i + 1);
            this.gl.updateTexture(texture.img);
        })
    }

    updateTexture() {
        this.gl.activeTexture(0);
        this.gl.updateTexture(this.canvasLiquid);
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;

        // Update WebGL viewport
        this.gl?.gl?.viewport(0, 0, width, height);
    }

    get overlayTexture() {
        return undefined;
    }

    set overlayTexture(_) {
    }

}