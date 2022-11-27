import random
from collections import deque
import asyncio
import json

class Player:
    def __init__(self, player_socket, name):
        self.websocket = player_socket
        self.score = 0
        self.stage = 0
        self.name = name
        self.done = asyncio.Event()


class Game:
    def __init__(self):
        self.players = []
        self.started = asyncio.Event()
        self.seed = int(random.random() * 1000000)
        self.countdown = 3

    def add_player(self, player_socket, name):
        self.players.append(Player(player_socket, name))
        return len(self.players) - 1

    def increase_score(self, id):
        self.players[id].increase_score()

    async def player_handle(self, id):  
        await self.broadcast(json.dumps({"playerID": id, "players": self.get_players()}))
        # Wait for start signal
        if id == 0:
            while True:
                start = await self.players[id].websocket.recv()
                if start == 'start':
                    self.started.set()
                    break
        await self.started.wait()
        
        # Start countdown
        await self.players[id].websocket.send("starting")
        for i in range(self.countdown):
            await self.players[id].websocket.send(json.dumps({"type":"countdown", "message":self.countdown-i}))
            await asyncio.sleep(1)
        
        # Send seed
        await self.players[id].websocket.send(json.dumps({"type":"seed", "message":str(self.seed)}))

        # Wait for answers
        while True:
            solving = await self.players[id].websocket.recv()
            if solving == '0':
                break
            else:
                self.players[id].score += 1
                await self.broadcast(id)
        
        # Signal done and wait for others
        self.players[id].done.set()
        for player in self.players:
            await player.done.wait()

        # Message game done
        await self.players[id].websocket.send("Your final score is " + str(self.players[id].score))
        await self.players[id].websocket.send("Game done!")
        

    def get_sockets(self):
        return [player.websocket for player in self.players]
    
    def start_game(self):
        self.started = True

    async def broadcast(self, id):
        for player in self.players:
            await player.websocket.send(str(id))
    
    def get_players(self):
        return [player.name for player in self.players]