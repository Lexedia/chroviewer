import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { enabledViewerSourcesSchema } from './sources/source-options';

const localHostnames = new Set(['localhost', '0.0.0.0', '127.0.0.1', '[::1]']);

const publicApiUrl = z
  .url()
  .refine(
    (value) => {
      const url = new URL(value);
      return url.protocol === 'https:' || (url.protocol === 'http:' && localHostnames.has(url.hostname));
    },
    { message: 'must be https, or localhost http' },
  )
  .transform((value) => value.replace(/\/$/, ''));
const originList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ''),
  )
  .pipe(z.array(publicApiUrl.transform((value) => new URL(value).origin)));
export const env = createEnv({
  isServer: false,
  clientPrefix: 'VITE_',
  client: {
    VITE_BEATSAVER_API_URL: publicApiUrl.default('https://api.beatsaver.com'),
    VITE_SCORESABER_API_URL: publicApiUrl.default('https://scoresaber.com'),
    VITE_BEATLEADER_API_URL: publicApiUrl.default('https://api.beatleader.com'),
    VITE_LUDUS_URL: publicApiUrl.default('https://ludus-1.scoresaber.com'),
    VITE_ENABLED_SOURCES: enabledViewerSourcesSchema,
    VITE_BEATDLE_PARENT_ORIGINS: originList.default([]),
  },
  runtimeEnvStrict: {
    VITE_BEATSAVER_API_URL: import.meta.env.VITE_BEATSAVER_API_URL,
    VITE_SCORESABER_API_URL: import.meta.env.VITE_SCORESABER_API_URL,
    VITE_BEATLEADER_API_URL: import.meta.env.VITE_BEATLEADER_API_URL,
    VITE_LUDUS_URL: import.meta.env.VITE_LUDUS_URL,
    VITE_ENABLED_SOURCES: import.meta.env.VITE_ENABLED_SOURCES,
    VITE_BEATDLE_PARENT_ORIGINS: import.meta.env.VITE_BEATDLE_PARENT_ORIGINS,
  },
  emptyStringAsUndefined: true,
});
