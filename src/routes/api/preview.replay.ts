import { createFileRoute } from '@tanstack/react-router';

import { renderBeatLeaderReplayPreview, renderReplayPreview } from '../../server/preview-image';

const errorHeaders = { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' };

export const Route = createFileRoute('/api/preview/replay')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const scoreId = url.searchParams.get('scoreId');
        const scoreIdBL = url.searchParams.get('scoreIdBL');
        if (!scoreId && !scoreIdBL) {
          return new Response('scoreId or scoreIdBL is required', { status: 400, headers: errorHeaders });
        }

        let result;
        if (scoreIdBL) {
          if (!/^\d{1,20}$/.test(scoreIdBL)) {
            return new Response('invalid scoreIdBL', { status: 400, headers: errorHeaders });
          }
          result = await renderBeatLeaderReplayPreview(scoreIdBL, url.origin);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          if (!/^\d{1,20}$/.test(scoreId!)) {
            return new Response('invalid scoreId', { status: 400, headers: errorHeaders });
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          result = await renderReplayPreview(scoreId!, url.origin);
        }
        if (result.isErr()) {
          return new Response(result.error.message, { status: result.error.status, headers: errorHeaders });
        }
        return new Response(result.value, {
          headers: {
            'cache-control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=86400',
            'content-type': 'image/png',
            'x-content-type-options': 'nosniff',
          },
        });
      },
    },
  },
});
