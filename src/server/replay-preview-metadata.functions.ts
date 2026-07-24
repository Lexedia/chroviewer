import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { fetchBeatLeaderPreviewScore } from './beatleader-preview-data.server';
import { fetchReplayPreviewScore } from './replay-preview-data.server';

export const getReplayPreviewTitle = createServerFn({ method: 'GET' })
  .validator(z.object({ scoreId: z.string().regex(/^\d{1,20}$/) }))
  .handler(async ({ data: { scoreId } }) => {
    const result = await fetchReplayPreviewScore(scoreId);
    if (result.isErr()) return 'ScoreSaber Replay';

    const { score, leaderboard } = result.value;
    const map = leaderboard.map;
    const songTitle = map.songSubName === '' ? map.songName : `${map.songName} ${map.songSubName}`;
    const pp = score.pp > 0 ? ` / ${score.pp.toFixed(2)}pp` : '';
    return `Replay - ${score.player.name} (${(score.accuracy * 100).toFixed(2)}%${pp}) [${songTitle}]`;
  });

export const getBeatLeaderReplayPreviewTitle = createServerFn({ method: 'GET' })
  .validator(z.object({ scoreId: z.string().regex(/^\d{1,20}$/) }))
  .handler(async ({ data: { scoreId } }) => {
    const result = await fetchBeatLeaderPreviewScore(scoreId);
    if (result.isErr()) return 'BeatLeader Replay';

    const { accuracy, pp, song, player } = result.value;
    const songTitle = song.subName === '' ? song.name : `${song.name} ${song.subName}`;
    return `BL Replay - ${player.name} (${(accuracy * 100).toFixed(2)}% / ${pp.toFixed(2)}pp) [${songTitle}]`;
  });

export const getBeatLeaderReplayPreviewCoverUrl = createServerFn({ method: 'GET' })
  .validator(z.object({ scoreId: z.string().regex(/^\d{1,20}$/) }))
  .handler(async ({ data: { scoreId } }) => {
    const result = await fetchBeatLeaderPreviewScore(scoreId);
    if (result.isErr()) return null;
    return result.value.song.cover || null;
  });
