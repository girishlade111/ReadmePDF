import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const LOCALES = ['en', 'es', 'ja', 'ko', 'zh', 'ru', 'tr', 'fr', 'pt'] as const;

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(90),
    description: z.string().max(180),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Girish Lade'),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    locale: z.enum(LOCALES).default('en'),
    translationKey: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  }),
});

export const collections = { blog };
