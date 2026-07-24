import type {
  Replay,
  ReplayHeightEvent,
  ReplayMetadata,
  ReplayNoteEvent,
  ReplayNoteEventType,
  ReplayPauseEvent,
  ReplayPose,
  ReplayQuaternion,
  ReplayVector3,
  ReplayWallEvent,
  ReplayScoreEvent,
  ReplayComboEvent,
  ReplayMultiplierEvent,
  ReplayEnergyEvent,
} from './types';

export const BEATLEADER_REPLAY_MAGIC = 0x442d3d69;

const maxListItems = 2_000_000;
const decoder = new TextDecoder();

class BinaryReader {
  private readonly view: DataView;
  private readonly limit: number;
  offset = 0;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.limit = bytes.byteLength;
  }

  private require(length: number) {
    if (!Number.isInteger(length) || length < 0 || this.offset + length > this.limit) {
      throw new Error('truncated BeatLeader replay');
    }
  }

  byte() {
    this.require(1);
    return this.bytes[this.offset++] ?? 0;
  }

  int32() {
    this.require(4);
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  int64() {
    this.require(8);
    const value = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return value;
  }

  float32() {
    this.require(4);
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    if (!Number.isFinite(value)) throw new Error('BeatLeader replay contains a non-finite number');
    return value;
  }

  bool() {
    return this.byte() !== 0;
  }

  string() {
    const length = this.int32();
    this.require(length);
    let value: string;
    try {
      value = decoder.decode(this.bytes.subarray(this.offset, this.offset + length));
    } catch {
      throw new Error('BeatLeader replay contains invalid UTF-8');
    }
    this.offset += length;
    return value;
  }

  count(label: string) {
    const count = this.int32();
    if (count < 0 || count > maxListItems) {
      throw new Error(`invalid BeatLeader replay ${label} count`);
    }
    return count;
  }

  raw(length: number) {
    this.require(length);
    const value = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }
}

export function isBeatLeaderReplay(data: Uint8Array) {
  if (data.byteLength < 4) return false;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return view.getInt32(0, true) === BEATLEADER_REPLAY_MAGIC;
}

function vector3(reader: BinaryReader): ReplayVector3 {
  return { x: reader.float32(), y: reader.float32(), z: reader.float32() };
}

function quaternion(reader: BinaryReader): ReplayQuaternion {
  return { ...vector3(reader), w: reader.float32() };
}

const scoreDefinitions: Record<
  number,
  { center: number; beforeMin: number; beforeMax: number; afterMin: number; afterMax: number; fixed: number }
