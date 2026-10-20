import { useEffect, useRef } from 'react';

import * as z from 'zod/mini';

import { env } from '../../env';

const beatdleCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('beatdle:hello') }),
  z.object({ type: z.literal('beatdle:unmute') }),
  z.object({ type: z.literal('beatdle:play') }),
  z.object({ type: z.literal('beatdle:pause') }),
  z.object({ type: z.literal('beatdle:seek'), time: z.number().check(z.nonnegative()) }),
]);

type BeatdleCommand = Exclude<z.infer<typeof beatdleCommandSchema>, { type: 'beatdle:hello' }>;

interface BeatdleBridgeOptions {
  enabled: boolean;
  ready: boolean;
  duration: number;
  onCommand: (command: BeatdleCommand) => void;
}

export function useBeatdleBridge({ enabled, ready, duration, onCommand }: BeatdleBridgeOptions) {
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const readyStateRef = useRef({ ready, duration });
  readyStateRef.current = { ready, duration };
  const parentOrigins = env.VITE_BEATDLE_PARENT_ORIGINS;
  const active = enabled && window.parent !== window;

  useEffect(() => {
    if (!active) return;
    if (parentOrigins.length === 0) {
      console.warn('[beatdle] VITE_BEATDLE_PARENT_ORIGINS is not set, so the parent page cannot control the viewer');
    }

    function handleMessage(event: MessageEvent<unknown>) {
      if (event.source !== window.parent) return;
      const command = beatdleCommandSchema.safeParse(event.data);
      if (!command.success) return;
      if (!parentOrigins.includes(event.origin)) {
        console.warn(`[beatdle] ignored a message from ${event.origin}, add it to VITE_BEATDLE_PARENT_ORIGINS`);
        return;
      }
      if (command.data.type === 'beatdle:hello') {
        const state = readyStateRef.current;
        if (state.ready) window.parent.postMessage({ type: 'beatdle:ready', duration: state.duration }, event.origin);
        return;
      }
      onCommandRef.current(command.data);
    }
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [active, parentOrigins]);

  useEffect(() => {
    if (!active || !ready) return;
    for (const origin of parentOrigins) window.parent.postMessage({ type: 'beatdle:ready', duration }, origin);
  }, [active, duration, parentOrigins, ready]);
}
