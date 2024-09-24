import random
import asyncio
import json

class Player:
    """
    Represents a player in the game.

    Attributes:
        websocket: The player's websocket connection.
        score (int): The player's current score.
        stage (int): The player's current stage in the game.
        name (str): The player's name.
        done (asyncio.Event): An event to signal when the player is done.
    """
    def __init__(self, player_socket, name):
        """
        Initialize a new Player instance.

        Args:
            player_socket: The websocket connection for the player.
            name (str): The name of the player.
        """
        self.websocket = player_socket
        self.score = 0
        self.stage = 0
        self.name = name
        self.done = asyncio.Event()


class Game:
    """
    Represents a game session with multiple players.

    Attributes:
        players (list): List of Player objects in the game.
        started (asyncio.Event): Event to signal when the game has started.
        seed (int): Random seed for the game.
        countdown (int): Countdown duration before the game starts.
    """
    def __init__(self):
        """
        Initialize a new Game instance.

        Sets up the initial game state with an empty player list, a random seed,
        and a countdown timer.
        """
        self.players = []
        self.started = asyncio.Event()
        self.seed = int(random.random() * 1000000)
        self.countdown = 3

    def add_player(self, player_socket, name):
        """
        Add a new player to the game.

        Args:
            player_socket: The websocket connection for the player.
            name (str): The name of the player.

        Returns:
            int: The index of the newly added player in the players list.
        """
        self.players.append(Player(player_socket, name))
        return len(self.players) - 1

    async def player_handle(self, id):
        """
        Handle the game flow for a single player.

        This method manages the entire game process for a player, including:
        - Broadcasting player information
        - Waiting for the game to start
        - Managing the countdown
        - Sending the game seed
        - Processing player answers
        - Handling game completion

        Args:
            id (int): The index of the player in the players list.
        """
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
        """
        Get a list of websocket connections for all players in the game.

        Returns:
            list: A list of websocket connections for all players.
        """
        return [player.websocket for player in self.players]
    
    def start_game(self):
        """
        Start the game by setting the 'started' flag to True.

        This method signals that the game has officially begun.
        """
        self.started = True

    async def broadcast(self, id):
        """
        Broadcast a message to all players in the game.

        This method sends the given id as a string to all connected players.

        Args:
            id: The message to be broadcast (will be converted to a string).
        """
        for player in self.players:
            await player.websocket.send(str(id))
    
    def get_players(self):
        """
        Get a list of player names in the game.

        Returns:
            list: A list of names (strings) of all players in the game.
        """
        return [player.name for player in self.players]