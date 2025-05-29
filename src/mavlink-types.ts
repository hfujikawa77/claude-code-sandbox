/**
 * Comprehensive MAVLink Protocol Type Definitions
 * These types provide type safety for MAVLink message communication with ArduPilot
 */

// Base MAVLink message structure
export interface MAVLinkMessage {
  msgid: number;
  system_id: number;
  component_id: number;
  seq: number;
  payload: Record<string, any>;
}

// MAVLink System Status Values
export enum MAV_STATE {
  UNINIT = 0,
  BOOT = 1,
  CALIBRATING = 2,
  STANDBY = 3,
  ACTIVE = 4,
  CRITICAL = 5,
  EMERGENCY = 6,
  POWEROFF = 7,
  FLIGHT_TERMINATION = 8
}

export enum MAV_MODE_FLAG {
  SAFETY_ARMED = 128,
  MANUAL_INPUT_ENABLED = 64,
  HIL_ENABLED = 32,
  STABILIZE_ENABLED = 16,
  GUIDED_ENABLED = 8,
  AUTO_ENABLED = 4,
  TEST_ENABLED = 2,
  CUSTOM_MODE_ENABLED = 1
}

// HEARTBEAT Message (Message ID: 0)
export interface HeartbeatMessage extends MAVLinkMessage {
  msgid: 0;
  payload: {
    type: number;
    autopilot: number;
    base_mode: number;
    custom_mode: number;
    system_status: MAV_STATE;
    mavlink_version: number;
  };
}

// GLOBAL_POSITION_INT Message (Message ID: 33)
export interface GlobalPositionIntMessage extends MAVLinkMessage {
  msgid: 33;
  payload: {
    time_boot_ms: number;
    lat: number;  // Latitude in degrees * 1E7
    lon: number;  // Longitude in degrees * 1E7
    alt: number;  // Altitude in mm above mean sea level
    relative_alt: number;  // Altitude above ground in mm
    vx: number;  // Ground X speed (GPS) in cm/s
    vy: number;  // Ground Y speed (GPS) in cm/s
    vz: number;  // Ground Z speed (GPS) in cm/s
    hdg: number; // Vehicle heading in centidegrees
  };
}

// COMMAND_ACK Message (Message ID: 77)
export interface CommandAckMessage extends MAVLinkMessage {
  msgid: 77;
  payload: {
    command: number;
    result: MAV_RESULT;
    progress?: number;
    result_param2?: number;
    target_system?: number;
    target_component?: number;
  };
}

// ATTITUDE Message (Message ID: 30)
export interface AttitudeMessage extends MAVLinkMessage {
  msgid: 30;
  payload: {
    time_boot_ms: number;
    roll: number;     // Roll angle in radians
    pitch: number;    // Pitch angle in radians
    yaw: number;      // Yaw angle in radians
    rollspeed: number; // Roll angular speed in rad/s
    pitchspeed: number; // Pitch angular speed in rad/s
    yawspeed: number;  // Yaw angular speed in rad/s
  };
}

// GPS_RAW_INT Message (Message ID: 24)
export interface GpsRawIntMessage extends MAVLinkMessage {
  msgid: 24;
  payload: {
    time_usec: number;
    fix_type: GPS_FIX_TYPE;
    lat: number;      // Latitude in degrees * 1E7
    lon: number;      // Longitude in degrees * 1E7
    alt: number;      // Altitude in mm above MSL
    eph: number;      // GPS HDOP horizontal dilution
    epv: number;      // GPS VDOP vertical dilution
    vel: number;      // GPS ground speed in cm/s
    cog: number;      // Course over ground in centidegrees
    satellites_visible: number;
  };
}

// GPS Fix Type
export enum GPS_FIX_TYPE {
  NO_GPS = 0,
  NO_FIX = 1,
  GPS_2D_FIX = 2,
  GPS_3D_FIX = 3,
  DGPS = 4,
  RTK_FLOAT = 5,
  RTK_FIXED = 6,
  STATIC = 7,
  PPP = 8
}

