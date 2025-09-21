import DropColor from "./img/drop-color.png";
import DropAlpha from "./img/drop-alpha.png";
import TextureRainFg from "./img/weather/texture-rain-fg.png";
import TextureRainBg from "./img/weather/texture-rain-bg.png";
import TextureSunFg from "./img/weather/texture-sun-fg.png";
import TextureSunBg from "./img/weather/texture-sun-bg.png";
import TextureFalloutFg from "./img/weather/texture-fallout-fg.png";
import TextureFalloutBg from "./img/weather/texture-fallout-bg.png";
import TextureDrizzleFg from "./img/weather/texture-drizzle-fg.png";
import TextureDrizzleBg from "./img/weather/texture-drizzle-bg.png";
import TextureStormLightningFg from "./img/weather/texture-storm-lightning-fg.png";
import TextureStormLightningBg from "./img/weather/texture-storm-lightning-bg.png";

export type Asset = {
    img?: HTMLImageElement;
    src: string;
}

export type Assets = {
    dropAlpha: Asset;
    dropColor: Asset;
    textureRainFg: Asset;
    textureRainBg: Asset;
    textureStormLightningFg: Asset;
    textureStormLightningBg: Asset;
    textureFalloutFg: Asset;
    textureFalloutBg: Asset;
    textureSunFg: Asset;
    textureSunBg: Asset;
    textureDrizzleFg: Asset;
    textureDrizzleBg: Asset;
}

export const defaultAssets: Assets = {
    dropAlpha: { src: DropAlpha.src },
    dropColor: { src: DropColor.src },
    textureRainFg: { src: TextureRainFg.src },
    textureRainBg: { src: TextureRainBg.src },
    textureStormLightningFg: { src: TextureStormLightningFg.src },
    textureStormLightningBg: { src: TextureStormLightningBg.src },
    textureFalloutFg: { src: TextureFalloutFg.src },
    textureFalloutBg: { src: TextureFalloutBg.src },
    textureSunFg: { src: TextureSunFg.src },
    textureSunBg: { src: TextureSunBg.src },
    textureDrizzleFg: { src: TextureDrizzleFg.src },
    textureDrizzleBg: { src: TextureDrizzleBg.src },
};