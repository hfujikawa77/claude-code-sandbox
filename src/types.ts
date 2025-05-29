/**
 * Application-specific Type Definitions for ArduPilot MCP Server
 * These types define the interfaces for MCP tools, configuration, and utility functions
 */

import { MAV_RESULT, FlightModeName, COPTER_MODE, GPS_FIX_TYPE, MAV_STATE } from './mavlink-types.js';

// MCP Tool Input Parameter Types
export interface ArmToolParams {
  // No parameters required for arming
}

export interface DisarmToolParams {
  // No parameters required for disarming  
}

export interface TakeoffToolParams {
  altitude?: number; // Altitude in meters (1-100m, default 10m)
}

export interface ChangeModeToolParams {
  mode: FlightModeName; // Flight mode name from enum
}

export interface GetStatusToolParams {
  // No parameters required for status
}

export interface GetPositionToolParams {
  // No parameters required for position
}

// MCP Tool Output Types
export interface ArmToolResult {
  success: boolean;
  message: string;
  result?: MAV_RESULT;
}

export interface DisarmToolResult {
  success: boolean;
  message: string;
  result?: MAV_RESULT;
}

export interface TakeoffToolResult {
  success: boolean;
  message: string;
  altitude?: number;
  result?: MAV_RESULT;
}

export interface ChangeModeToolResult {
  success: boolean;
  message: string;
  mode?: FlightModeName;
  result?: MAV_RESULT;
}

export interface VehicleStatus {
  armed: boolean;
  mode: string;
  mode_num: number;
  system_status: MAV_STATE;
  battery_voltage?: number;
  battery_remaining?: number;
  gps_fix_type?: GPS_FIX_TYPE;
  satellites_visible?: number;
}

export interface GetStatusToolResult {
  success: boolean;
  message: string;
  status?: VehicleStatus;
}

export interface Position {
  latitude: number;    // Degrees
  longitude: number;   // Degrees
  altitude_msl: number; // Altitude above mean sea level in meters
  altitude_rel: number; // Altitude above ground in meters
  heading: number;     // Heading in degrees (0-359)
  ground_speed: number; // Ground speed in m/s
  vertical_speed: number; // Vertical speed in m/s
  gps_fix_type: GPS_FIX_TYPE;
  satellites_visible: number;
}

export interface GetPositionToolResult {
  success: boolean;
  message: string;
  position?: Position;
}

// Error Response Types
export interface MCPError {
  code: string;
  message: string;
  details?: string;
}

export interface MCPErrorResult {
  success: false;
  error: MCPError;
}

// Union Types for Tool Results
export type MCPToolResult = 
  | ArmToolResult
  | DisarmToolResult 
  | TakeoffToolResult
  | ChangeModeToolResult
  | GetStatusToolResult
  | GetPositionToolResult
  | MCPErrorResult;

// Connection Configuration Types
export interface ConnectionConfig {
  host: string;           // Target host (default: 127.0.0.1)
  port: number;           // Target port (default: 14552)
  protocol: 'udp' | 'tcp'; // Connection protocol (default: udp)
  system_id: number;      // Source system ID (default: 1)
  component_id: number;   // Source component ID (default: 90)
  timeout: number;        // Connection timeout in milliseconds (default: 10000)
  auto_reconnect: boolean; // Enable auto-reconnect (default: true)
  heartbeat_interval: number; // Heartbeat interval in ms (default: 1000)
  max_retries: number;    // Maximum connection retries (default: 3)
}

export interface ServerConfig {
  name: string;           // MCP server name
  version: string;        // Server version
  connection: ConnectionConfig;
  logging: LoggingConfig;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enable_file_logging: boolean;
  log_directory?: string;
  max_log_size?: number;  // Maximum log file size in MB
  max_log_files?: number; // Maximum number of log files to keep
}

// Connection State Types
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface ConnectionStatus {
  state: ConnectionState;
  last_heartbeat?: Date;
  connection_time?: Date;
  retry_count: number;
  error_message?: string;
}

// Unit Conversion Types
export interface Coordinates {
  latitude: number;  // Decimal degrees
  longitude: number; // Decimal degrees
}

export interface CoordinatesInt {
  lat: number;  // Latitude in degrees * 1E7
  lon: number;  // Longitude in degrees * 1E7
}

export interface Velocity {
  x: number; // Velocity in m/s
  y: number; // Velocity in m/s  
  z: number; // Velocity in m/s
}

export interface VelocityInt {
  vx: number; // Velocity in cm/s
  vy: number; // Velocity in cm/s
  vz: number; // Velocity in cm/s
}