// SYS_STATUS Message (Message ID: 1)
export interface SysStatusMessage extends MAVLinkMessage {
  msgid: 1;
  payload: {
    onboard_control_sensors_present: number;
    onboard_control_sensors_enabled: number;
    onboard_control_sensors_health: number;
    load: number;
    voltage_battery: number;
    current_battery: number;
    battery_remaining: number;
    drop_rate_comm: number;
    errors_comm: number;
    errors_count1: number;
    errors_count2: number;
    errors_count3: number;
    errors_count4: number;
  };
}

// MISSION_CURRENT Message (Message ID: 42)
export interface MissionCurrentMessage extends MAVLinkMessage {
  msgid: 42;
  payload: {
    seq: number;
  };
}

// BATTERY_STATUS Message (Message ID: 147)
export interface BatteryStatusMessage extends MAVLinkMessage {
  msgid: 147;
  payload: {
    id: number;
    battery_function: number;
    type: number;
    temperature: number;
    voltages: number[];
    current_battery: number;
    current_consumed: number;
    energy_consumed: number;
    battery_remaining: number;
    time_remaining?: number;
    charge_state: number;
  };
}

// Union type for all message types
export type MAVLinkMessageTypes = 
  | HeartbeatMessage
  | GlobalPositionIntMessage
  | CommandAckMessage
  | AttitudeMessage
  | GpsRawIntMessage
  | SysStatusMessage
  | MissionCurrentMessage
  | BatteryStatusMessage;

// MAVLink Command Results
export enum MAV_RESULT {
  ACCEPTED = 0,
  TEMPORARILY_REJECTED = 1,
  DENIED = 2,
  UNSUPPORTED = 3,
  FAILED = 4,
  IN_PROGRESS = 5,
  CANCELLED = 6
}

// MAVLink Commands
export enum MAV_CMD {
  // Navigation commands
  NAV_WAYPOINT = 16,
  NAV_LOITER_UNLIM = 17,
  NAV_LOITER_TURNS = 18,
  NAV_LOITER_TIME = 19,
  NAV_RETURN_TO_LAUNCH = 20,
  NAV_LAND = 21,
  NAV_TAKEOFF = 22,
  NAV_LAND_LOCAL = 23,
  NAV_TAKEOFF_LOCAL = 24,
  NAV_FOLLOW = 25,
  NAV_CONTINUE_AND_CHANGE_ALT = 30,
  NAV_LOITER_TO_ALT = 31,
  NAV_ROI = 80,
  NAV_PATHPLANNING = 81,
  NAV_SPLINE_WAYPOINT = 82,
  NAV_VTOL_TAKEOFF = 84,
  NAV_VTOL_LAND = 85,
  NAV_GUIDED_ENABLE = 92,
  NAV_DELAY = 93,
  NAV_PAYLOAD_PLACE = 94,
  NAV_LAST = 95,
  
  // Condition commands
  CONDITION_DELAY = 112,
  CONDITION_CHANGE_ALT = 113,
  CONDITION_DISTANCE = 114,
  CONDITION_YAW = 115,
  CONDITION_LAST = 159,
  
