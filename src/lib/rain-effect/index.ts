// Libraries
import { loadAssets } from './assets/loader';
import Raindrops from './raindrops';
import createCanvas from './utils/create-canvas';
import RainRenderer from './rain-renderer';
import { gsap } from 'gsap';
import { chance, random } from './utils/random';
import times from './utils/times';
import { defaultAssets } from './assets';

let textureRainFg: HTMLImageElement, textureRainBg: HTMLImageElement,
    textureStormLightningFg: HTMLImageElement, textureStormLightningBg: HTMLImageElement,
    textureFalloutFg: HTMLImageElement, textureFalloutBg: HTMLImageElement,
    textureSunFg: HTMLImageElement, textureSunBg: HTMLImageElement,
    textureDrizzleFg: HTMLImageElement, textureDrizzleBg: HTMLImageElement,
    dropColor: HTMLImageElement, dropAlpha: HTMLImageElement;

let textureFg: HTMLCanvasElement,
    textureFgCtx: CanvasRenderingContext2D,
    textureBg: HTMLCanvasElement,
    textureBgCtx: CanvasRenderingContext2D;

const textureBgSize = {
    width: 384,
    height: 256
}
const textureFgSize = {
    width: 96,
    height: 64
}

let raindrops: Raindrops,
    renderer: RainRenderer,
    canvas: HTMLCanvasElement;

const parallax = { x: 0, y: 0 };

let weatherData: { [key: string]: WeatherData };
let curWeatherData: WeatherData;
const blend = { v: 0 };



export async function loadTextures(canvasId: string) {
    // if correct texture overrides are provided,then load them, otherwise use the existing ones

    const assets = await loadAssets(defaultAssets);

    textureRainFg = assets.textureRainFg.img;
    textureRainBg = assets.textureRainBg.img;

    textureFalloutFg = assets.textureFalloutFg.img;
    textureFalloutBg = assets.textureFalloutBg.img;

    textureStormLightningFg = assets.textureStormLightningFg.img;
    textureStormLightningBg = assets.textureStormLightningBg.img;

    textureSunFg = assets.textureSunFg.img;
    textureSunBg = assets.textureSunBg.img;

    textureDrizzleFg = assets.textureDrizzleFg.img;
    textureDrizzleBg = assets.textureDrizzleBg.img;

    dropColor = assets.dropColor.img;
    dropAlpha = assets.dropAlpha.img;

    init(canvasId);
}

function init(canvasId: string) {
    canvas = document.querySelector(`#${canvasId}`) as HTMLCanvasElement;

    var dpi = window.devicePixelRatio;

    canvas.width = window.innerWidth * dpi;
    canvas.height = window.innerHeight * dpi;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    raindrops = new Raindrops(
        canvas.width,
        canvas.height,
        dpi,
        dropAlpha,
        dropColor,
        {
            trailRate: 1,
            trailScaleRange: [0.2, 0.45],
            collisionRadius: 0.45,
            dropletsCleaningRadiusMultiplier: 0.28,
        }
    );

    textureFg = createCanvas(textureFgSize.width, textureFgSize.height);
    const fgCtx = textureFg.getContext('2d');
    if (!fgCtx) return;
    textureFgCtx = fgCtx;
    textureBg = createCanvas(textureBgSize.width, textureBgSize.height);
    const bgCtx = textureBg.getContext('2d');
    if (!bgCtx) return;
    textureBgCtx = bgCtx;

    generateTextures(textureRainFg, textureRainBg);

    renderer = new RainRenderer(canvas, raindrops.canvas, textureFg, textureBg, null, {
        brightness: 1.04,
        alphaMultiply: 6,
        alphaSubtract: 3,
        minRefraction: 128
        // minRefraction:256,
        // maxRefraction:512
    });

    setupEvents();

    function onResize() {
        var dpi = window.devicePixelRatio;
        canvas.width = window.innerWidth * dpi;
        canvas.height = window.innerHeight * dpi;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;

        raindrops.resize(canvas.width, canvas.height);
        renderer.resize(canvas.width, canvas.height);
        renderer.updateTextures();
    }

    window.addEventListener('resize', onResize);
}

function setupEvents() {
    setupParallax();
    setupWeather();
    setupFlash();
}

function setupParallax() {
    document.addEventListener('mousemove', (event) => {
        const x = event.pageX;
        const y = event.pageY;

        gsap.to(parallax, 1, {
            x: ((x / canvas.width) * 2) - 1,
            y: ((y / canvas.height) * 2) - 1,
            // ease:Quint.easeOut,
            onUpdate: () => {
                renderer.parallaxX = parallax.x;
                renderer.parallaxY = parallax.y;
            }
        })
    });
}
function setupFlash() {
    setInterval(() => {
        if (chance(curWeatherData.flashChance)) {
            flash(curWeatherData.bg, curWeatherData.fg, curWeatherData.flashBg, curWeatherData.flashFg);
        }
    }, 500);
}

function setupWeather() {
    setupWeatherData();
    window.addEventListener("hashchange", () => {
        updateWeather();
    });
    updateWeather();
}

