import type { FireAlarmScanSession } from '../types';

/**
 * A representative captured session for previewing the 3D plan where a real RoomPlan capture is
 * unavailable — for example in Expo Go, on a simulator, or on a device without LiDAR.
 *
 * The geometry mirrors a typical small commercial space: a main room with a door and a window, a
 * store room reached off it, and a panel, detectors, a sounder, a VAD and an interface.
 */
export function createSampleScanSession(): FireAlarmScanSession {
  const capturedAt = new Date().toISOString();

  return {
    id: 'sample-ground-floor',
    status: 'completed',
    metadata: {
      startedAt: capturedAt,
      endedAt: capturedAt,
      platform: 'ios',
      appVersion: '1.0.0',
      deviceModel: 'Sample capture',
      osVersion: '18.0',
      sessionName: 'Ground floor — east wing',
      roomsDetected: 2,
    },
    floorplan: {
      units: 'meters',
      rooms: [
        {
          id: 'room-east',
          name: 'East wing',
          level: 0,
          areaSquareMeters: 24,
          outline: [
            { x: 0, y: 0 },
            { x: 6, y: 0 },
            { x: 6, y: 4 },
            { x: 0, y: 4 },
          ],
          wallSegments: [
            { id: 'east-wall-1', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, height: 3.1 },
            { id: 'east-wall-2', start: { x: 6, y: 0 }, end: { x: 6, y: 4 }, height: 3.1 },
            { id: 'east-wall-3', start: { x: 6, y: 4 }, end: { x: 0, y: 4 }, height: 3.1 },
            { id: 'east-wall-4', start: { x: 0, y: 4 }, end: { x: 0, y: 0 }, height: 3.1 },
          ],
          openings: [
            { id: 'east-door', kind: 'door', wallSegmentId: 'east-wall-1', width: 0.9, height: 2.1 },
            { id: 'east-window', kind: 'window', position: { x: 4.2, y: 0 }, width: 1.4, height: 1.2 },
          ],
        },
        {
          id: 'room-store',
          name: 'Store',
          level: 0,
          areaSquareMeters: 9,
          outline: [
            { x: 9, y: 0 },
            { x: 12, y: 0 },
            { x: 12, y: 3 },
            { x: 9, y: 3 },
          ],
        },
      ],
    },
    devices: [
      {
        id: 'sample-panel',
        type: 'panel',
        label: 'Main FACP',
        manufacturer: { name: 'Hochiki', confidence: 0.9 },
        confidence: 0.94,
        location: { x: 0.6, y: 0.4, z: 1.4 },
        roomId: 'room-east',
        source: 'roomplan',
      },
      {
        id: 'sample-detector-1',
        type: 'detector',
        label: 'Optical detector',
        confidence: 0.88,
        location: { x: 2.6, y: 1.8, z: 3.1 },
        roomId: 'room-east',
        source: 'roomplan',
      },
      {
        id: 'sample-detector-2',
        type: 'detector',
        label: 'Optical detector',
        confidence: 0.81,
        location: { x: 4.4, y: 3.1, z: 3.1 },
        roomId: 'room-east',
        source: 'roomplan',
      },
      {
        id: 'sample-sounder',
        type: 'sounder',
        label: 'Sounder',
        confidence: 0.9,
        location: { x: 5.4, y: 0.6, z: 2.4 },
        roomId: 'room-east',
        source: 'roomplan',
      },
      {
        id: 'sample-vad',
        type: 'vad',
        label: 'VAD',
        confidence: 0.72,
        location: { x: 1.4, y: 3.2, z: 2.3 },
        roomId: 'room-east',
        source: 'roomplan',
      },
      {
        id: 'sample-interface',
        type: 'interface',
        label: 'Interface',
        manufacturer: 'Kentec',
        confidence: 0.66,
        location: { x: 10.2, y: 1.1, z: 1.5 },
        roomId: 'room-store',
        source: 'vision',
      },
    ],
  };
}
