import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { fetchBeatSaverMapPreview } from './beatsaver-preview-data.server';

export const getBeatSaverMapPreviewTitle = createServerFn({ method: 'GET' })
  .validator(z.object({ key: z.string().min(1) }))
  .handler(async ({ data: { key } }) => {
    const result = await fetchBeatSaverMapPreview(key);
    if (result.isErr()) return 'BeatSaver';
    const { songName, songSubName, songAuthorName } = result.value;
    const title = songSubName === '' ? songName : `${songName} ${songSubName}`;
    return title || songAuthorName || 'BeatSaver';
  });
