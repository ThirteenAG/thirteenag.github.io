import type { Asset, Assets } from "./default-assets";

interface LoadedAsset extends Asset {
    img: HTMLImageElement;
}

type LoadedAssets = {
    [K in keyof Assets]: LoadedAsset;
}

async function getImage(src: string): Promise<HTMLImageElement> {
    const img = new Image();
    // Hint browsers to decode off the main thread when possible
    // and ensure decode is complete before we hand the image off.
    img.decoding = 'async';
    img.src = src;

    // Prefer decode() (non-blocking, ensures readiness).
    // Fallback to load/error events for older browsers.
    try {
        await img.decode();
    } catch {
        await new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
        });
    }

    return img;
}

async function loadAsset(asset: Asset): Promise<void> {
    asset.img = await getImage(asset.src);
}

export async function loadAssets(assets: Assets): Promise<LoadedAssets> {
    const promises = Object.values(assets).map((asset) => loadAsset(asset));
    await Promise.all(promises);
    return assets as LoadedAssets;
}