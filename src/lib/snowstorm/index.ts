/** @license
 * DHTML Snowstorm! JavaScript-based snow for web pages
 * Making it snow on the internets since 2003. You're welcome.
 * -----------------------------------------------------------
 * Version 1.44.20131215 (Previous rev: 1.44.20131208)
 * Copyright (c) 2007, Scott Schiller. All rights reserved.
 * Code provided under the BSD License
 * http://schillmania.com/projects/snowstorm/license.txt
 */

// Modern TypeScript refactor of the original Snowstorm script.

export interface SnowStormOptions {
    autoStart?: boolean;
    excludeMobile?: boolean;
    flakesMax?: number;
    flakesMaxActive?: number;
    animationInterval?: number; // ms per frame when falling back to setTimeout
    useGPU?: boolean;
    className?: string | null;
    flakeBottom?: number | null;
    followMouse?: boolean;
    snowColor?: string;
    snowCharacter?: string; // e.g. '&bull;'
    snowStick?: boolean;
    targetElement?: HTMLElement | string | null; // element or element id
    useMeltEffect?: boolean;
    useTwinkleEffect?: boolean;
    usePositionFixed?: boolean;
    usePixelPosition?: boolean;
    accessibility?: boolean; // hide from screen readers

    // Less-used bits
    freezeOnBlur?: boolean;
    flakeLeftOffset?: number;
    flakeRightOffset?: number;
    flakeWidth?: number;
    flakeHeight?: number;
    vMaxX?: number;
    vMaxY?: number;
    zIndex?: number;
}

type RAF = (cb: FrameRequestCallback) => number;
type CAF = (id: number) => void;

function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isMobileUA(): boolean {
    if (!isBrowser()) return false;
    return /mobile|opera m(ob|in)/i.test(navigator.userAgent);
}

