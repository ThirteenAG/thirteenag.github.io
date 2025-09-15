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

export const collections = {
    'home': homeCollection,
};
