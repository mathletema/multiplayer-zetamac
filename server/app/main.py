import asyncio
import websockets
import random
from app.game import Game
import json

from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse

app = FastAPI()

games = dict()

def generate_party_id():
    strings = ['abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789','123456789']
    output = ''
    for _ in range(6):
        output += random.choice(random.choice(strings))
    return output

async def handler(websocket: WebSocket):
    try:
        initial_info = await websocket.receive_json()
        # initial_info = json.loads(initial_info)
        print(initial_info)
        if initial_info['party'] == 'host':
            game_id= generate_party_id()
            while game_id in games:
                game_id= generate_party_id()
            await websocket.send_text(str(game_id))
            games[game_id] = Game()
        else:
            game_id = initial_info['party']
            if game_id not in games:
                await websocket.send_text('error')
                return -1
            else:
                await websocket.send_text('success')
                pass
        name = initial_info['name']
        player_id = games[game_id].add_player(websocket, name)
        await games[game_id].player_handle(player_id)    
        if player_id == 0:
                del games[game_id]
    except websockets.ConnectionClosed:
        if player_id == 0:
            del games[game_id]


@app.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await handler(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
