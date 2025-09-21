import createCanvas from "./utils/create-canvas.js";
import times from "./utils/times.js";
import { random, chance } from "./utils/random.js";

const dropSize = 64;

class Drop {
    x: number;
    y: number;
    r: number;
    spreadX: number;
    spreadY: number;
    momentum: number;
    momentumX: number;
    lastSpawn: number;
    nextSpawn: number;
    parent: Drop | null;
    isNew: boolean;
    killed: boolean;
    shrink: number;

    constructor({
        x = 0,
        y = 0,
        r = 0,
        spreadX = 0,
        spreadY = 0,
        momentum = 0,
        momentumX = 0,
        lastSpawn = 0,
        nextSpawn = 0,
        parent = null,
        isNew = true,
        killed = false,
        shrink = 0,
    }: Partial<Drop> = {}) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.spreadX = spreadX;
        this.spreadY = spreadY;
        this.momentum = momentum;
        this.momentumX = momentumX;
        this.lastSpawn = lastSpawn;
        this.nextSpawn = nextSpawn;
        this.parent = parent;
        this.isNew = isNew;
        this.killed = killed;
        this.shrink = shrink;
    }
}

interface RaindropOptions {
    minR: number;
    maxR: number;
    maxDrops: number;
    rainChance: number;
    rainLimit: number;
    dropletsRate: number;
    dropletsSize: [number, number];
    dropletsCleaningRadiusMultiplier: number;
    raining: boolean;
    globalTimeScale: number;
    trailRate: number;
    autoShrink: boolean;
    spawnArea: [number, number];
    trailScaleRange: [number, number];
    collisionRadius: number;
    collisionRadiusIncrease: number;
    dropFallMultiplier: number;
    collisionBoostMultiplier: number;
    collisionBoost: number;
}

const defaultOptions: RaindropOptions = {
    minR: 10,
    maxR: 40,
    maxDrops: 900,
    rainChance: 0.3,
    rainLimit: 3,
    dropletsRate: 50,
    dropletsSize: [2, 4],
    dropletsCleaningRadiusMultiplier: 0.43,
    raining: true,
    globalTimeScale: 1,
    trailRate: 1,
    autoShrink: true,
    spawnArea: [-0.1, 0.95],
    trailScaleRange: [0.2, 0.5],
    collisionRadius: 0.65,
    collisionRadiusIncrease: 0.01,
    dropFallMultiplier: 1,
    collisionBoostMultiplier: 0.05,
    collisionBoost: 1,
}

export default class Raindrops {
    dropColor: CanvasImageSource;
    dropAlpha: CanvasImageSource;
    canvas!: HTMLCanvasElement;
    ctx!: CanvasRenderingContext2D;
    width = 0;
    height = 0;
    scale = 0;
    dropletsPixelDensity = 1;
    droplets!: HTMLCanvasElement;
    dropletsCtx!: CanvasRenderingContext2D;
    dropletsCounter = 0;
    drops: Drop[] = [];
    dropsGfx: HTMLCanvasElement[] = [];
    clearDropletsGfx!: HTMLCanvasElement;
    textureCleaningIterations = 0;
    lastRender: number | null = null;

    options: RaindropOptions;

    constructor(
        width: number,
        height: number,
        scale: number,
        dropAlpha: CanvasImageSource,
        dropColor: CanvasImageSource,
        options: Partial<RaindropOptions> = {}
    ) {
        this.width = width;
        this.height = height;
        this.scale = scale;
        this.dropAlpha = dropAlpha;
        this.dropColor = dropColor;
        this.options = { ...defaultOptions, ...options };
        this.init();
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        if (this.canvas) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }

    init() {
        this.canvas = createCanvas(this.width, this.height);
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        this.ctx = ctx;

        this.droplets = createCanvas(this.width * this.dropletsPixelDensity, this.height * this.dropletsPixelDensity);
        const dropletsCtx = this.droplets.getContext('2d');
        if (!dropletsCtx) return;
        this.dropletsCtx = dropletsCtx;

        this.drops = [];
        this.dropsGfx = [];

        this.renderDropsGfx();

        this.update();
    }