type WeatherData = {
    minR: number,
    maxR: number,
    rainChance: number,
    rainLimit: number,
    drizzle: number,
    drizzleSize: number[],
    raining: boolean,
    trailRate: number,
    trailScaleRange: number[],
    fg: HTMLImageElement,
    bg: HTMLImageElement,
    flashFg: HTMLImageElement | null,
    flashBg: HTMLImageElement | null,
    flashChance: number
}

function setupWeatherData() {
    const defaultWeather: WeatherData = {
        minR: 10,
        maxR: 40,
        rainChance: 0.35,
        rainLimit: 6,
        drizzle: 50,
        drizzleSize: [2, 4.5],
        raining: true,
        trailRate: 1,
        trailScaleRange: [0.2, 0.35],
        fg: textureRainFg,
        bg: textureRainBg,
        flashFg: null,
        flashBg: null,
        flashChance: 0
    };

    function weather(data: Partial<WeatherData>) {
        return { ...defaultWeather, ...data };
    };

    weatherData = {
        rain: weather({
            rainChance: 0.35,
            rainLimit: 6,
            drizzle: 50,
            raining: true,
            // trailRate:2.5,
            fg: textureRainFg,
            bg: textureRainBg
        }),
        storm: weather({
            minR: 20,
            maxR: 45,
            rainChance: 0.55,
            rainLimit: 6,
            drizzle: 80,
            drizzleSize: [2, 6],
            trailRate: 1,
            trailScaleRange: [0.15, 0.3],
            fg: textureRainFg,
            bg: textureRainBg,
            flashFg: textureStormLightningFg,
            flashBg: textureStormLightningBg,
            flashChance: 0.1
        }),
        fallout: weather({
            rainChance: 0.35,
            rainLimit: 6,
            drizzle: 20,
            trailRate: 4,
            fg: textureFalloutFg,
            bg: textureFalloutBg
        }),
        drizzle: weather({
            rainChance: 0.15,
            rainLimit: 2,
            drizzle: 10,
            fg: textureDrizzleFg,
            bg: textureDrizzleBg
        }),
        sunny: weather({
            rainChance: 0,
            rainLimit: 0,
            drizzle: 0,
            raining: false,
            fg: textureSunFg,
            bg: textureSunBg
        })
    };
}
function updateWeather() {
    var hash = window.location.hash;
    var currentSlide: Element | null = null;
    // var currentNav = null;
    if (hash !== "") {
        currentSlide = document.querySelector(hash);
    }
    if (currentSlide == null) {
        currentSlide = document.querySelector(".slide") as Element;
        hash = `#${currentSlide.getAttribute("id")}`;
    }
    // currentNav = document.querySelector("[href='" + hash + "']");
    const weatherKey = currentSlide.getAttribute('data-weather') || 'rain';
    const data = weatherData[weatherKey];
    curWeatherData = data;
    raindrops.options = Object.assign(raindrops.options, data);
    raindrops.clearDrops();

    gsap.fromTo(
        blend,
        { v: 0 },
        {
            duration: 1,
            v: 1,
            onUpdate: () => {
                generateTextures(data.fg, data.bg, blend.v);
                renderer.updateTextures();
            }
        }
    );

    var lastSlide = document.querySelector(".slide--current");
    if (lastSlide != null) lastSlide.classList.remove("slide--current");

    var lastNav = document.querySelector(".nav-item--current");
    if (lastNav != null) lastNav.classList.remove("nav-item--current");

    currentSlide.classList.add("slide--current");
    //currentNav.classList.add("nav-item--current");
}

function flash(
    baseBg: CanvasImageSource,
    baseFg: CanvasImageSource,
    flashBg: CanvasImageSource | null = null,
    flashFg: CanvasImageSource | null = null,
) {
    const flashValue = { v: 0 };

    function transitionFlash(to: number, t = 0.025) {
        return new Promise<void>((resolve) => {
            gsap.to(flashValue, {
                duration: t,
                v: to,
                // ease:Quint.easeOut,
                onUpdate: () => {
                    generateTextures(baseFg, baseBg);
                    flashBg && flashFg && generateTextures(flashFg, flashBg, flashValue.v);
                    renderer.updateTextures();
                },
                onComplete: resolve
            });
        });
    }

    let lastFlash = transitionFlash(1);
    times(random(2, 7), (_i: number) => {
        lastFlash = lastFlash.then(() => {
            return transitionFlash(random(0.1, 1))
        })
    })
    lastFlash = lastFlash.then(() => {
        return transitionFlash(1, 0.1);
    }).then(() => {
        transitionFlash(0, 0.25);
    });
}

function generateTextures(fg: CanvasImageSource, bg: CanvasImageSource, alpha = 1) {
    textureFgCtx.globalAlpha = alpha;
    textureFgCtx.drawImage(fg, 0, 0, textureFgSize.width, textureFgSize.height);

    textureBgCtx.globalAlpha = alpha;
    textureBgCtx.drawImage(bg, 0, 0, textureBgSize.width, textureBgSize.height);
}
