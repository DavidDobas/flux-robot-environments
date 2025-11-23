import argparse
import asyncio
import json
import sys
import time
from lerobot.teleoperators.so101_leader import SO101Leader, SO101LeaderConfig
import websockets

PORT_LEADER = "/dev/tty.usbmodem5A4B0479861"


def get_leader_config():
    return SO101LeaderConfig(
        port=PORT_LEADER,
        id="my_awesome_leader_arm",
    )

def calibrate_leader():
    config = get_leader_config()

    leader = SO101Leader(config)
    leader.connect(calibrate=False)
    leader.calibrate()
    leader.disconnect()


def test_leader(fps: int = 30):
    """
    Display joint angles live on a single line in the terminal.
    
    Args:
        fps: Frames per second for updates (default: 30)
    """
    config = get_leader_config()
    leader = SO101Leader(config)
    leader.connect()
    
    print(f"Leader device connected on {PORT_LEADER}")
    print(f"Displaying joint angles at {fps} fps (Ctrl+C to stop)")
    print("-" * 80)
    
    try:
        while True:
            loop_start = time.perf_counter()
            
            # Get action from leader
            action = leader.get_action()
            
            # Create a compact single-line display (shorten names)
            action_parts = []
            for motor, value in action.items():
                # Shorten motor names for compact display
                short_name = motor.replace('.pos', '').replace('shoulder_', 's_').replace('elbow_', 'e_').replace('wrist_', 'w_')
                action_parts.append(f"{short_name}:{value:>6.2f}")
            
            action_str = " | ".join(action_parts)
            
            # Calculate timing
            loop_s = time.perf_counter() - loop_start
            timing_str = f"[{loop_s * 1e3:.1f}ms, {1 / loop_s:.0f}Hz]"
            
            # Clear line and print (use ANSI escape codes)
            # \r returns to start of line, \033[K clears from cursor to end of line
            sys.stdout.write(f"\r\033[K{action_str} {timing_str}")
            sys.stdout.flush()
            
            # Sleep to maintain fps
            dt_s = time.perf_counter() - loop_start
            sleep_time = max(0, 1 / fps - dt_s)
            if sleep_time > 0:
                time.sleep(sleep_time)
                
    except KeyboardInterrupt:
        print("\n\nShutting down...")
    finally:
        leader.disconnect()
        print("Leader device disconnected")

def teleop_websocket(fps: int = 30, host: str = "localhost", port: int = 8765):
    """
    Stream teleoperator actions via WebSocket at specified fps.
    
    Args:
        fps: Frames per second for action updates (default: 30)
        host: WebSocket server host (default: "localhost")
        port: WebSocket server port (default: 8765)
    """
    # Set of connected clients
    connected_clients = set()
    
    # Initialize teleoperator
    teleop_config = get_leader_config()
    teleop_device = SO101Leader(teleop_config)
    teleop_device.connect()
    
    print(f"Leader device connected on {PORT_LEADER}")
    
    async def handle_client(websocket):
        """Handle new WebSocket client connection."""
        connected_clients.add(websocket)
        print(f"Client connected. Total clients: {len(connected_clients)}")
        try:
            # Keep connection alive and wait for disconnect
            await websocket.wait_closed()
        finally:
            connected_clients.remove(websocket)
            print(f"Client disconnected. Total clients: {len(connected_clients)}")
    
    async def broadcast_actions():
        """Continuously read actions and broadcast to all clients."""
        display_len = max(len(key) for key in teleop_device.action_features)
        
        while True:
            loop_start = time.perf_counter()
            
            # Get action from leader
            action = teleop_device.get_action()
            
            # Convert action to JSON-serializable format
            # Strip .pos suffix from motor names to match URDF joint names
            action_data = {
                "timestamp": time.time(),
                "actions": {motor.replace('.pos', ''): float(value) for motor, value in action.items()}
            }
            
            # Broadcast to all connected clients
            if connected_clients:
                message = json.dumps(action_data)
                # Send to all clients concurrently
                await asyncio.gather(
                    *[client.send(message) for client in connected_clients],
                    return_exceptions=True
                )
            
            # Calculate timing
            dt_s = time.perf_counter() - loop_start
            sleep_time = max(0, 1 / fps - dt_s)
            
            # Use asyncio.sleep for async context
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
            
            loop_s = time.perf_counter() - loop_start
            
            # Display action info on a single line (compact format like test mode)
            action_parts = []
            for motor, value in action.items():
                # Shorten motor names for compact display
                short_name = motor.replace('.pos', '').replace('shoulder_', 's_').replace('elbow_', 'e_').replace('wrist_', 'w_')
                action_parts.append(f"{short_name}:{value:>6.2f}")
            
            action_str = " | ".join(action_parts)
            timing_str = f"[{loop_s * 1e3:.1f}ms, {1 / loop_s:.0f}Hz]"
            client_str = f"clients:{len(connected_clients)}"
            
            # Clear line and print (use ANSI escape codes)
            sys.stdout.write(f"\r\033[K{action_str} {timing_str} {client_str}")
            sys.stdout.flush()
    
    async def main():
        """Main async function to run WebSocket server and action broadcasting."""
        # Start WebSocket server
        async with websockets.serve(handle_client, host, port):
            print(f"WebSocket server started on ws://{host}:{port}")
            print(f"Streaming actions at {fps} fps")
            print("-" * 50)
            
            # Run action broadcasting
            await broadcast_actions()
    
    # Run the async event loop
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        teleop_device.disconnect()
        print("Leader device disconnected")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SO101 Leader Teleoperator Control")
    parser.add_argument(
        "mode",
        choices=["calibrate", "test", "websocket"],
        help="Mode to run: calibrate (calibrate the leader), test (display joint angles), websocket (stream over WebSocket)"
    )
    parser.add_argument(
        "--fps",
        type=int,
        default=30,
        help="Frames per second for test/websocket modes (default: 30)"
    )
    parser.add_argument(
        "--host",
        type=str,
        default="localhost",
        help="WebSocket server host (default: localhost)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8765,
        help="WebSocket server port (default: 8765)"
    )
    
    args = parser.parse_args()
    
    if args.mode == "calibrate":
        calibrate_leader()
    elif args.mode == "test":
        test_leader(fps=args.fps)
    elif args.mode == "websocket":
        teleop_websocket(fps=args.fps, host=args.host, port=args.port)