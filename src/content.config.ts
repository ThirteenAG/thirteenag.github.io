import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const homeCollection = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/home" }),
    schema: ({ image }) => z.object({
        title: z.string(),
        image: image(),
        href: z.string(),
    }),
});

const WFPGamesCollection = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/wfp/games" }),
    schema: ({ image }) => z.object({
        id: z.string(),
        tag: z.string(),
        title: z.string(),
        support: z.object({
            version: z.string(),
            tooltip: z.string().optional(),
        }),
        color: z.string(),
        download: z.string().url(),
        downloads: z.array(z.object({
            name: z.string(),
            url: z.string().url(),
        })).optional(),
        icons: z.array(z.object({
            name: z.string(),
            url: z.string().url(),
            tooltip: z.string().optional(),
        })).optional(),
        logo: image(),
        stripe: image().optional(),
        before: image(),
        after: image(),
    }),
});

export const collections = {
    'home': homeCollection,
    'wfp-games': WFPGamesCollection,
};
