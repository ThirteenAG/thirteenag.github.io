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

const WFPCollection = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./content/wfp" }),
    schema: ({ image }) => z.object({
        tag: z.string(),
        title: z.string(),
        support: z.object({
            version: z.string(),
            tooltip: z.string().optional(),
        }),
        color: z.string(),
        download: z.string().url(),
        icons: z.array(z.object({
            name: z.string(),
            url: z.string().url(),
            tooltip: z.string().optional(),
        })).optional(),
        logo: image(),
        main1: image(),
        stripe: image(),
        main2: image(),
    }),
});

export const collections = {
    'home': homeCollection,
    'wfp': WFPCollection,
};
