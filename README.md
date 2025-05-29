# ArduPilot MCP Server

A TypeScript-based Model Context Protocol (MCP) server that provides a bridge between AI assistants and ArduPilot drone control systems.

## Features

- **Type-Safe MAVLink Communication**: Full TypeScript integration with ArduPilot via node-mavlink
- **MCP Tool Integration**: 6 comprehensive drone control tools accessible via MCP protocol
- **27 Flight Mode Support**: Complete ArduCopter flight mode compatibility
- **Real-time Vehicle Monitoring**: Status and position tracking with JSON output
- **Comprehensive Error Handling**: Japanese error messages with troubleshooting guidance
- **Development-Ready**: Hot reload, testing, and build automation

## Quick Start

### Prerequisites

- Node.js 18+ 
- TypeScript
- ArduPilot SITL or physical drone system
- MCP-compatible AI assistant (Claude, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/hfujikawa77/claude-code-sandbox.git
cd claude-code-sandbox

# Install dependencies
npm install

# Build the project
npm run build

# Run the MCP server
npm start
```

### Development

```bash
# Development mode with hot reload
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Watch mode for continuous compilation
npm run watch
```

## MCP Tools

### Command Tools
- **`arm`** - Arms the vehicle motors
- **`disarm`** - Disarms the vehicle motors  
- **`takeoff`** - Initiates takeoff (altitude: 1-100m, default: 10m)
- **`change_mode`** - Changes flight mode (GUIDED, LAND, RTL, etc.)

### Information Tools
- **`get_status`** - Returns vehicle status (armed, mode, system status)
- **`get_position`** - Returns GPS position, altitude, heading, and velocity

## Architecture

### Core Components

- **ArduPilotMcpServer**: MCP server implementation with tool registration
- **ArduPilotConnection**: MAVLink connection management with type-safe methods
- **MAVLinkConverter**: Utility class for unit conversions and flight mode mapping

### File Structure

```
src/
├── index.ts           # Main entry point
├── mcp-server.ts      # MCP server implementation
├── connection.ts      # ArduPilot connection management
├── mavlink-types.ts   # MAVLink protocol type definitions
└── types.ts           # Application-specific interfaces
```

## Configuration

Default connection settings:
- **Protocol**: UDP
- **Host**: 127.0.0.1
- **Port**: 14552
- **Source System ID**: 1
- **Source Component ID**: 90

## Supported Flight Modes

STABILIZE, ACRO, ALT_HOLD, AUTO, GUIDED, LOITER, RTL, CIRCLE, LAND, POSHOLD, BRAKE, SMART_RTL, FLOWHOLD, FOLLOW, ZIGZAG, and more (27 total).

## Example Usage

### With Claude Desktop

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "ardupilot": {
      "command": "node",
      "args": ["/path/to/claude-code-sandbox/dist/index.js"]
    }
  }
}
```

### Basic Commands

```typescript
// Arm the vehicle
await mcp.call('arm');

// Take off to 15 meters
await mcp.call('takeoff', { altitude: 15 });

// Change to GUIDED mode  
await mcp.call('change_mode', { mode: 'GUIDED' });

// Get current status
const status = await mcp.call('get_status');

// Get current position
const position = await mcp.call('get_position');
```

## Development

### TypeScript Migration

This project was converted from Python to TypeScript for enhanced type safety and developer experience. The legacy Python server (`ardupilot_mcp_server.py`) is preserved for reference but deprecated.

### Testing

```bash
# Run full test suite
npm test

# Test individual components
npm run test:build
npm run test:tools
```

### Contributing

1. Make changes to TypeScript source files in `src/`
2. Use `npm run dev` for development with hot reload
3. Run `npm test` to verify functionality  
4. Use `npm run build` for production compilation

## Requirements

- **ArduPilot**: SITL or hardware with MAVLink enabled
- **Connection**: UDP or TCP MAVLink connection
- **Node.js**: 18.0.0 or higher
- **MCP Client**: Compatible AI assistant or MCP client

## License

MIT

## Related Projects

- [ArduPilot](https://ardupilot.org/) - Open source autopilot software
- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol for AI tool integration  
- [node-mavlink](https://github.com/ArduPilot/node-mavlink) - TypeScript MAVLink library