function clamp(min: number, value: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export class SnowStorm {
    // Public options
    autoStart: boolean;
    excludeMobile: boolean;
    flakesMax: number;
    flakesMaxActive: number;
    animationInterval: number;
    useGPU: boolean;
    className: string | null;
    flakeBottom: number | null;
    followMouse: boolean;
    snowColor: string;
    snowCharacter: string;
    snowStick: boolean;
    targetElement: HTMLElement | null;
    targetElementRef: HTMLElement | null | undefined; // internal ref after resolving string
    useMeltEffect: boolean;
    useTwinkleEffect: boolean;
    usePositionFixed: boolean;
    usePixelPosition: boolean;
    accessibility: boolean;

    // Less-used
    freezeOnBlur: boolean;
    flakeLeftOffset: number;
    flakeRightOffset: number;
    flakeWidth: number;
    flakeHeight: number;
    vMaxX: number;
    vMaxY: number;
    zIndex: number;

    // Internal state
    public flakes: SnowFlake[] = [];
    public active = false;
    public disabled = false;
    private didInit = false;
    public meltFrameCount = 20;
    public meltFrames: number[] = [];
    public docFrag: DocumentFragment | null = null;

    public screenX = 0;
    public screenY = 0;
    public screenX2 = 0;
    public scrollY = 0;
    public docHeight = 0;
    public vRndX = 0;
    public vRndY = 0;
    public windOffset = 1;
    private windMultiplier = 2;
    private flakeTypes = 6;
    public fixedForEverything = false;
    public targetElementIsRelative = false;
    public opacitySupported = true;

    // Animation
    private raf: RAF | null = null;
    private caf: CAF | null = null;
    private rafId: number | null = null;

    // Event handlers (bound)
    private onResize = () => this.resizeHandler();
    private onScroll = () => this.scrollHandler();
    private onMouseMove = (e: MouseEvent) => this.mouseMove(e);
    private onBlur = () => this.freeze();
    private onFocus = () => this.resume();
    private onLoad = () => this._doStart();

    constructor(options: SnowStormOptions = {}) {
        // Defaults derived from original script
        this.autoStart = options.autoStart ?? false;
        this.excludeMobile = options.excludeMobile ?? false;
        this.flakesMax = options.flakesMax ?? 128;
        this.flakesMaxActive = options.flakesMaxActive ?? 64;
        this.animationInterval = options.animationInterval ?? 33;
        this.useGPU = options.useGPU ?? true;
        this.className = options.className ?? null;
        this.flakeBottom = options.flakeBottom ?? null;
        this.followMouse = options.followMouse ?? true;
        this.snowColor = options.snowColor ?? '#fff';
        this.snowCharacter = options.snowCharacter ?? '&bull;';
        this.snowStick = options.snowStick ?? true;
        this.targetElement = null; // resolve below
        this.targetElementRef = undefined;
        this.useMeltEffect = options.useMeltEffect ?? true;
        this.useTwinkleEffect = options.useTwinkleEffect ?? false;
        this.usePositionFixed = options.usePositionFixed ?? false;
        this.usePixelPosition = options.usePixelPosition ?? false;
        this.accessibility = options.accessibility ?? true;

        this.freezeOnBlur = options.freezeOnBlur ?? true;
        this.flakeLeftOffset = options.flakeLeftOffset ?? 0;
        this.flakeRightOffset = options.flakeRightOffset ?? 0;
        this.flakeWidth = options.flakeWidth ?? 8;
        this.flakeHeight = options.flakeHeight ?? 8;
        this.vMaxX = options.vMaxX ?? 5;
        this.vMaxY = options.vMaxY ?? 4;
        this.zIndex = options.zIndex ?? 0;

        if (isBrowser()) {
            this.opacitySupported = this._detectOpacitySupport();
            this._setupRAF();
            this.docFrag = document.createDocumentFragment();

            // Resolve target element lazily; if string provided, resolve at start()
            if (typeof options.targetElement === 'string') {
                const el = document.getElementById(options.targetElement) as HTMLElement | null;
                this.targetElement = el ?? null;
            } else if (options.targetElement instanceof HTMLElement) {
                this.targetElement = options.targetElement;
            } else {
                this.targetElement = null;
            }

            if (this.autoStart) {
                // Start on window load (respect mobile exclusion)
                window.addEventListener('load', this.onLoad, { once: true });
            }
        }
    }

    // Public API
    start(): void {
        if (!isBrowser()) return;
        if (this.didInit) {
            // Already initialized
            this.active = true;
            this.resume();
            return;
        }
        this.didInit = true;

        // Resolve / default target element
        if (!this.targetElement) {
            this.targetElement = (document.body || document.documentElement);
        }

        const target = this.targetElement;
        if (!target) return;
        this.targetElementRef = target;

        // If target is not the root/body, force pixel positioning and use alt resize handler
        if (target !== document.documentElement && target !== document.body) {
            this.usePixelPosition = true;
        }

        // Detect if target is relatively positioned
        try {
            this.targetElementIsRelative = (window.getComputedStyle(target).getPropertyValue('position') === 'relative');
        } catch {
            this.targetElementIsRelative = false;
        }

        // Positioning mode
        this.fixedForEverything = !!(this.usePositionFixed && !this.flakeBottom);

        // Precompute melt frames
        this.meltFrames = [];
        for (let i = 0; i < this.meltFrameCount; i++) {
            this.meltFrames.push(1 - (i / this.meltFrameCount));
        }

        this.randomizeWind();
        this.createSnow(this.flakesMax);

        // Listeners
        window.addEventListener('resize', this.onResize);
        window.addEventListener('scroll', this.onScroll);
        if (this.freezeOnBlur) {
            window.addEventListener('blur', this.onBlur);
            window.addEventListener('focus', this.onFocus);
        }
        if (this.followMouse) {
            window.addEventListener('mousemove', this.onMouseMove);
        }

        this.resizeHandler();
        this.scrollHandler();
        this.animationInterval = Math.max(20, this.animationInterval);
        this.timerInit();
        this.active = true;
    }

    stop(): void {
        if (!isBrowser()) return;
        this.freeze();
        for (const flake of this.flakes) {
            flake.o.style.display = 'none';
        }
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this.onResize);
        if (this.freezeOnBlur) {
            window.removeEventListener('blur', this.onBlur);
            window.removeEventListener('focus', this.onFocus);
        }
        if (this.followMouse) {
            window.removeEventListener('mousemove', this.onMouseMove);
        }
        this.active = false;
    }

    toggleSnow(): void {
        if (!this.flakes.length) {
            this.start();
            return;
        }
        this.active = !this.active;
        if (this.active) {
            this.show();
            this.resume();
        } else {
            this.stop();
            this.freeze();
        }
    }

    freeze(): void {
        if (!this.disabled) {
            this.disabled = true;
        } else {
            return;
        }
        this._stopRAF();
    }

    resume(): void {
        if (this.disabled) {
            this.disabled = false;
        } else {
            return;
        }
        this.timerInit();
    }

    show(): void {
        for (const flake of this.flakes) {
            flake.o.style.display = 'block';
        }
    }

    randomizeWind(): void {
        this.vRndX = this._plusMinus(this._rnd(this.vMaxX, 0.2));
        this.vRndY = this._rnd(this.vMaxY, 0.2);
        for (const flake of this.flakes) {
            if (flake.active) flake.setVelocities();
        }
    }

    // --- Internal methods ---
    private _doStart(): void {
        if (this.excludeMobile && isMobileUA()) return;
        this.start();
    }

    private _detectOpacitySupport(): boolean {
        const el = document.createElement('div');
        try {
            el.style.opacity = '0.5';
            return true;
        } catch {
            return false;
        }
    }

    private _setupRAF(): void {
        const w = window as unknown as {
            requestAnimationFrame?: RAF;
            webkitRequestAnimationFrame?: RAF;
            mozRequestAnimationFrame?: RAF;
            oRequestAnimationFrame?: RAF;
            msRequestAnimationFrame?: RAF;
            cancelAnimationFrame?: CAF;
            webkitCancelAnimationFrame?: CAF;
            mozCancelAnimationFrame?: CAF;
            oCancelAnimationFrame?: CAF;
            msCancelAnimationFrame?: CAF;
        };
        const raf: RAF | undefined = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.mozRequestAnimationFrame || w.oRequestAnimationFrame || w.msRequestAnimationFrame;
        const caf: CAF | undefined = w.cancelAnimationFrame || w.webkitCancelAnimationFrame || w.mozCancelAnimationFrame || w.oCancelAnimationFrame || w.msCancelAnimationFrame;
        if (raf && caf) {
            this.raf = (cb) => raf(cb);
            this.caf = (id) => caf(id);
        } else {
            this.raf = (cb) => window.setTimeout(cb, 1000 / (this.animationInterval || 30));
            this.caf = (id) => window.clearTimeout(id);
        }
    }

    private _stopRAF(): void {
        if (this.rafId != null && this.caf) {
            this.caf(this.rafId);
        }
        this.rafId = null;
    }

    private _rnd(n: number, min = 0): number {
        return (Math.random() * n) + min;
    }

    private _plusMinus(n: number): number {
        return (parseInt(String(this._rnd(2)), 10) === 1 ? n * -1 : n);
    }

    public setXY(o: HTMLElement, x: number, y: number): void {
        if (!o) return;

        // Prefer pixel positioning for modern environments or when target is relative
        if (this.usePixelPosition || this.targetElementIsRelative) {
            o.style.left = `${x - this.flakeWidth}px`;
            o.style.top = `${y - this.flakeHeight}px`;
            return;
        }

        if (!this.flakeBottom) {
            // Use right/bottom percentages to avoid scrollbars
            o.style.right = `${100 - (x / this.screenX * 100)}%`;
            o.style.bottom = `${100 - (y / this.screenY * 100)}%`;
        } else {
            o.style.right = `${100 - (x / this.screenX * 100)}%`;
            o.style.top = `${Math.min(y, this.docHeight - this.flakeHeight)}px`;
        }
    }

    private resizeHandler(): void {
        if (!isBrowser()) return;
        if (this.targetElementRef && this.targetElementRef !== document.documentElement && this.targetElementRef !== document.body) {
            // Alt handler for custom container
            this.screenX = this.targetElementRef.offsetWidth - this.flakeRightOffset;
            this.screenY = this.flakeBottom ?? this.targetElementRef.offsetHeight;
        } else {
            this.screenX = (window.innerWidth ?? document.documentElement.clientWidth) - 16 - this.flakeRightOffset;
            this.screenY = this.flakeBottom ?? (window.innerHeight ?? document.documentElement.clientHeight);
        }
        this.docHeight = document.body.offsetHeight;
        this.screenX = Math.max(0, this.screenX);
        this.screenY = Math.max(0, this.screenY);
        this.screenX2 = Math.floor(this.screenX / 2);
    }

    private scrollHandler(): void {
        if (!isBrowser()) return;
        // Attach flakes to bottom of window if no absolute bottom value was given
        this.scrollY = this.flakeBottom ? 0 : (window.scrollY || document.documentElement.scrollTop || 0);
        if (Number.isNaN(this.scrollY)) this.scrollY = 0;
        if (!this.fixedForEverything && !this.flakeBottom) {
            for (const flake of this.flakes) {
                if (flake.active === 0) flake.stick();
            }
        }
    }

    private timerInit(): void {
        if (!isBrowser()) return;
        const loop = () => {
            if (this.disabled) return; // paused
            this.snow();
            if (this.raf) this.rafId = this.raf(loop);
        };
        if (this.raf) this.rafId = this.raf(loop);
    }

    private snow(): void {
        let active = 0;
        for (let i = 0; i < this.flakes.length; i++) {
            const f = this.flakes[i];
            if (f.active === 1) {
                f.move();
                active++;
            }
            if (f.melting) f.melt();
        }
        if (active < this.flakesMaxActive && this.flakes.length) {
            const flake = this.flakes[Math.floor(this._rnd(this.flakes.length))];
            if (flake.active === 0) flake.melting = true;
        }
    }

    private mouseMove(e: MouseEvent): void {
        if (!this.followMouse) return;
        const x = clamp(0, e.clientX, this.screenX);
        if (x < this.screenX2) {
            this.windOffset = -this.windMultiplier + (x / this.screenX2 * this.windMultiplier);
        } else {
            const x2 = x - this.screenX2;
            this.windOffset = (x2 / this.screenX2) * this.windMultiplier;
        }
    }

    private createSnow(limit: number, allowInactive = false): void {
        if (!isBrowser() || !this.docFrag || !this.targetElementRef) return;
        for (let i = 0; i < limit; i++) {
            const flake = new SnowFlake(this, Math.floor(this._rnd(this.flakeTypes)));
            this.flakes.push(flake);
            if (allowInactive || i > this.flakesMaxActive) flake.active = -1;
        }
        this.targetElementRef.appendChild(this.docFrag);
    }
}

