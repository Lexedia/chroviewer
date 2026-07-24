import { createFileRoute } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequestUrl } from '@tanstack/react-start/server';
import { Result } from 'better-result';

import { viewerSearchSchema } from '../modules/viewer/viewer-search';
import { getMapPreviewMetadata } from '../server/map-preview-metadata.functions';
import { getPartyPreviewMetadata } from '../server/party-preview-metadata.functions';
import { getBeatLeaderReplayPreviewTitle, getReplayPreviewTitle } from '../server/replay-preview-metadata.functions';

import { env } from '@/env';

const requestOrigin = createIsomorphicFn()
  .server(() => getRequestUrl().origin)
  .client(() => window.location.origin);

const defaultImage = 'https://scoresaber.com/ScoreSaber-iOS-Default-1024x1024@1x.png';

const ogImageMeta = (image: string, alt: string) => [
  { property: 'og:image', content: image },
  { property: 'og:image:width', content: '1200' },
  { property: 'og:image:height', content: '630' },
  { property: 'og:image:type', content: 'image/png' },
  { property: 'og:image:alt', content: alt },
  { name: 'twitter:card', content: 'summary_large_image' },
  { name: 'twitter:image', content: image },
  { name: 'twitter:image:alt', content: alt },
];

export const Route = createFileRoute('/')({
  ssr: false,
  validateSearch: viewerSearchSchema,
  head: async ({ match }) => {
    const partyPlayerId = match.search.party;
    if (partyPlayerId !== undefined) {
      const metadataResult = await Result.tryPromise({
        try: () => getPartyPreviewMetadata({ data: { playerId: partyPlayerId } }),
        catch: (cause) => cause,
      });
      const metadata = metadataResult.isOk()
        ? metadataResult.value
        : {
            title: 'Join this watch party',
            description: 'Watch Beat Saber together live on ScoreSaber Watch',
            playerName: null,
            avatarUrl: null,
          };
      const imageUrl = new URL('/api/preview/party', requestOrigin());
      imageUrl.searchParams.set('playerId', partyPlayerId);
      if (metadata.playerName !== null) imageUrl.searchParams.set('name', metadata.playerName);
      if (metadata.avatarUrl !== null) imageUrl.searchParams.set('avatar', metadata.avatarUrl);
      const image = imageUrl.toString();
      const alt = 'ScoreSaber watch party invitation';
      return {
        meta: [
          { title: metadata.title },
          { property: 'og:title', content: metadata.title },
          { property: 'og:description', content: metadata.description },
          { name: 'description', content: metadata.description },
          { property: 'og:image', content: image },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
          { property: 'og:image:type', content: 'image/png' },
          { property: 'og:image:alt', content: alt },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:title', content: metadata.title },
          { name: 'twitter:description', content: metadata.description },
          { name: 'twitter:image', content: image },
          { name: 'twitter:image:alt', content: alt },
        ],
      };
    }

    const scoreIdBL = match.search.scoreIdBL;
    if (scoreIdBL !== undefined) {
      const titleResult = await Result.tryPromise({
        try: () => getBeatLeaderReplayPreviewTitle({ data: { scoreId: scoreIdBL } }),
        catch: (cause) => cause,
      });
      const title = titleResult.isOk() ? titleResult.value : 'BeatLeader Replay';
      const description = env.VITE_VIEWER_NAME;
      const image = new URL(`/api/preview/replay?scoreIdBL=${scoreIdBL}`, requestOrigin()).toString();
      const alt = 'BeatLeader replay score card';
      return {
        meta: [
          { title },
          { name: 'theme-color', content: '#d41f88' },
          { property: 'og:site_name', content: 'BeatLeader' },
          { property: 'og:title', content: title },
          { property: 'og:description', content: description },
          { name: 'description', content: description },
          ...ogImageMeta(image, alt),
          { name: 'twitter:title', content: title },
          { name: 'twitter:description', content: description },
        ],
      };
    }

    const scoreId = match.search.scoreId;
    if (scoreId !== undefined) {
      const titleResult = await Result.tryPromise({
        try: () => getReplayPreviewTitle({ data: { scoreId } }),
        catch: (cause) => cause,
      });
      const title = titleResult.isOk() ? titleResult.value : 'ScoreSaber Replay';
      const description = env.VITE_VIEWER_NAME;
      const image = new URL(`/api/preview/replay?scoreId=${scoreId}`, requestOrigin()).toString();
      const alt = 'ScoreSaber replay score card';
      return {
        meta: [
          { title },
          { name: 'theme-color', content: '#facc15' },
          { property: 'og:title', content: title },
          { property: 'og:description', content: description },
          { name: 'description', content: description },
          ...ogImageMeta(image, alt),
          { name: 'twitter:title', content: title },
          { name: 'twitter:description', content: description },
        ],
      };
    }

    const mapKey = match.search.map?.match(/^[0-9a-f]{1,16}$/i)?.[0].toLowerCase();
    if (mapKey !== undefined) {
      const metadataResult = await Result.tryPromise({
        try: () => getMapPreviewMetadata({ data: { mapKey } }),
        catch: (cause) => cause,
      });
      const metadata = metadataResult.isOk()
        ? metadataResult.value
        : { title: 'BeatSaver Map', description: 'Preview this Beat Saber map in ChroViewer' };
      const image = new URL(`/api/preview/map?mapKey=${mapKey}`, requestOrigin()).toString();
      const alt = 'BeatSaver map preview card';
      return {
        meta: [
          { title: metadata.title },
          { name: 'theme-color', content: '#514290' },
          { property: 'og:site_name', content: 'BeatSaver' },
          { property: 'og:title', content: metadata.title },
          { property: 'og:description', content: metadata.description },
          { name: 'description', content: metadata.description },
          { property: 'og:image', content: image },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
          { property: 'og:image:type', content: 'image/png' },
          { property: 'og:image:alt', content: alt },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:title', content: metadata.title },
          { name: 'twitter:description', content: metadata.description },
          { name: 'twitter:image', content: image },
          { name: 'twitter:image:alt', content: alt },
        ],
      };
    }

    return {
      meta: [
        { title: env.VITE_SITE_NAME },
        { property: 'og:site_name', content: 'ScoreSaber' },
        { property: 'og:title', content: env.VITE_SITE_NAME },
        { name: 'theme-color', content: '#facc15' },
        { property: 'og:image', content: defaultImage },
        { property: 'og:image:width', content: '1024' },
        { property: 'og:image:height', content: '1024' },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:alt', content: 'ScoreSaber logo' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:site', content: '@ScoreSaber' },
        { name: 'twitter:title', content: env.VITE_SITE_NAME },
        { name: 'twitter:image', content: defaultImage },
        { name: 'twitter:image:alt', content: 'ScoreSaber logo' },
      ],
    };
  },
});
