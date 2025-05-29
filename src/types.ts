export interface ArduPilotConnectionConfig {
  host: string;
  port: number;
  protocol: 'udp' | 'tcp';
  sourceSystem: number;
  sourceComponent: number;
  timeout: number;
  autoReconnect: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  targetSystem?: number;
  targetComponent?: number;
  error?: string;
}

export interface Position {
  latitude: number;
  longitude: number;
  altitude: number;
  relativeAlt: number;
  heading: number;
  velocity: {
    x: number;
    y: number;
    z: number;
  };
}

export interface VehicleStatus {
  armed: boolean;
  mode: string;
  systemStatus?: number;
}

export interface FlightMode {
  name: string;
  id: number;
}

export interface ModeChangeResult {
  success: boolean;
  currentMode: string;
  requestedMode: string;
  message: string;
}