    get deltaR() {
        return this.options.maxR - this.options.minR;
    }

    get area() {
        return (this.width * this.height) / this.scale;
    }

    get areaMultiplier() {
        return Math.sqrt(this.area / (1024 * 768));
    }

    drawDroplet(x: number, y: number, r: number) {
        if (!this.dropletsCtx) return;
        this.drawDrop(this.dropletsCtx, new Drop({
            x: x * this.dropletsPixelDensity,
            y: y * this.dropletsPixelDensity,
            r: r * this.dropletsPixelDensity,
        }));
    }

    renderDropsGfx() {
        const dropBuffer = createCanvas(dropSize, dropSize);
        const dropBufferCtx = dropBuffer.getContext('2d');

        if (!dropBufferCtx) return;

        this.dropsGfx = Array.apply(null, Array(255))
            .map((_cur, i) => {
                const drop = createCanvas(dropSize, dropSize);
                const dropCtx = drop.getContext('2d');

                if (!dropCtx) return drop;

                dropBufferCtx.clearRect(0, 0, dropSize, dropSize);

                // color
                dropBufferCtx.globalCompositeOperation = "source-over";
                dropBufferCtx.drawImage(this.dropColor, 0, 0, dropSize, dropSize);

                // blue overlay, for depth
                dropBufferCtx.globalCompositeOperation = "screen";
                dropBufferCtx.fillStyle = `rgba(0,0,${i},1)`;
                dropBufferCtx.fillRect(0, 0, dropSize, dropSize);

                // alpha
                dropCtx.globalCompositeOperation = "source-over";
                dropCtx.drawImage(this.dropAlpha, 0, 0, dropSize, dropSize);

                dropCtx.globalCompositeOperation = "source-in";
                dropCtx.drawImage(dropBuffer, 0, 0, dropSize, dropSize);
                return drop;
            });

        // create circle that will be used as a brush to remove droplets
        this.clearDropletsGfx = createCanvas(128, 128);
        const clearDropletsCtx = this.clearDropletsGfx.getContext("2d");

        if (!clearDropletsCtx) return;

        clearDropletsCtx.fillStyle = "#000";
        clearDropletsCtx.beginPath();
        clearDropletsCtx.arc(64, 64, 64, 0, Math.PI * 2);
        clearDropletsCtx.fill();
    }

    drawDrop(ctx: CanvasRenderingContext2D, drop: Drop) {
        if (this.dropsGfx.length > 0) {
            const x = drop.x;
            const y = drop.y;
            const r = drop.r;
            const spreadX = drop.spreadX;
            const spreadY = drop.spreadY;

            const scaleX = 1;
            const scaleY = 1.5;

            let d = Math.max(0, Math.min(1, ((r - this.options.minR) / (this.deltaR)) * 0.9));
            d *= 1 / (((drop.spreadX + drop.spreadY) * 0.5) + 1);

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";

            d = Math.floor(d * (this.dropsGfx.length - 1));
            ctx.drawImage(
                this.dropsGfx[d],
                (x - (r * scaleX * (spreadX + 1))) * this.scale,
                (y - (r * scaleY * (spreadY + 1))) * this.scale,
                (r * 2 * scaleX * (spreadX + 1)) * this.scale,
                (r * 2 * scaleY * (spreadY + 1)) * this.scale
            );
        }
    }

