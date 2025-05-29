# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Running the MCP Server
```bash
python ardupilot_mcp_server.py
```

## Architecture

This repository contains an MCP (Model Context Protocol) server that provides a bridge between AI assistants and ArduPilot drone control systems. The server uses the FastMCP framework to expose drone control functions as MCP tools.

### Core Components

- **MCP Server**: Built with FastMCP, exposes drone control functions as tools
- **ArduPilot Connection**: Uses pymavlink to communicate with ArduPilot via UDP (default: 127.0.0.1:14552)
- **Tool Functions**: Each drone operation (arm, takeoff, mode change, etc.) is exposed as an MCP tool

### Connection Strategy
The server creates new MAVLink connections for each operation and properly closes them to avoid connection leaks. Connection parameters:
- Source System ID: 1
- Source Component ID: 90
- Auto-reconnect enabled
- Default timeout: 10 seconds for heartbeat

### Available MCP Tools
- `arm()`: Arms the vehicle motors
- `disarm()`: Disarms the vehicle motors  
- `takeoff(altitude)`: Initiates takeoff to specified altitude
- `change_mode(mode)`: Changes flight mode (GUIDED, LAND, RTL, etc.)
- `get_status()`: Returns armed status, current mode, and system status
- `get_position()`: Returns GPS position, altitude, heading, and velocity

### Error Handling
Functions include comprehensive error handling with Japanese error messages and connection troubleshooting guidance. All functions use try/finally blocks to ensure connections are properly closed.