  // Do commands
  DO_SET_MODE = 176,
  DO_JUMP = 177,
  DO_CHANGE_SPEED = 178,
  DO_SET_HOME = 179,
  DO_SET_PARAMETER = 180,
  DO_SET_RELAY = 181,
  DO_REPEAT_RELAY = 182,
  DO_SET_SERVO = 183,
  DO_REPEAT_SERVO = 184,
  DO_FLIGHTTERMINATION = 185,
  DO_CHANGE_ALTITUDE = 186,
  DO_LAND_START = 189,
  DO_RALLY_LAND = 190,
  DO_GO_AROUND = 191,
  DO_REPOSITION = 192,
  DO_PAUSE_CONTINUE = 193,
  DO_SET_REVERSE = 194,
  DO_SET_ROI_LOCATION = 195,
  DO_SET_ROI_WPNEXT_OFFSET = 196,
  DO_SET_ROI_NONE = 197,
  DO_SET_ROI_SYSID = 198,
  DO_CONTROL_VIDEO = 200,
  DO_SET_ROI = 201,
  DO_DIGICAM_CONFIGURE = 202,
  DO_DIGICAM_CONTROL = 203,
  DO_MOUNT_CONFIGURE = 204,
  DO_MOUNT_CONTROL = 205,
  DO_SET_CAM_TRIGG_DIST = 206,
  DO_FENCE_ENABLE = 207,
  DO_PARACHUTE = 208,
  DO_MOTOR_TEST = 209,
  DO_INVERTED_FLIGHT = 210,
  DO_GRIPPER = 211,
  DO_AUTOTUNE_ENABLE = 212,
  DO_SET_CAM_TRIGG_INTERVAL = 214,
  DO_MOUNT_CONTROL_QUAT = 220,
  DO_GUIDED_MASTER = 221,
  DO_GUIDED_LIMITS = 222,
  DO_ENGINE_CONTROL = 223,
  DO_SET_MISSION_CURRENT = 224,
  DO_LAST = 240,
  
  // Preflight commands
  PREFLIGHT_CALIBRATION = 241,
  PREFLIGHT_SET_SENSOR_OFFSETS = 242,
  PREFLIGHT_UAVCAN = 243,
  PREFLIGHT_STORAGE = 245,
  PREFLIGHT_REBOOT_SHUTDOWN = 246,
  
  // Mission commands
  MISSION_START = 300,
  COMPONENT_ARM_DISARM = 400,
  GET_HOME_POSITION = 410,
  START_RX_PAIR = 500,
  GET_MESSAGE_INTERVAL = 510,
  SET_MESSAGE_INTERVAL = 511,
  REQUEST_MESSAGE = 512,
  REQUEST_PROTOCOL_VERSION = 519,
  REQUEST_AUTOPILOT_CAPABILITIES = 520,
  REQUEST_CAMERA_INFORMATION = 521,
  REQUEST_CAMERA_SETTINGS = 522,
  REQUEST_STORAGE_INFORMATION = 525,
  STORAGE_FORMAT = 526,
  REQUEST_CAMERA_CAPTURE_STATUS = 527,
  REQUEST_FLIGHT_INFORMATION = 528,
  RESET_CAMERA_SETTINGS = 529,
  SET_CAMERA_MODE = 530,
  SET_CAMERA_ZOOM = 531,
  SET_CAMERA_FOCUS = 532,
  JUMP_TAG = 600,
  DO_JUMP_TAG = 601,
  PARAM_TRANSACTION = 900,
  DO_GIMBAL_MANAGER_PITCHYAW = 1000,
  DO_GIMBAL_MANAGER_CONFIGURE = 1001,
  IMAGE_START_CAPTURE = 2000,
  IMAGE_STOP_CAPTURE = 2001,
  REQUEST_CAMERA_IMAGE_CAPTURE = 2002,
  DO_TRIGGER_CONTROL = 2003,
  VIDEO_START_CAPTURE = 2500,
  VIDEO_STOP_CAPTURE = 2501,
  VIDEO_START_STREAMING = 2502,
  VIDEO_STOP_STREAMING = 2503,
  REQUEST_VIDEO_STREAM_INFORMATION = 2504,
  REQUEST_VIDEO_STREAM_STATUS = 2505,
  LOGGING_START = 2510,
  LOGGING_STOP = 2511,
  AIRFRAME_CONFIGURATION = 2520,
  CONTROL_HIGH_LATENCY = 2600,
  PANORAMA_CREATE = 2800,
  DO_VTOL_TRANSITION = 3000,
  ARM_AUTHORIZATION_REQUEST = 3001,
  SET_GUIDED_SUBMODE_STANDARD = 4000,
  SET_GUIDED_SUBMODE_CIRCLE = 4001,
  CONDITION_GATE = 4501,
  NAV_FENCE_RETURN_POINT = 5000,
  NAV_FENCE_POLYGON_VERTEX_INCLUSION = 5001,
  NAV_FENCE_POLYGON_VERTEX_EXCLUSION = 5002,
  NAV_FENCE_CIRCLE_INCLUSION = 5003,
  NAV_FENCE_CIRCLE_EXCLUSION = 5004,
  NAV_RALLY_POINT = 5100,
  UAVCAN_GET_NODE_INFO = 5200,
  PAYLOAD_PREPARE_DEPLOY = 30001,
  PAYLOAD_CONTROL_DEPLOY = 30002,
  WAYPOINT_USER_1 = 31000,
  WAYPOINT_USER_2 = 31001,
  WAYPOINT_USER_3 = 31002,
  WAYPOINT_USER_4 = 31003,
  WAYPOINT_USER_5 = 31004,
  SPATIAL_USER_1 = 31005,
  SPATIAL_USER_2 = 31006,
  SPATIAL_USER_3 = 31007,
  SPATIAL_USER_4 = 31008,
  SPATIAL_USER_5 = 31009,
  USER_1 = 31010,
  USER_2 = 31011,
  USER_3 = 31012,
  USER_4 = 31013,
  USER_5 = 31014
}

