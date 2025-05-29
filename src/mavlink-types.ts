// MAVLink Message Type Definitions for ArduPilot Integration

export enum MAV_STATE {
  MAV_STATE_UNINIT = 0,
  MAV_STATE_BOOT = 1,
  MAV_STATE_CALIBRATING = 2,
  MAV_STATE_STANDBY = 3,
  MAV_STATE_ACTIVE = 4,
  MAV_STATE_CRITICAL = 5,
  MAV_STATE_EMERGENCY = 6,
  MAV_STATE_POWEROFF = 7,
  MAV_STATE_FLIGHT_TERMINATION = 8
}

export enum MAV_CMD {
  MAV_CMD_NAV_TAKEOFF = 22,
  MAV_CMD_NAV_LAND = 21,
  MAV_CMD_NAV_RETURN_TO_LAUNCH = 20,
  MAV_CMD_COMPONENT_ARM_DISARM = 400,
  MAV_CMD_DO_SET_MODE = 176
}

export enum MAV_RESULT {
  MAV_RESULT_ACCEPTED = 0,
  MAV_RESULT_TEMPORARILY_REJECTED = 1,
  MAV_RESULT_DENIED = 2,
  MAV_RESULT_UNSUPPORTED = 3,
  MAV_RESULT_FAILED = 4,
  MAV_RESULT_IN_PROGRESS = 5
}

export interface MAVLinkHeartbeat {
  type: number;
  autopilot: number;
  base_mode: number;
  custom_mode: number;
  system_status: MAV_STATE;
  mavlink_version: number;
}

export interface MAVLinkGlobalPositionInt {
  time_boot_ms: number;
  lat: number;  // Latitude in degrees * 1E7
  lon: number;  // Longitude in degrees * 1E7
  alt: number;  // Altitude in millimeters
  relative_alt: number;  // Relative altitude in millimeters
  vx: number;   // Ground X Speed (Latitude) in cm/s
  vy: number;   // Ground Y Speed (Longitude) in cm/s
  vz: number;   // Ground Z Speed (Altitude) in cm/s
  hdg: number;  // Heading in degrees * 100
}

export interface MAVLinkCommandAck {
  command: MAV_CMD;
  result: MAV_RESULT;
  progress?: number;
  result_param2?: number;
  target_system?: number;
  target_component?: number;
}

export interface MAVLinkCommandLong {
  target_system: number;
  target_component: number;
  command: MAV_CMD;
  confirmation: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  param5: number;
  param6: number;
  param7: number;
}

// ArduCopter specific flight modes
export enum COPTER_MODE {
  STABILIZE = 0,
  ACRO = 1,
  ALT_HOLD = 2,
  AUTO = 3,
  GUIDED = 4,
  LOITER = 5,
  RTL = 6,
  CIRCLE = 7,
  LAND = 9,
  DRIFT = 11,
  SPORT = 13,
  FLIP = 14,
  AUTOTUNE = 15,
  POSHOLD = 16,
  BRAKE = 17,
  THROW = 18,
  AVOID_ADSB = 19,
  GUIDED_NOGPS = 20,
  SMART_RTL = 21,
  FLOWHOLD = 22,
  FOLLOW = 23,
  ZIGZAG = 24,
  SYSTEMID = 25,
  AUTOROTATE = 26,
  AUTO_RTL = 27
}

