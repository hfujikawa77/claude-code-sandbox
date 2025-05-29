# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### TypeScript Development Commands
```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Run production server
npm start

# Type checking without compilation
npm run typecheck

# Run test suite
npm test

# Watch mode for continuous compilation
npm run watch

# Clean build artifacts
npm run clean
```

### Legacy Python Server (deprecated)
```bash
python ardupilot_mcp_server.py
```

## Architecture

This repository contains an MCP (Model Context Protocol) server that provides a bridge between AI assistants and ArduPilot drone control systems. The project has been converted from Python to TypeScript for enhanced type safety and developer experience.

### Core Components

- **MCP Server**: Built with @modelcontextprotocol/sdk, exposes drone control functions as MCP tools
- **ArduPilot Connection**: Uses node-mavlink to communicate with ArduPilot via UDP (default: 127.0.0.1:14552)
- **MAVLink Protocol**: Comprehensive TypeScript type definitions for MAVLink messages and commands
- **Tool Functions**: Each drone operation (arm, takeoff, mode change, etc.) is exposed as a type-safe MCP tool

### TypeScript Structure

#### File Organization
- `src/index.ts`: Main entry point with async MCP server lifecycle
- `src/mcp-server.ts`: ArduPilotMcpServer class with MCP tool implementations
- `src/connection.ts`: ArduPilotConnection class with MAVLink communication
- `src/mavlink-types.ts`: Complete MAVLink protocol type definitions
- `src/types.ts`: Application-specific type interfaces
- `test-mcp.mjs`: Test suite for server functionality verification

#### Key Classes
- **ArduPilotMcpServer**: MCP server implementation with tool registration
- **ArduPilotConnection**: MAVLink connection management with type-safe methods
- **MAVLinkConverter**: Utility class for unit conversions and flight mode mapping

### Connection Strategy
The server creates new MAVLink connections for each operation and properly closes them to avoid connection leaks. Connection parameters:
- Source System ID: 1
- Source Component ID: 90
- Auto-reconnect enabled
- Default timeout: 10 seconds for heartbeat
- Protocol: UDP (configurable)
- Port: 14552 (configurable)

### Available MCP Tools

#### Command Tools
- `arm`: Arms the vehicle motors (no parameters)
- `disarm`: Disarms the vehicle motors (no parameters)
- `takeoff`: Initiates takeoff to specified altitude (altitude: 1-100m, default 10m)
- `change_mode`: Changes flight mode (mode: enum of valid flight modes)

#### Information Tools  
- `get_status`: Returns armed status, current mode, and system status (JSON output)
- `get_position`: Returns GPS position, altitude, heading, and velocity (JSON output)

### Flight Mode Support
Supports 27 ArduCopter flight modes including:
- STABILIZE, ACRO, ALT_HOLD, AUTO, GUIDED, LOITER, RTL, CIRCLE, LAND
- POSHOLD, BRAKE, SMART_RTL, FLOWHOLD, FOLLOW, ZIGZAG, and more

### Type Safety Features
- Complete MAVLink message type definitions
- Enum-based command and result validation
- Type-safe parameter validation for all MCP tools
- Structured error handling with proper TypeScript typing
- Unit conversion utilities with type annotations

### Error Handling
Functions include comprehensive error handling with Japanese error messages and connection troubleshooting guidance. All functions use async/await with try/finally blocks to ensure connections are properly closed. Type-safe error responses are returned via MCP content format.

### Development Workflow
1. Make changes to TypeScript source files in `src/`
2. Use `npm run dev` for development with hot reload
3. Run `npm test` to verify functionality
4. Use `npm run build` for production compilation
5. Deploy with `npm start` for production MCP server

### Testing
- `npm test`: Full build and functionality verification
- `test-mcp.mjs`: Comprehensive server instantiation and tool validation
- TypeScript compilation serves as comprehensive static analysis
- All 6 MCP tools verified through automated testing