class SnowFlake {
    type: number;
    x: number;
    y: number;
    vX = 0;
    vY = 0;
    vAmpTypes = [1, 1.2, 1.4, 1.6, 1.8];
    vAmp: number;
    melting = false;
    meltFrameCount: number;
    meltFrames: number[];
    meltFrame = 0;
    twinkleFrame = 0;
    active = 1; // 1 = active, 0 = stopped, -1 = inactive
    fontSize: number;
    o: HTMLDivElement;

    constructor(private storm: SnowStorm, type: number, x?: number, y?: number) {
        this.type = type;
        this.x = (typeof x === 'number') ? x : Math.floor(Math.random() * Math.max(1, this.storm.screenX - 20));
        this.y = (typeof y === 'number') ? y : -Math.random() * Math.max(1, this.storm.screenY) - 12;
        this.vAmp = this.vAmpTypes[this.type] || 1;
        this.meltFrameCount = this.storm.meltFrameCount || 20;
        this.meltFrames = this.storm.meltFrames || [];
        this.fontSize = (10 + (this.type / 5) * 10);
        this.o = document.createElement('div');
        this.o.innerHTML = this.storm.snowCharacter;
        if (this.storm.className) this.o.setAttribute('class', this.storm.className);
        this.o.style.color = this.storm.snowColor;
        this.o.style.position = (this.storm.fixedForEverything ? 'fixed' : 'absolute');
        if (this.storm.useGPU) {
            // enable GPU compositing
            this.o.style.transform = 'translate3d(0px, 0px, 0px)';
        }
        this.o.style.width = `${this.storm.flakeWidth}px`;
        this.o.style.height = `${this.storm.flakeHeight}px`;
        this.o.style.fontFamily = 'arial,verdana';
        this.o.style.cursor = 'default';
        this.o.style.overflow = 'hidden';
        this.o.style.fontWeight = 'normal';
        this.o.style.zIndex = String(this.storm.zIndex);
        if (this.storm.accessibility) this.o.setAttribute('aria-hidden', 'true');

        this.storm.docFrag?.appendChild(this.o);

        this.recycle();
        this.refresh();
    }