export const FLIGHT_MODE_NAMES: Record<number, string> = {
  [COPTER_MODE.STABILIZE]: 'STABILIZE',
  [COPTER_MODE.ACRO]: 'ACRO',
  [COPTER_MODE.ALT_HOLD]: 'ALT_HOLD',
  [COPTER_MODE.AUTO]: 'AUTO',
  [COPTER_MODE.GUIDED]: 'GUIDED',
  [COPTER_MODE.LOITER]: 'LOITER',
  [COPTER_MODE.RTL]: 'RTL',
  [COPTER_MODE.CIRCLE]: 'CIRCLE',
  [COPTER_MODE.LAND]: 'LAND',
  [COPTER_MODE.DRIFT]: 'DRIFT',
  [COPTER_MODE.SPORT]: 'SPORT',
  [COPTER_MODE.FLIP]: 'FLIP',
  [COPTER_MODE.AUTOTUNE]: 'AUTOTUNE',
  [COPTER_MODE.POSHOLD]: 'POSHOLD',
  [COPTER_MODE.BRAKE]: 'BRAKE',
  [COPTER_MODE.THROW]: 'THROW',
  [COPTER_MODE.AVOID_ADSB]: 'AVOID_ADSB',
  [COPTER_MODE.GUIDED_NOGPS]: 'GUIDED_NOGPS',
  [COPTER_MODE.SMART_RTL]: 'SMART_RTL',
  [COPTER_MODE.FLOWHOLD]: 'FLOWHOLD',
  [COPTER_MODE.FOLLOW]: 'FOLLOW',
  [COPTER_MODE.ZIGZAG]: 'ZIGZAG',
  [COPTER_MODE.SYSTEMID]: 'SYSTEMID',
  [COPTER_MODE.AUTOROTATE]: 'AUTOROTATE',
  [COPTER_MODE.AUTO_RTL]: 'AUTO_RTL'
};

export const FLIGHT_MODE_IDS: Record<string, number> = {
  'STABILIZE': COPTER_MODE.STABILIZE,
  'ACRO': COPTER_MODE.ACRO,
  'ALT_HOLD': COPTER_MODE.ALT_HOLD,
  'AUTO': COPTER_MODE.AUTO,
  'GUIDED': COPTER_MODE.GUIDED,
  'LOITER': COPTER_MODE.LOITER,
  'RTL': COPTER_MODE.RTL,
  'CIRCLE': COPTER_MODE.CIRCLE,
  'LAND': COPTER_MODE.LAND,
  'DRIFT': COPTER_MODE.DRIFT,
  'SPORT': COPTER_MODE.SPORT,
  'FLIP': COPTER_MODE.FLIP,
  'AUTOTUNE': COPTER_MODE.AUTOTUNE,
  'POSHOLD': COPTER_MODE.POSHOLD,
  'BRAKE': COPTER_MODE.BRAKE,
  'THROW': COPTER_MODE.THROW,
  'AVOID_ADSB': COPTER_MODE.AVOID_ADSB,
  'GUIDED_NOGPS': COPTER_MODE.GUIDED_NOGPS,
  'SMART_RTL': COPTER_MODE.SMART_RTL,
  'FLOWHOLD': COPTER_MODE.FLOWHOLD,
  'FOLLOW': COPTER_MODE.FOLLOW,
  'ZIGZAG': COPTER_MODE.ZIGZAG,
  'SYSTEMID': COPTER_MODE.SYSTEMID,
  'AUTOROTATE': COPTER_MODE.AUTOROTATE,
  'AUTO_RTL': COPTER_MODE.AUTO_RTL
};

// Utility functions for data conversion
export class MAVLinkConverter {
  static milliDegreesToDegrees(milliDegrees: number): number {
    return milliDegrees / 1e7;
  }

  static millimetersToMeters(millimeters: number): number {
    return millimeters / 1000;
  }

  static centiDegreesToDegrees(centiDegrees: number): number {
    return centiDegrees / 100;
  }

  static centimetersPerSecondToMetersPerSecond(cms: number): number {
    return cms / 100;
  }

  static getFlightModeName(modeId: number): string {
    return FLIGHT_MODE_NAMES[modeId] || 'UNKNOWN';
  }

  static getFlightModeId(modeName: string): number | null {
    const id = FLIGHT_MODE_IDS[modeName.toUpperCase()];
    return id !== undefined ? id : null;
  }
}

// Extended interfaces for our application
export interface ProcessedPosition {
  latitude: number;     // degrees
  longitude: number;    // degrees
  altitude: number;     // meters above sea level
  relativeAlt: number;  // meters above home
  heading: number;      // degrees
  velocity: {
    x: number;          // m/s (north)
    y: number;          // m/s (east)
    z: number;          // m/s (down)
  };
  timestamp: number;    // milliseconds since boot
}

export interface ProcessedStatus {
  armed: boolean;
  mode: string;
  modeId: number;
  systemStatus: MAV_STATE;
  timestamp: number;
}

export interface CommandResult {
  success: boolean;
  result: MAV_RESULT;
  message: string;
  progress?: number;
}