> = {
  3: { center: 15, beforeMin: 0, beforeMax: 70, afterMin: 0, afterMax: 30, fixed: 0 },
  4: { center: 15, beforeMin: 0, beforeMax: 70, afterMin: 30, afterMax: 30, fixed: 0 },
  5: { center: 15, beforeMin: 70, beforeMax: 70, afterMin: 0, afterMax: 30, fixed: 0 },
  6: { center: 15, beforeMin: 0, beforeMax: 70, afterMin: 0, afterMax: 0, fixed: 0 },
  7: { center: 0, beforeMin: 0, beforeMax: 0, afterMin: 0, afterMax: 0, fixed: 20 },
  8: { center: 15, beforeMin: 70, beforeMax: 70, afterMin: 30, afterMax: 30, fixed: 0 },
  9: { center: 15, beforeMin: 70, beforeMax: 70, afterMin: 30, afterMax: 30, fixed: 0 },
  10: { center: 0, beforeMin: 0, beforeMax: 0, afterMin: 0, afterMax: 0, fixed: 20 },
  11: { center: 15, beforeMin: 0, beforeMax: 70, afterMin: 30, afterMax: 30, fixed: 0 },
  12: { center: 15, beforeMin: 70, beforeMax: 70, afterMin: 30, afterMax: 30, fixed: 0 },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function roundToEven(value: number) {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return lower % 2 === 0 ? lower : lower + 1;
}

const legacyDifficultyRanks: Record<string, number> = {
  easy: 1,
  normal: 3,
  hard: 5,
  expert: 7,
  expertplus: 9,
};

export function parseBeatLeaderReplay(data: Uint8Array): Replay {
  const reader = new BinaryReader(data);
  const magic = reader.int32();
  if (magic !== BEATLEADER_REPLAY_MAGIC) throw new Error('invalid BeatLeader replay magic number');
  const version = reader.byte();

  let metadata: ReplayMetadata | undefined;
  const poses: ReplayPose[] = [];
  const notes: ReplayNoteEvent[] = [];
  const walls: ReplayWallEvent[] = [];
  const heights: ReplayHeightEvent[] = [];
  const pauses: ReplayPauseEvent[] = [];
  let songStartTime = 0;

  while (reader.offset < data.byteLength) {
    const section = reader.byte();
    switch (section) {
      case 0: {
        const modVersion = reader.string();
        const gameVersion = reader.string();
        void reader.string();
        const playerId = reader.string();
        const playerName = reader.string();
        const platform = reader.string();
        void reader.string();
        void reader.string();
        void reader.string();
        const hash = reader.string();
        void reader.string();
        void reader.string();
        const difficultyStr = reader.string();
        void reader.int32();
        const mode = reader.string();
        const environment = reader.string();
        const modifiers = reader.string();
        const jumpDistance = reader.float32();
        const leftHanded = reader.bool();
        const height = reader.float32();
        const startTime = reader.float32();
        const failTime = reader.float32();
        const speed = reader.float32();

        metadata = {
          version: `BeatLeader ${version}`,
          levelId: `custom_level_${hash.toUpperCase()}`,
          difficulty: legacyDifficultyRanks[difficultyStr.toLowerCase()] ?? 1,
          characteristic: mode,
          environment,
          modifiers: modifiers === '' ? [] : modifiers.split(','),
          noteSpawnOffset: 0,
          leftHanded,
          initialHeight: height,
          roomRotation: 0,
          roomCenter: { x: 0, y: 0, z: 0 },
          failTime,
          gameVersion,
          pluginVersion: modVersion,
          platform,
          hasPlaySettings: true,
          songSpeed: speed,
          jumpDistance,
          player: playerId !== '' ? { id: playerId, name: playerName } : undefined,
        };
        songStartTime = startTime;
        break;
      }
      case 1: {
        const framesCount = reader.count('frames');
        for (let i = 0; i < framesCount; i++) {
          poses.push({
            time: reader.float32(),
            fps: reader.int32(),
            head: { position: vector3(reader), rotation: quaternion(reader) },
            leftHand: { position: vector3(reader), rotation: quaternion(reader) },
            rightHand: { position: vector3(reader), rotation: quaternion(reader) },
          });
        }
        break;
      }
      case 2: {
        const noteCount = reader.count('notes');
        for (let i = 0; i < noteCount; i++) {
          const rawNoteId = reader.int32();
          const scoringType = Math.floor(rawNoteId / 10000) - 2;
          const lineIndex = Math.floor((rawNoteId % 10000) / 1000);
          const noteLineLayer = Math.floor((rawNoteId % 1000) / 100);
          const colorType = Math.floor((rawNoteId % 100) / 10);
          const cutDirection = rawNoteId % 10;

          const eventTime = reader.float32();
          const spawnTime = reader.float32();
          const eventTypeRaw = reader.int32();

          let eventType: ReplayNoteEventType;
          switch (eventTypeRaw) {
            case 0:
              eventType = 1;
              break;
            case 1:
              eventType = 2;
              break;
            case 2:
              eventType = 3;
              break;
            case 3:
              eventType = 4;
              break;
            default:
              eventType = 0;
          }

          let cutPoint = { x: 0, y: 0, z: 0 };
          let cutNormal = { x: 0, y: 0, z: 0 };
          let saberDirection = { x: 0, y: 0, z: 0 };
          let saberType = 0;
          let directionOk = false;
          let saberSpeed = 0;
          let cutAngle = 0;
          let cutDistanceToCenter = 0;
          let cutDirectionDeviation = 0;
          let beforeCutRating = 0;
          let afterCutRating = 0;
          let timeDeviation = 0;

          if (eventTypeRaw === 0 || eventTypeRaw === 1) {
            void reader.bool();
            directionOk = reader.bool();
            void reader.bool();
            void reader.bool();
            saberSpeed = reader.float32();
            saberDirection = vector3(reader);
            saberType = reader.int32();
            timeDeviation = reader.float32();
            cutDirectionDeviation = reader.float32();
            cutPoint = vector3(reader);
            cutNormal = vector3(reader);
            cutDistanceToCenter = reader.float32();
            cutAngle = reader.float32();
            beforeCutRating = reader.float32();
            afterCutRating = reader.float32();
          }

          notes.push({
            noteId: {
              time: spawnTime,
              lineLayer: noteLineLayer,
              lineIndex,
              colorType,
              cutDirection,
              scoringType,
            },
            eventType,
            cutPoint,
            cutNormal,
            saberDirection,
            saberType,
            directionOk,
            saberSpeed,
            cutAngle,
            cutDistanceToCenter,
            cutDirectionDeviation,
            beforeCutRating,
            afterCutRating,
            time: eventTime,
            unityTimescale: 1,
            timeSyncTimescale: 1,
            timeDeviation,
          });
        }
        break;
      }
      case 3: {
        const wallCount = reader.count('walls');
        for (let i = 0; i < wallCount; i++) {
          const rawWallId = reader.int32();
          const energy = reader.float32();
          const time = reader.float32();
          const spawnTime = reader.float32();

          const lineIndex = Math.floor(rawWallId / 100);
          const obstacleType = Math.floor((rawWallId % 100) / 10);
          const width = rawWallId % 10;

          walls.push({
            time,
            exitTime: time,
            energy,
            obstacleTime: spawnTime,
            obstacleDuration: 0,
            lineIndex,
            lineLayer: obstacleType,
            width,
            height: 0,
          });
        }
        break;
      }
      case 4: {
        const heightCount = reader.count('heights');
        for (let i = 0; i < heightCount; i++) {
          heights.push({
            height: reader.float32(),
            time: reader.float32(),
          });
        }
        break;
      }
      case 5: {
        const pauseCount = reader.count('pauses');
        for (let i = 0; i < pauseCount; i++) {
          const duration = reader.int64();
          const time = reader.float32();
          const unixStartTime = BigInt(Math.round(songStartTime + time));
          const durationMs = duration * 1000n;
          const unixEndTime = unixStartTime + duration;
          pauses.push({
            duration: durationMs,
            time,
            unixStartTime,
            unixEndTime,
          });
        }
        break;
      }
      case 6: {
        if (metadata) {
          metadata.controllerOffsets = {
            left: { position: vector3(reader), rotation: quaternion(reader) },
            right: { position: vector3(reader), rotation: quaternion(reader) },
          };
        } else {
          vector3(reader);
          quaternion(reader);
          vector3(reader);
          quaternion(reader);
        }
        break;
      }
      case 7: {
        const userDataLength = reader.int32();
        const remaining = data.byteLength - reader.offset;
        reader.offset += Math.min(userDataLength, remaining);
        break;
      }
      default:
        reader.offset = data.byteLength;
        break;
    }
  }

  if (!metadata) throw new Error('BeatLeader replay is missing info section');

  const scores: ReplayScoreEvent[] = [];
  const combos: ReplayComboEvent[] = [];
  const multipliers: ReplayMultiplierEvent[] = [];

  let currentScore = 0;
  let currentCombo = 0;
  let multiplier = 1;
  let progress = 0;
  let immediateMax = 0;
  let maxPossibleMultiplier = 1;
  let maxPossibleProgress = 0;

  let currentEnergy = 0.5;
  const energies: ReplayEnergyEvent[] = [{ time: 0, energy: 0.5 }];

  type SimulationEvent =
    | { type: 'note'; data: ReplayNoteEvent; time: number }
    | { type: 'wall'; data: ReplayWallEvent; time: number };

  const simulationEvents: SimulationEvent[] = [
    ...notes.map((data) => ({ type: 'note' as const, data, time: data.time })),
    ...walls.map((data) => ({ type: 'wall' as const, data, time: data.time })),
  ].sort((a, b) => a.time - b.time);

  for (const event of simulationEvents) {
    if (event.type === 'wall') {
      currentEnergy = event.data.energy;
      energies.push({ time: event.time, energy: currentEnergy });
      continue;
    }

    const note = event.data;

    if (note.eventType === 1) {
      currentCombo++;
      progress++;
      if (multiplier < 8 && progress >= multiplier * 2) {
        multiplier *= 2;
        progress = 0;
      }

      maxPossibleProgress++;
      if (maxPossibleMultiplier < 8 && maxPossibleProgress >= maxPossibleMultiplier * 2) {
        maxPossibleMultiplier *= 2;
        maxPossibleProgress = 0;
      }
      immediateMax += 115 * maxPossibleMultiplier;

      const definition = scoreDefinitions[(note.noteId.scoringType ?? 1) + 2];
      if (definition) {
        const before = clamp(
          roundToEven(definition.beforeMax * note.beforeCutRating),
          definition.beforeMin,
          definition.beforeMax,
        );
        const after = clamp(
          roundToEven(definition.afterMax * note.afterCutRating),
          definition.afterMin,
          definition.afterMax,
        );
        const accuracy = roundToEven(definition.center * (1 - clamp(note.cutDistanceToCenter / 0.3, 0, 1)));
        const cutScore = before + after + accuracy + definition.fixed;
        currentScore += cutScore * multiplier;
      }
    } else if (note.eventType === 2 || note.eventType === 3) {
      currentCombo = 0;
      if (multiplier > 1) {
        multiplier /= 2;
      }
      progress = 0;

      maxPossibleProgress++;
      if (maxPossibleMultiplier < 8 && maxPossibleProgress >= maxPossibleMultiplier * 2) {
        maxPossibleMultiplier *= 2;
        maxPossibleProgress = 0;
      }
      immediateMax += 115 * maxPossibleMultiplier;
      currentEnergy = Math.max(0, currentEnergy - 0.15);
    } else if (note.eventType === 4) {
      currentCombo = 0;
      if (multiplier > 1) {
        multiplier /= 2;
      }
      progress = 0;
      currentEnergy = Math.max(0, currentEnergy - 0.15);
    }

    if (note.eventType === 1) {
      currentEnergy = Math.min(1, currentEnergy + 0.01);
    }

    scores.push({ time: note.time, score: currentScore, immediateMaxPossibleScore: immediateMax });
    combos.push({ time: note.time, combo: currentCombo });
    energies.push({ time: note.time, energy: currentEnergy });
    multipliers.push({
      time: note.time,
      multiplier,
      nextMultiplierProgress: multiplier === 8 ? 0 : progress / (multiplier * 2),
    });
  }

  return {
    metadata,
    poses,
    heights,
    notes,
    scores,
    combos,
    multipliers,
    energies,
    pauses,
    walls,
  };
}