export interface Altitude {
  msl: number; // Altitude above mean sea level in meters
  agl: number; // Altitude above ground level in meters
}

export interface AltitudeInt {
  alt: number;         // Altitude in mm above MSL
  relative_alt: number; // Altitude in mm above ground
}

// Utility Function Types
export type CoordinateConverter = {
  toInt: (coords: Coordinates) => CoordinatesInt;
  fromInt: (coords: CoordinatesInt) => Coordinates;
};

export type VelocityConverter = {
  toInt: (vel: Velocity) => VelocityInt;
  fromInt: (vel: VelocityInt) => Velocity;
};

export type AltitudeConverter = {
  toInt: (alt: Altitude) => AltitudeInt;
  fromInt: (alt: AltitudeInt) => Altitude;
};

export type AngleConverter = {
  toCentidegrees: (degrees: number) => number;
  fromCentidegrees: (centidegrees: number) => number;
  toRadians: (degrees: number) => number;
  fromRadians: (radians: number) => number;
};

// Flight Mode Conversion Types
export interface FlightModeConverter {
  nameToNumber: (name: FlightModeName) => COPTER_MODE | undefined;
  numberToName: (mode: number) => FlightModeName | undefined;
  isValidMode: (mode: string | number) => boolean;
  getAllModes: () => FlightModeName[];
}

// Command Validation Types
export interface CommandValidator {
  validateAltitude: (altitude: number) => boolean;
  validateMode: (mode: string) => boolean;
  validateCoordinates: (lat: number, lon: number) => boolean;
  validateTimeout: (timeout: number) => boolean;
}

// Message Handler Types
export type MessageHandler<T = any> = (message: T) => void | Promise<void>;

export interface MessageHandlers {
  onHeartbeat?: MessageHandler;
  onGlobalPosition?: MessageHandler;
  onCommandAck?: MessageHandler;
  onSystemStatus?: MessageHandler;
  onGpsRaw?: MessageHandler;
  onBatteryStatus?: MessageHandler;
  onAttitude?: MessageHandler;
  onError?: MessageHandler<Error>;
}

// MAVLink Connection Interface
export interface MAVLinkConnection {
  config: ConnectionConfig;
  status: ConnectionStatus;
  handlers: MessageHandlers;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(message: any): Promise<void>;
  sendCommand(command: number, params: number[]): Promise<MAV_RESULT>;
  waitForMessage(messageId: number, timeout?: number): Promise<any>;
  isConnected(): boolean;
}

// MCP Server Interface  
export interface ArduPilotMCPServer {
  config: ServerConfig;
  connection: MAVLinkConnection | null;
  
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  handleToolCall(name: string, params: any): Promise<MCPToolResult>;
  getAvailableTools(): string[];
}

// Event Types
export enum MCPEvent {
  SERVER_STARTED = 'server_started',
  SERVER_STOPPED = 'server_stopped', 
  CONNECTION_ESTABLISHED = 'connection_established',
  CONNECTION_LOST = 'connection_lost',
  TOOL_CALLED = 'tool_called',
  TOOL_COMPLETED = 'tool_completed',
  ERROR_OCCURRED = 'error_occurred'
}

export interface MCPEventData {
  event: MCPEvent;
  timestamp: Date;
  data?: any;
  error?: Error;
}

export type MCPEventHandler = (eventData: MCPEventData) => void;

// Validation Result Types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Default Configuration Values
export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  host: '127.0.0.1',
  port: 14552,
  protocol: 'udp',
  system_id: 1,
  component_id: 90,
  timeout: 10000,
  auto_reconnect: true,
  heartbeat_interval: 1000,
  max_retries: 3
};

export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  level: 'info',
  enable_file_logging: false,
  max_log_size: 10, // 10MB
  max_log_files: 5
};

// Type Guards
export function isValidFlightMode(mode: any): mode is FlightModeName {
  return typeof mode === 'string' && Object.values(COPTER_MODE).includes(mode as any);
}

export function isConnectionConfig(obj: any): obj is ConnectionConfig {
  return typeof obj === 'object' && 
         typeof obj.host === 'string' &&
         typeof obj.port === 'number' &&
         ['udp', 'tcp'].includes(obj.protocol);
}

export function isMCPError(obj: any): obj is MCPError {
  return typeof obj === 'object' &&
         typeof obj.code === 'string' &&
         typeof obj.message === 'string';
}

// Utility type for partial updates
export type PartialConfig<T> = {
  [P in keyof T]?: T[P] extends object ? PartialConfig<T[P]> : T[P];
};

// Promise-based timeout utility type
export type TimeoutPromise<T> = Promise<T> & {
  timeout: (ms: number) => Promise<T>;
  cancel: () => void;
};