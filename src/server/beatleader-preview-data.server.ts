import { z } from 'zod';

import { requestJson } from '../sources/http';

export interface BeatLeaderPreviewScore {
  accuracy: number;
  pp: number;
  modifiedScore: number;
  rank: number;
  badCuts: number;
  missedNotes: number;
  fullCombo: boolean;
  song: {
    name: string;
    subName: string;
    author: string;
    mapper: string;
    cover: string;
  };
  player: {
    id: string;
    name: string;
    avatar: string;
    country: string;
    rank: number;
    countryRank: number;
  };
  difficulty: {
    difficultyName: string;
    modeName: string;
    status: number;
    stars: number;
  };
}

const beatLeaderPreviewScoreSchema = z.object({
  accuracy: z.number(),
  pp: z.number(),
  modifiedScore: z.number(),
  rank: z.number(),
  badCuts: z.number(),
  missedNotes: z.number(),
  fullCombo: z.boolean(),
  song: z.object({
    name: z.string(),
    subName: z.string(),
    author: z.string(),
    mapper: z.string(),
    cover: z.string(),
  }),
  player: z.object({
    id: z.string().min(1),
    name: z.string(),
    avatar: z.string(),
    country: z.string().default(''),
    rank: z.number().default(0),
    countryRank: z.number().default(0),
  }),
  difficulty: z.object({
    difficultyName: z.string(),
    modeName: z.string(),
    status: z
      .number()
      .nullable()
      .default(0)
      .transform((v) => v ?? 0),
    stars: z
      .number()
      .nullable()
      .default(0)
      .transform((v) => v ?? 0),
  }),
}) satisfies z.ZodType<BeatLeaderPreviewScore>;

export function fetchBeatLeaderPreviewScore(scoreId: string) {
  return requestJson(`https://api.beatleader.com/score/${scoreId}`, beatLeaderPreviewScoreSchema, {
    source: 'beatleader',
    label: `BeatLeader score ${scoreId}`,
    operation: 'load-score-preview',
  });
}