    clearDroplets(x: number, y: number, r: number = 30) {
        const ctx = this.dropletsCtx;
        if (!ctx) return;
        ctx.globalCompositeOperation = "destination-out";
        ctx.drawImage(
            this.clearDropletsGfx,
            (x - r) * this.dropletsPixelDensity * this.scale,
            (y - r) * this.dropletsPixelDensity * this.scale,
            (r * 2) * this.dropletsPixelDensity * this.scale,
            (r * 2) * this.dropletsPixelDensity * this.scale * 1.5
        )
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    createDrop(options: Partial<Drop>) {
        if (this.drops.length >= this.options.maxDrops * this.areaMultiplier) return null;

        return new Drop(options);
    }

    addDrop(drop: Drop) {
        if (this.drops.length >= this.options.maxDrops * this.areaMultiplier || drop == null) return false;

        this.drops.push(drop);
        return true;
    }

    updateRain(timeScale: number) {
        const rainDrops: Drop[] = [];
        if (this.options.raining) {
            const limit = this.options.rainLimit * timeScale * this.areaMultiplier;
            let count = 0;
            while (chance(this.options.rainChance * timeScale * this.areaMultiplier) && count < limit) {
                count++;
                const r = random(this.options.minR, this.options.maxR, (n: number) => {
                    return n ** 3;
                });
                const rainDrop = this.createDrop({
                    x: random(this.width / this.scale),
                    y: random((this.height / this.scale) * this.options.spawnArea[0], (this.height / this.scale) * this.options.spawnArea[1]),
                    r: r,
                    momentum: 1 + ((r - this.options.minR) * 0.1) + random(2),
                    spreadX: 1.5,
                    spreadY: 1.5,
                });
                if (rainDrop != null) {
                    rainDrops.push(rainDrop);
                }
            }
        }
        return rainDrops;
    }

    clearDrops() {
        this.drops.forEach((drop) => {
            setTimeout(() => {
                drop.shrink = 0.1 + random(0.5);
            }, Math.floor(random(1200)))
        })
        this.clearTexture();
    }

    clearTexture() {
        this.textureCleaningIterations = 50;
    }

    updateDroplets(timeScale: number) {
        if (this.textureCleaningIterations > 0) {
            this.textureCleaningIterations -= 1 * timeScale;
            if (this.dropletsCtx) {
                this.dropletsCtx.globalCompositeOperation = "destination-out";
                this.dropletsCtx.fillStyle = `rgba(0,0,0,${0.05 * timeScale})`;
                this.dropletsCtx.fillRect(0, 0,
                    this.width * this.dropletsPixelDensity, this.height * this.dropletsPixelDensity);
            }
        }
        if (this.options.raining) {
            this.dropletsCounter += this.options.dropletsRate * timeScale * this.areaMultiplier;
            times(Math.floor(this.dropletsCounter), (_i: number) => {
                this.dropletsCounter--;
                this.drawDroplet(
                    random(this.width / this.scale),
                    random(this.height / this.scale),
                    random(...this.options.dropletsSize, (n: number) => {
                        return n * n;
                    })
                )
            });
        }
        if (this.ctx) this.ctx.drawImage(this.droplets, 0, 0, this.width, this.height);
    }

    updateDrops(timeScale: number) {
        let newDrops: Drop[] = [];

        this.updateDroplets(timeScale);
        const rainDrops = this.updateRain(timeScale);
        newDrops = newDrops.concat(rainDrops);

        this.drops.sort((a, b) => {
            const va = (a.y * (this.width / this.scale)) + a.x;
            const vb = (b.y * (this.width / this.scale)) + b.x;
            return va > vb ? 1 : va === vb ? 0 : -1;
        });

        this.drops.forEach((drop: Drop, i: number) => {
            if (!drop.killed) {
                // update gravity
                // (chance of drops "creeping down")
                if (chance((drop.r - (this.options.minR * this.options.dropFallMultiplier)) * (0.1 / this.deltaR) * timeScale)) {
                    drop.momentum += random((drop.r / this.options.maxR) * 4);
                }
                // clean small drops
                if (this.options.autoShrink && drop.r <= this.options.minR && chance(0.05 * timeScale)) {
                    drop.shrink += 0.01;
                }
                //update shrinkage
                drop.r -= drop.shrink * timeScale;
                if (drop.r <= 0) drop.killed = true;

                // update trails
                if (this.options.raining) {
                    drop.lastSpawn += drop.momentum * timeScale * this.options.trailRate;
                    if (drop.lastSpawn > drop.nextSpawn) {
                        const trailDrop = this.createDrop({
                            x: drop.x + (random(-drop.r, drop.r) * 0.1),
                            y: drop.y - (drop.r * 0.01),
                            r: drop.r * random(...this.options.trailScaleRange),
                            spreadY: drop.momentum * 0.1,
                            parent: drop,
                        });

                        if (trailDrop != null) {
                            newDrops.push(trailDrop);

                            drop.r *= 0.97 ** timeScale;
                            drop.lastSpawn = 0;
                            drop.nextSpawn = random(this.options.minR, this.options.maxR) - (drop.momentum * 2 * this.options.trailRate) + (this.options.maxR - drop.r);
                        }
                    }
                }

                //normalize spread
                drop.spreadX *= 0.4 ** timeScale;
                drop.spreadY *= 0.7 ** timeScale;

                //update position
                const moved = drop.momentum > 0;
                if (moved && !drop.killed) {
                    drop.y += drop.momentum * this.options.globalTimeScale;
                    drop.x += drop.momentumX * this.options.globalTimeScale;
                    if (drop.y > (this.height / this.scale) + drop.r) {
                        drop.killed = true;
                    }
                }

                // collision
                const checkCollision = (moved || drop.isNew) && !drop.killed;
                drop.isNew = false;

                if (checkCollision) {
                    this.drops.slice(i + 1, i + 70).forEach((drop2: Drop) => {
                        //basic check
                        if (
                            drop !== drop2 &&
                            drop.r > drop2.r &&
                            drop.parent !== drop2 &&
                            drop2.parent !== drop &&
                            !drop2.killed
                        ) {
                            const dx = drop2.x - drop.x;
                            const dy = drop2.y - drop.y;
                            const d = Math.sqrt((dx * dx) + (dy * dy));
                            //if it's within acceptable distance
                            if (d < (drop.r + drop2.r) * (this.options.collisionRadius + (drop.momentum * this.options.collisionRadiusIncrease * timeScale))) {
                                const pi = Math.PI;
                                const r1 = drop.r;
                                const r2 = drop2.r;
                                const a1 = pi * (r1 * r1);
                                const a2 = pi * (r2 * r2);
                                let targetR = Math.sqrt((a1 + (a2 * 0.8)) / pi);
                                if (targetR > this.options.maxR) {
                                    targetR = this.options.maxR;
                                }
                                drop.r = targetR;
                                drop.momentumX += dx * 0.1;
                                drop.spreadX = 0;
                                drop.spreadY = 0;
                                drop2.killed = true;
                                drop.momentum = Math.max(drop2.momentum, Math.min(40, drop.momentum + (targetR * this.options.collisionBoostMultiplier) + this.options.collisionBoost));
                            }
                        }
                    });
                }

                //slowdown momentum
                drop.momentum -= Math.max(1, (this.options.minR * 0.5) - drop.momentum) * 0.1 * timeScale;
                if (drop.momentum < 0) drop.momentum = 0;
                drop.momentumX *= 0.7 ** timeScale;


                if (!drop.killed) {
                    newDrops.push(drop);
                    if (moved && this.options.dropletsRate > 0) this.clearDroplets(drop.x, drop.y, drop.r * this.options.dropletsCleaningRadiusMultiplier);
                    this.drawDrop(this.ctx, drop);
                }

            }
        });

        this.drops = newDrops;
    }

    update() {
        this.clearCanvas();

        const now = Date.now();
        const last = (this.lastRender ?? now);
        const deltaT = now - last;
        let timeScale = deltaT / ((1 / 60) * 1000);
        if (timeScale > 1.1) timeScale = 1.1;
        timeScale *= this.options.globalTimeScale;
        this.lastRender = now;

        this.updateDrops(timeScale);

        requestAnimationFrame(this.update.bind(this));
    }
}