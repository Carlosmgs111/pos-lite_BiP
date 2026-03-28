import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const logbook = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/logbook' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()),
    testSuites: z.array(z.string()).default([]),
  }),
});

export const collections = { logbook };
