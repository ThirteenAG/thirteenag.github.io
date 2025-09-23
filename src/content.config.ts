import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import type { ZodString } from 'astro:schema';

// Validators
const preprocessEmptyToUndefined = (v: unknown) => {
    if (typeof v === "string") {
        const trimmed = v.trim();
        return trimmed === "" ? undefined : trimmed;
    }
    if (v === null) {
        return undefined;
    }
    return v;
};

const string = (): ZodString => z.string().nonempty();
const optionalString = () => z.preprocess(preprocessEmptyToUndefined, z.string().optional());
const url = () => z.string().nonempty().url();
const optionalUrl = () => z.preprocess(preprocessEmptyToUndefined, z.string().url().optional());

// Collections

const homeCollection = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/home" }),
    schema: ({ image }) => z.object({
        title: string(),
        image: image(),
        href: string(),
    }),
});

const sponsorsCollection = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/sponsors" }),
    schema: z.object({
        id: string(),
        name: string(),
        color: string(),
        url: url(),
        tooltip: optionalString(),
        icon: string(),
    }),
});

const WFPCollection = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/wfp" }),
    schema: ({ image }) => z.object({
        id: string(),
        tag: string(),
        title: string(),
        support: z.object({
            version: string(),
            tooltip: optionalString(),
        }),
        color: string(),
        download: url(),
        downloads: z.array(z.object({
            name: string(),
            url: url(),
        })).optional(),
        icons: z.array(z.object({
            name: string(),
            url: url(),
            tooltip: optionalString(),
        })).optional(),
        logo: image(),
        stripe: image().optional(),
        before: image(),
        after: image(),
        screenshots: z.object({
            background: optionalUrl(),
            images: z.optional(z.array(url())),
            youtube: optionalUrl(),
        }).optional(),
    }),
});

const GOLCollection = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/gol" }),
    schema: () => z.object({
        id: string(),
        name: string(),
        url: url(),
    }),
});

export const collections = {
    'home': homeCollection,
    'sponsors': sponsorsCollection,
    'wfp-games': WFPCollection,
    'gol': GOLCollection,
};