// ArduCopter Flight Modes
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

// Flight mode mapping
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

// Valid flight mode names for MCP tool validation
export type FlightModeName = keyof typeof FLIGHT_MODE_NAMES extends number 
  ? typeof FLIGHT_MODE_NAMES[keyof typeof FLIGHT_MODE_NAMES]
  : never;

// MAVLink Component IDs
export enum MAV_COMPONENT {
  COMP_ID_ALL = 0,
  COMP_ID_AUTOPILOT1 = 1,
  COMP_ID_USER1 = 25,
  COMP_ID_USER2 = 26,
  COMP_ID_USER3 = 27,
  COMP_ID_USER4 = 28,
  COMP_ID_USER5 = 29,
  COMP_ID_USER6 = 30,
  COMP_ID_USER7 = 31,
  COMP_ID_USER8 = 32,
  COMP_ID_USER9 = 33,
  COMP_ID_USER10 = 34,
  COMP_ID_USER11 = 35,
  COMP_ID_USER12 = 36,
  COMP_ID_USER13 = 37,
  COMP_ID_USER14 = 38,
  COMP_ID_USER15 = 39,
  COMP_ID_USER16 = 40,
  COMP_ID_USER17 = 41,
  COMP_ID_USER18 = 42,
  COMP_ID_USER19 = 43,
  COMP_ID_CAMERA = 100,
  COMP_ID_CAMERA2 = 101,
  COMP_ID_CAMERA3 = 102,
  COMP_ID_CAMERA4 = 103,
  COMP_ID_CAMERA5 = 104,
  COMP_ID_CAMERA6 = 105,
  COMP_ID_SERVO1 = 140,
  COMP_ID_SERVO2 = 141,
  COMP_ID_SERVO3 = 142,
  COMP_ID_SERVO4 = 143,
  COMP_ID_SERVO5 = 144,
  COMP_ID_SERVO6 = 145,
  COMP_ID_SERVO7 = 146,
  COMP_ID_SERVO8 = 147,
  COMP_ID_SERVO9 = 148,
  COMP_ID_SERVO10 = 149,
  COMP_ID_SERVO11 = 150,
  COMP_ID_SERVO12 = 151,
  COMP_ID_SERVO13 = 152,
  COMP_ID_SERVO14 = 153,
  COMP_ID_GIMBAL = 154,
  COMP_ID_LOG = 155,
  COMP_ID_ADSB = 156,
  COMP_ID_OSD = 157,
  COMP_ID_PERIPHERAL = 158,
  COMP_ID_QX1_GIMBAL = 159,
  COMP_ID_FLARM = 160,
  COMP_ID_PARACHUTE = 161,
  COMP_ID_WINCH = 169,
  COMP_ID_GIMBAL2 = 171,
  COMP_ID_GIMBAL3 = 172,
  COMP_ID_GIMBAL4 = 173,
  COMP_ID_GIMBAL5 = 174,
  COMP_ID_GIMBAL6 = 175,
  COMP_ID_BATTERY = 180,
  COMP_ID_BATTERY2 = 181,
  COMP_ID_MAVCAN = 189,
  COMP_ID_MISSIONPLANNER = 190,
  COMP_ID_ONBOARD_COMPUTER = 191,
  COMP_ID_ONBOARD_COMPUTER2 = 192,
  COMP_ID_ONBOARD_COMPUTER3 = 193,
  COMP_ID_ONBOARD_COMPUTER4 = 194,
  COMP_ID_PATHPLANNER = 195,
  COMP_ID_OBSTACLE_AVOIDANCE = 196,
  COMP_ID_VISUAL_INERTIAL_ODOMETRY = 197,
  COMP_ID_PAIRING_MANAGER = 198,
  COMP_ID_IMU = 200,
  COMP_ID_IMU_2 = 201,
  COMP_ID_IMU_3 = 202,
  COMP_ID_GPS = 220,
  COMP_ID_GPS2 = 221,
  COMP_ID_ODID_TXRX_1 = 236,
  COMP_ID_ODID_TXRX_2 = 237,
  COMP_ID_ODID_TXRX_3 = 238,
  COMP_ID_UDP_BRIDGE = 240,
  COMP_ID_UART_BRIDGE = 241,
  COMP_ID_TUNNEL_NODE = 242,
  COMP_ID_SYSTEM_CONTROL = 250
}

