type LoadedImage = {
    name: string;
    src: string;
    img: HTMLImageElement;
}

function loadImage(src: Partial<LoadedImage>, i: number, onLoad: Function | null) {
    return new Promise<LoadedImage>((resolve) => {
        // if (typeof src === "string") {
        //     src = {
        //         name: "image" + i,
        //         src,
        //     };
        // }

        const img = new Image();
        src.img = img;
        img.addEventListener("load", (event) => {
            if (typeof onLoad === "function") {
                onLoad.call(null, img, i);
            }
            resolve(src);
        });
        img.src = src.src;
    })
}

export function loadImages(
    images: Partial<LoadedImage>[],
    onLoad: Function | null = null
) {
    return Promise.all(images.map((src, i) => {
        return loadImage(src, i, onLoad);
    }));
}

export default function ImageLoader(images: Partial<LoadedImage>[], onLoad: Function | null = null) {
    return new Promise<{ [key: string]: LoadedImage }>((resolve, reject) => {
        loadImages(images, onLoad).then((loadedImages) => {
            const r: { [key: string]: LoadedImage } = {};
            loadedImages.forEach((curImage) => {
                r[curImage.name] = {
                    img: curImage.img,
                    src: curImage.src,
                };
            })

            resolve(r);
        });
    })
}