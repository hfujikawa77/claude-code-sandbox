# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
```bash
# Development server with hot reload
npm run dev

# Development with debugging
npm run dev:debug

# Production build
npm run build

# Production build with declarations and source maps
npm run build:prod

# Run production server
npm start

# Production server with environment
npm run start:prod

# Type checking without compilation
npm run typecheck

# Run test suite (basic functionality test)
npm test

# Jest test suite with coverage
npx jest --coverage

# Watch mode for continuous compilation
npm run watch

# Clean build artifacts
npm run clean
```

### Docker Commands
```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run
```

### Package Commands
```bash
# Install globally
npm run install:global

# Create package
npm run package
```

## Architecture

This repository contains an MCP (Model Context Protocol) server that provides a bridge between AI assistants and ArduPilot drone control systems. The project is implemented in TypeScript with comprehensive error handling, connection management, and testing infrastructure.

### Core Components

- **MCP Server**: Built with @modelcontextprotocol/sdk, exposes drone control functions as MCP tools
- **ArduPilot Connection**: Uses node-mavlink to communicate with ArduPilot via UDP with robust connection management
- **Error Handling System**: Type-safe error management with Japanese localization and troubleshooting guidance
- **Configuration Management**: Environment-variable based configuration with validation
- **Testing Infrastructure**: Jest-based test suite with mocks and integration tests

### Key Architecture Files

#### Core Implementation
- `src/index.ts`: Main entry point with process lifecycle management and global error handling
- `src/mcp-server.ts`: ArduPilotMcpServer class implementing MCP protocol with tool registration
- `src/connection.ts`: ArduPilotConnection class with connection pooling, auto-reconnect, and timeout management
- `src/errors.ts`: Comprehensive error handling system with custom error types and Japanese messages
- `src/config.ts`: Environment-based configuration management with type safety and validation

#### Type Definitions
- `src/mavlink-types.ts`: Complete MAVLink protocol type definitions
- `src/types.ts`: Application-specific interfaces for MCP tools and parameters

#### Testing
- `test-mcp.mjs`: Basic functionality verification script
- `src/__tests__/`: Unit tests for core components
- `tests/integration/`: Integration tests for end-to-end scenarios
- `tests/mocks/`: Mock implementations for ArduPilot simulation

### Error Handling Architecture

The system implements a three-tier error handling approach:

1. **Custom Error Types**: Specific error classes (ConnectionError, TimeoutError, ParameterError) with structured data
2. **Error Factory Pattern**: Centralized error creation with consistent formatting and troubleshooting guidance
3. **Graceful Degradation**: Auto-reconnection, timeout management, and resource cleanup via finally blocks

All errors include Japanese user-friendly messages and specific troubleshooting steps.

### Connection Management Strategy

- **Connection Pooling**: Reuse connections when possible to reduce overhead
- **Auto-Reconnection**: Configurable retry attempts with exponential backoff
- **Resource Cleanup**: Guaranteed connection cleanup using try/finally patterns
- **Health Monitoring**: Continuous connection state tracking and heartbeat validation
- **Timeout Handling**: Configurable timeouts for heartbeat (10s default) and commands

### Available MCP Tools

#### Command Tools
- `arm`: Arms the vehicle motors (no parameters)
- `disarm`: Disarms the vehicle motors (no parameters)
- `takeoff`: Initiates takeoff to specified altitude (altitude: 1-100m, default 10m)
- `change_mode`: Changes flight mode (supports 27 ArduCopter modes)

#### Information Tools  
- `get_status`: Returns armed status, current mode, and system status (JSON output)
- `get_position`: Returns GPS position, altitude, heading, and velocity (JSON output)

### Configuration System

Environment variables are managed through the Config class with validation:

```bash
# Connection settings
ARDUPILOT_HOST=127.0.0.1
ARDUPILOT_PORT=14552
CONNECTION_TIMEOUT=10000
AUTO_RECONNECT=true
MAX_RECONNECT_ATTEMPTS=5

# Server settings
MCP_SERVER_NAME="ArduPilot Controller"
NODE_ENV=development
LOG_LEVEL=info
```

### Testing Strategy

The project uses a multi-layered testing approach:

1. **Unit Tests**: Jest-based tests for individual components with mocking
2. **Integration Tests**: End-to-end MCP server functionality
3. **Functionality Tests**: Basic operational verification (test-mcp.mjs)
4. **Coverage Requirements**: 80% minimum coverage across branches, functions, lines, and statements

### Development Workflow

1. Use `npm run dev` for development with hot reload
2. Run `npm run typecheck` frequently to catch type errors early
3. Execute `npm test` before committing to verify functionality
4. Use `npm run build` for production compilation verification
5. All commits should pass the CI/CD pipeline which includes linting, type checking, building, and testing

### CI/CD Pipeline

GitHub Actions workflow (.github/workflows/ci.yml) includes:
- Multi-Node.js version testing (18, 20)
- TypeScript compilation and type checking
- Jest test execution with coverage reporting
- Security audit and dependency validation
- Codecov integration for coverage tracking

### Connection Parameters
- Source System ID: 1
- Source Component ID: 90
- Default Protocol: UDP
- Default Port: 14552
- Heartbeat Interval: 1 second
- Default Timeout: 10 seconds
- Auto-reconnect: Enabled with configurable max attempts

## Project Workflow Rules

### Issue Management
- All issue work results MUST be documented in the corresponding GitHub issue
- Include detailed summaries of changes, implementation decisions, and testing results
- Document any challenges encountered and their solutions

### Pull Request Requirements
- Upon completion of any issue work, a Pull Request MUST be created
- PRs must reference the related issue number
- Include clear description of changes and testing performed
- Ensure all CI/CD checks pass before requesting review