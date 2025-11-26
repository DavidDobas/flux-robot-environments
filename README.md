# Flux Robot Environments

A 3D robot simulation environment with real-time teleoperation and AI-powered scene generation using Gaussian Splatting and FLUX.

## Overview

This project combines:
- **3D Robot Simulation** - Interactive robot control using Three.js and URDF models
- **Gaussian Splatting** - Real-time 3D scene rendering from point clouds
- **AI Scene Generation** - FLUX-powered image generation for dynamic environments
- **WebSocket Communication** - Real-time teleoperation and state synchronization

## Project Structure

```
flux-robot-environments/
├── client/          # React + Vite frontend with Three.js
├── server/          # Express backend API
├── teleop/          # Python teleoperation module
└── captures/        # Generated scenes and capture sessions
```

## Prerequisites

- **Node.js** (v16 or higher)
- **Python** 3.12+
- **uv** (Python package installer)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd flux-robot-environments
```

### 2. Install Dependencies

#### Root Dependencies
```bash
npm install
```

#### Server Dependencies
```bash
cd server
npm install
cd ..
```

#### Client Dependencies
```bash
cd client
npm install
cd ..
```

#### Teleop Dependencies (Optional)
```bash
cd teleop
python3 -m venv ../.venv
source ../.venv/bin/activate
uv pip install -e .
cd ..
```

### Quick Install (All at Once)
```bash
npm install && \
cd server && npm install && cd .. && \
cd client && npm install && cd ..
```

## Running the Project

### Development Mode (Recommended)

Run both client and server simultaneously:

```bash
npm run dev
```

This will start:
- **Server** on `http://localhost:3001`
- **Client** on `http://localhost:5173`

### Run Components Separately

#### Server Only
```bash
npm run server
# or
cd server && npm run dev
```

#### Client Only
```bash
npm run client
# or
cd client && npm run dev
```

#### Teleop (Python)
```bash
cd teleop
source ../.venv/bin/activate
python main.py
```

## Features

### 3D Robot Simulation
- URDF-based robot model loading
- Real-time inverse kinematics
- Interactive robot control via keyboard and mouse
- Physics simulation with Rapier3D

### Scene Management
- Multiple pre-loaded environments (table, moon, cat scenes)
- Gaussian Splat rendering (.ply files)
- Custom scene loading and management
- Capture and session recording

### AI Generation
- FLUX-powered scene generation
- Real-time image generation from prompts
- Scene augmentation and modification
- Automatic capture and storage

### WebSocket Communication
- Real-time robot state updates
- Teleoperation support
- Bi-directional communication between client and teleop

## Tech Stack

### Frontend
- **React** - UI framework
- **Three.js** - 3D rendering
- **Vite** - Build tool and dev server
- **@mkkellogg/gaussian-splats-3d** - Gaussian Splatting renderer
- **urdf-loader** - Robot model loading
- **@dimforge/rapier3d** - Physics engine

### Backend
- **Express** - Web server
- **CORS** - Cross-origin support
- **WebSocket** - Real-time communication

### Teleop
- **lerobot** - Robot learning and control
- **websockets** - WebSocket client

## Development

### Client Scripts
```bash
cd client
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Server Scripts
```bash
cd server
npm run dev      # Start with nodemon (auto-reload)
npm start        # Start without auto-reload
```

## API Endpoints

### Robot Control
- `GET /api/robot/state` - Get current robot state
- `POST /api/robot/move` - Send movement commands

### Scene Management
- `GET /api/scenes` - List available scenes
- `GET /api/scenes/:name` - Get specific scene data

### Generation
- `POST /api/generate` - Generate new scene with FLUX

## Configuration

Configuration files are located in `client/src/config/`:
- `generationPrompts.js` - AI generation prompt templates
- Scene configurations and parameters

## Captures

Generated scenes and capture sessions are stored in:
```
captures/
├── cat/
├── moon/
└── table/
    └── session-YYYY-MM-DD-HH-MM-SS/
        ├── capture-*.png
        └── generations/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

ISC

## Troubleshooting

### Port Already in Use
If you see port conflicts, check if services are already running:
```bash
lsof -i :3001  # Server port
lsof -i :5173  # Client port
```

### Module Not Found Errors
Make sure all dependencies are installed:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

### Python Environment Issues
Ensure the virtual environment is activated:
```bash
source .venv/bin/activate
```

## Acknowledgments

- [Mechaverse](https://github.com/jurmy24/mechaverse) - Universal 3D viewer for robot models and scenes
- [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) - Gaussian Splatting implementation
- [FLUX](https://github.com/black-forest-labs/flux) - AI image generation
- [LeRobot](https://github.com/huggingface/lerobot) - Robot learning framework

