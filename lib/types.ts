export interface Checkpoint {
  id: string;
  name: string;
  type: 'START' | 'POS' | 'FINISH';
  lat: number;
  lng: number;
  description?: string;
}

export interface AppConfig {
  eventName: string;
  subTitle: string;
  organizer: string;
  checkpoints: Checkpoint[];
  checkpointRadius: number; // meters (e.g. 30)
  offRouteTolerance: number; // meters (e.g. 40)
  polylineColor: string;
  polylineWeight: number;
  audioAlertsEnabled: boolean;
  announcementText: string;
}

export interface UserPosition {
  lat: number;
  lng: number;
  accuracy: number; // meters
  speed: number | null; // km/h
  heading: number | null;
  timestamp: number;
}

export type RouteStatus =
  | 'ON_ROUTE'
  | 'APPROACHING_POS'
  | 'PASSED_POS'
  | 'OFF_ROUTE';

export interface RouteCalculation {
  status: RouteStatus;
  statusText: string;
  distanceToNearestRoute: number; // meters
  nearestPointOnRoute: [number, number];
  nextCheckpoint: Checkpoint | null;
  distanceToNextCheckpoint: number; // meters
  totalRouteDistance: number; // meters
  remainingDistanceToFinish: number; // meters
  progressPercentage: number; // 0 to 100
  isOffRoute: boolean;
  isNearCheckpoint: boolean; // within 50m
  isAtFinish: boolean;
}

export interface CheckpointHistoryItem {
  checkpointId: string;
  checkpointName: string;
  passedAt: number; // timestamp
  lat: number;
  lng: number;
}

export interface ParticipantSession {
  startTime: number | null;
  completedCheckpoints: Record<string, CheckpointHistoryItem>;
  finished: boolean;
  finishTime: number | null;
  historyLog: { timestamp: number; message: string; type: 'info' | 'success' | 'warning' }[];
}

export interface PanitiaTelemetry {
  participantId: string;
  name: string;
  lastLat: number;
  lastLng: number;
  lastUpdate: number;
  currentPOS: string;
  progress: number;
  isOffRoute: boolean;
  finished: boolean;
}