    refresh(): void {
        if (Number.isNaN(this.x) || Number.isNaN(this.y)) return;
        this.storm.setXY(this.o, this.x, this.y);
    }

    stick(): void {
        const screenY = this.storm.screenY;
        const scrollY = this.storm.scrollY;
        const target = this.storm.targetElementRef;
        const isRoot = target === document.documentElement || target === document.body;
        if (!this.storm.fixedForEverything && isRoot && this.storm.flakeBottom == null) {
            // Use fixed bottom when allowed and attached to root
            this.o.style.display = 'none';
            this.o.style.top = 'auto';
            this.o.style.bottom = '0%';
            this.o.style.position = 'fixed';
            this.o.style.display = 'block';
        } else if (this.storm.flakeBottom != null) {
            this.o.style.top = `${this.storm.flakeBottom}px`;
        } else {
            this.o.style.top = `${screenY + scrollY - this.storm.flakeHeight}px`;
        }
    }

    vCheck(): void {
        if (this.vX >= 0 && this.vX < 0.2) this.vX = 0.2;
        else if (this.vX < 0 && this.vX > -0.2) this.vX = -0.2;
        if (this.vY >= 0 && this.vY < 0.2) this.vY = 0.2;
    }

    move(): void {
        const windOffset = this.storm.windOffset;
        const flakeWidth = this.storm.flakeWidth;
        const screenX = this.storm.screenX;
        const screenY = this.storm.screenY;
        const scrollY = this.storm.scrollY;

        const vX = this.vX * windOffset;
        this.x += vX;
        this.y += (this.vY * this.vAmp);

        if (this.x >= screenX || screenX - this.x < flakeWidth) {
            this.x = 0;
        } else if (vX < 0 && this.x - this.storm.flakeLeftOffset < -flakeWidth) {
            this.x = screenX - flakeWidth - 1;
        }
        this.refresh();

        const yDiff = screenY + scrollY - this.y + this.storm.flakeHeight;
        if (yDiff < this.storm.flakeHeight) {
            this.active = 0;
            if (this.storm.snowStick) this.stick();
            else this.recycle();
        } else {
            if (this.storm.useMeltEffect && this.active && this.type < 3 && !this.melting && Math.random() > 0.998) {
                this.melting = true;
                this.melt();
            }
            if (this.storm.useTwinkleEffect) {
                if (this.twinkleFrame < 0) {
                    if (Math.random() > 0.97) this.twinkleFrame = Math.floor(Math.random() * 8);
                } else {
                    this.twinkleFrame--;
                    if (!this.storm.opacitySupported) {
                        this.o.style.visibility = (this.twinkleFrame && this.twinkleFrame % 2 === 0 ? 'hidden' : 'visible');
                    } else {
                        this.o.style.opacity = (this.twinkleFrame && this.twinkleFrame % 2 === 0 ? '0' : '1');
                    }
                }
            }
        }
    }

