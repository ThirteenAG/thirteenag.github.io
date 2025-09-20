export function getContext(canvas: HTMLCanvasElement, options: WebGLContextAttributes = {}) {
    const context = canvas.getContext("webgl", options);

    if (context == null) {
        document.body.classList.add("no-webgl");
    }

    return context;
}

export function createProgram(gl: WebGLRenderingContext, vertexScript: string, fragScript: string): WebGLProgram | null {
    const vertexShader = createShader(gl, vertexScript, gl.VERTEX_SHADER);
    const fragShader = createShader(gl, fragScript, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragShader) {
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragShader);

    gl.linkProgram(program);

    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (!linked) {
        const lastError = gl.getProgramInfoLog(program);
        error(`Error in program linking: ${lastError}`);
        gl.deleteProgram(program);
        return null;
    }

    var positionLocation = gl.getAttribLocation(program, "a_position");
    var texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

    var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0, 1.0,
        -1.0, 1.0,
        1.0, -1.0,
        1.0, 1.0
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Create a buffer for the position of the rectangle corners.
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    return program;
}


export function createShader(gl: WebGLRenderingContext, script: string, type: GLenum) {
    const shader = gl.createShader(type);

    if (!shader) {
        error("Error creating shader.");
        return null;
    }

    gl.shaderSource(shader, script);
    gl.compileShader(shader);

    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (!compiled) {
        const lastError = gl.getShaderInfoLog(shader);
        error(`Error compiling shader '${shader}':${lastError}`);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}
export function createTexture(gl: WebGLRenderingContext, source: TexImageSource | null, i: number): WebGLTexture {
    var texture = gl.createTexture();
    activeTexture(gl, i);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if (source !== null) {
        updateTexture(gl, source);
    }

    return texture;
}

export type UniformType = "1f" | "1fv" | "1i" | "1iv" | "2f" | "2fv" | "2i" | "2iv" | "3f" | "3fv" | "3i" | "3iv" | "4f" | "4fv" | "4i" | "4iv" | "Matrix2fv" | "Matrix3fv" | "Matrix4fv";

export function createUniform(gl: WebGLRenderingContext, program: WebGLProgram, type: UniformType, name: string, ...args: Array<any>) {
    const location = gl.getUniformLocation(program, `u_${name}`);
    if (location) {
        gl[`uniform${type}`](location, ...args);
    }
}

export function activeTexture(gl: WebGLRenderingContext, i: number) {
    gl.activeTexture(gl[`TEXTURE${i}`]);
}

export function updateTexture(gl: WebGLRenderingContext, source: TexImageSource) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

export function setRectangle(gl: WebGLRenderingContext, x: number, y: number, width: number, height: number) {
    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2]), gl.STATIC_DRAW);
}

function error(msg: unknown) {
    console.error(msg);
}