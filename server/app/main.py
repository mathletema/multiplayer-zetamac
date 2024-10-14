import asyncio
import websockets
import random
from app.game import Game
import json

games = dict()

def generate_party_id():
    strings = ['abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789','123456789']
    output = ''
    for _ in range(6):
        output += random.choice(random.choice(strings))
    return output

async def handler(websocket):
    try:
        initial_info = await websocket.recv()
        initial_info = json.loads(initial_info)
        print(initial_info)
        if initial_info['party'] == 'host':
            game_id= generate_party_id()
            while game_id in games:
                game_id= generate_party_id()
            await websocket.send(str(game_id))
            games[game_id] = Game()
        else:
            game_id = initial_info['party']
            if game_id not in games:
                await websocket.send('error')
                return -1
            else:
                await websocket.send('success')
                pass
        name = initial_info['name']
        player_id = games[game_id].add_player(websocket, name)
        await games[game_id].player_handle(player_id)    
        if player_id == 0:
                del games[game_id]
    except websockets.ConnectionClosed:
        if player_id == 0:
            del games[game_id]


async def app():
    async with websockets.serve(handler, "", 8001):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(app())
    except KeyboardInterrupt:
        print('Closing server')