// MAVLink Autopilot Types
export enum MAV_AUTOPILOT {
  GENERIC = 0,
  RESERVED = 1,
  SLUGS = 2,
  ARDUPILOTMEGA = 3,
  OPENPILOT = 4,
  GENERIC_WAYPOINTS_ONLY = 5,
  GENERIC_WAYPOINTS_AND_SIMPLE_NAVIGATION_ONLY = 6,
  GENERIC_MISSION_FULL = 7,
  INVALID = 8,
  PPZ = 9,
  UDB = 10,
  FP = 11,
  PX4 = 12,
  SMACCMPILOT = 13,
  AUTOQUAD = 14,
  ARMAZILA = 15,
  AEROB = 16,
  ASLUAV = 17,
  SMARTAP = 18,
  AIRRAILS = 19,
  REFLEX = 20
}

// MAVLink Vehicle Types
export enum MAV_TYPE {
  GENERIC = 0,
  FIXED_WING = 1,
  QUADROTOR = 2,
  COAXIAL = 3,
  HELICOPTER = 4,
  ANTENNA_TRACKER = 5,
  GCS = 6,
  AIRSHIP = 7,
  FREE_BALLOON = 8,
  ROCKET = 9,
  GROUND_ROVER = 10,
  SURFACE_BOAT = 11,
  SUBMARINE = 12,
  HEXAROTOR = 13,
  OCTOROTOR = 14,
  TRICOPTER = 15,
  FLAPPING_WING = 16,
  KITE = 17,
  ONBOARD_CONTROLLER = 18,
  VTOL_DUOROTOR = 19,
  VTOL_QUADROTOR = 20,
  VTOL_TILTROTOR = 21,
  VTOL_RESERVED2 = 22,
  VTOL_RESERVED3 = 23,
  VTOL_RESERVED4 = 24,
  VTOL_RESERVED5 = 25,
  GIMBAL = 26,
  ADSB = 27,
  PARAFOIL = 28,
  DODECAROTOR = 29,
  CAMERA = 30,
  CHARGING_STATION = 31,
  FLARM = 32,
  SERVO = 33,
  ODID = 34,
  DECAROTOR = 35,
  BATTERY = 36,
  PARACHUTE = 37,
  LOG = 38,
  OSD = 39,
  IMU = 40,
  GPS = 41,
  WINCH = 42
}