    setVelocities(): void {
        this.vX = this.storm.vRndX + Math.random() * (this.storm.vMaxX * 0.12) + 0.1;
        this.vY = this.storm.vRndY + Math.random() * (this.storm.vMaxY * 0.12) + 0.1;
    }

    private setOpacity(o: HTMLElement, opacity: number): void {
        if (!this.storm.opacitySupported) return;
        o.style.opacity = String(opacity);
    }

    melt(): void {
        if (!this.storm.useMeltEffect || !this.melting) {
            this.recycle();
        } else {
            if (this.meltFrame < this.meltFrameCount) {
                this.setOpacity(this.o, this.meltFrames[this.meltFrame]);
                this.o.style.fontSize = `${this.fontSize - (this.fontSize * (this.meltFrame / this.meltFrameCount))}px`;
                this.o.style.lineHeight = `${this.storm.flakeHeight + 2 + (this.storm.flakeHeight * 0.75 * (this.meltFrame / this.meltFrameCount))}px`;
                this.meltFrame++;
            } else {
                this.recycle();
            }
        }
    }

    recycle(): void {
        this.o.style.display = 'none';
        this.o.style.position = (this.storm.fixedForEverything ? 'fixed' : 'absolute');
        this.o.style.bottom = 'auto';
        this.setVelocities();
        this.vCheck();
        this.meltFrame = 0;
        this.melting = false;
        this.setOpacity(this.o, 1);
        this.o.style.padding = '0px';
        this.o.style.margin = '0px';
        this.o.style.fontSize = `${this.fontSize}px`;
        this.o.style.lineHeight = `${(this.storm.flakeHeight + 2)}px`;
        this.o.style.textAlign = 'center';
        this.o.style.verticalAlign = 'baseline';
        const screenX = this.storm.screenX;
        const screenY = this.storm.screenY;
        this.x = Math.floor(Math.random() * Math.max(1, screenX - this.storm.flakeWidth - 20));
        this.y = Math.floor(Math.random() * Math.max(1, screenY)) * -1 - this.storm.flakeHeight;
        this.refresh();
        this.o.style.display = 'block';
        this.active = 1;
    }
}

// Singleton instance for easy imports
// export const snowStorm = isBrowser() ? new SnowStorm() : undefined;
