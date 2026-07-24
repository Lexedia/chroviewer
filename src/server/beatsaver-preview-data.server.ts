import { z } from 'zod';

import { requestJson } from '../sources/http';

const difficultySchema = z.object({
  difficulty: z.enum(['Easy', 'Normal', 'Hard', 'Expert', 'ExpertPlus']),
  characteristic: z.string().optional(),
  stars: z.number().optional(),
});

export interface BeatSaverPreviewData {
  name: string;
  songName: string;
  songSubName: string;
  songAuthorName: string;
  levelAuthorName: string;
  bpm: number;
  duration: number;
  coverUrl: string;
  difficulties: { difficulty: string; characteristic?: string; stars?: number }[];
}

const beatSaverMapPreviewSchema = z.object({
  name: z.string().optional(),
  metadata: z
    .object({
      songName: z.string().optional(),
      songSubName: z.string().optional(),
      songAuthorName: z.string().optional(),
      levelAuthorName: z.string().optional(),
      bpm: z.number().optional(),
      duration: z.number().optional(),
    })
    .optional(),
  versions: z
    .array(
      z.object({
        coverURL: z.string().optional(),
        diffs: z.array(difficultySchema).optional(),
      }),
    )
    .min(1),
});

export async function fetchBeatSaverMapPreview(key: string) {
  const result = await requestJson(`https://api.beatsaver.com/maps/id/${key}`, beatSaverMapPreviewSchema, {
    source: 'beatsaver',
    label: `BeatSaver map ${key}`,
    operation: 'load-map-preview',
  });
  return result.map(
    (data): BeatSaverPreviewData => ({
      name: data.name ?? '',
      songName: data.metadata?.songName ?? '',
      songSubName: data.metadata?.songSubName ?? '',
      songAuthorName: data.metadata?.songAuthorName ?? '',
      levelAuthorName: data.metadata?.levelAuthorName ?? '',
      bpm: data.metadata?.bpm ?? 0,
      duration: data.metadata?.duration ?? 0,
      coverUrl: data.versions[0]?.coverURL ?? '',
      difficulties: data.versions[0]?.diffs ?? [],
    }),
  );
}
