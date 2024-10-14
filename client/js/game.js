const HOST = 'vps-1dbc726d.vps.ovh.us';
const PORT = '8001'

class Game {
    constructor() {
        this.stage = 0;
        this.dom = document.querySelector('.inner');
        this.websocket = null;
        this.party = null;
        this.myID = null;
        this.twister = null;
        this.question = null;
        this.answer = null;
        this.names = null;
        this.done = new Event('done');
        this.max_time = 120;
        this.welcomeScreen();
    }
    

    welcomeScreen = function() {
        this.dom.innerHTML =
        `<h1>Multiplayer Zetamac</h1>
        <p>
            Welcome to multiplayer zetamac. This project is inspired from
            the original zetamac, which can be found
            <a href="https://arithmetic.zetamac.com/">HERE</a>
        </p>
        <p>
        Enter name and party ID if applicable.
        </p>
        <input id="name" class="manu input" type="text" placeholder="Enter name">
        <div style="display: flex; flex-direction: row">
        <input id="party" class="menu input" type="text" placeholder="Party ID (optional)" />
        <button id="start" class="menu button primary">Start</button>
        </div>
        <p>
            <strong>How to Play - </strong>
            Over the course of next two minutes, you will be prompted with
            simple arithmetic questions. You will get a new question as soon
            as you answer the current one correctly. You have infinite attempts
            to solve each question.
        </p>
        <p>
            Made with <i class="fa-solid fa-heart" style="color: #e25555"></i> by <a href="https://www.mit.edu/~ishank/">Ishank Agrawal</a>
        </p>`;

        document.querySelector('.button').addEventListener('click', function() {
            let name = document.getElementById('name').value;
            if (name != '') {
                let party = document.getElementById('party').value;
                if (party == '') party = 'host';
                this.party = party;
                this.dom.innerHTML = '<h1>Connecting</h1>';
                let time = 1;
                let interval = window.setInterval(function() {
                    this.dom.innerHTML = '<h1>Connecting' + '.'.repeat(time) + '</h1>'
                    time = (time + 1) % 4;
                }.bind(this), 300
                );

                this.websocket = new WebSocket('wss://' + HOST + ':' + PORT);
                
                this.websocket.addEventListener('open', function () {
                    clearInterval(interval);
                    let player_info = {name: name, party: party}
                    this.websocket.send(JSON.stringify(player_info))
                }.bind(this));

                this.websocket.addEventListener('error', function () {
                    clearInterval(interval);
                    this.failScreen();
                }.bind(this))

                this.websocket.addEventListener('message', (event) => this.messageHandler(event))
            }
        }.bind(this))
    }

    failScreen = function() {
        this.dom.innerHTML = `<h1> Connection failed </h1><p> The server isn't responding. Please try again later.</p>`;
    }

    hostScreen = function(count) {
        let players = ''
        if (count == 1) players = 'you are the only player';
        else players = `${count} players are`
        this.dom.innerHTML = 
        `
        <h1>You are hosting the game! </h1>
        <div id="common">
            <p>The party link for this game room is <strong>${this.party}</strong>. Currently. <span id="player-count">${players}</span> online.</p>
        </div>
        <p>Click the button below to begin the game</p>
        <button class='primary button' id='start'>Start!</button>
        `
        document.getElementById('start').addEventListener('click', function () {
            this.websocket.send('start')
        }.bind(this))
    }

    wrongCodeScreen = function () {
        this.dom.innerHTML = `
        <h1>Wrong Party Code!</h1>
        <p> The party code you have entered, <strong>${this.party}</strong>, is invalid.</p>
        <p> This page should automatically refresh. Else click <a href="${location.href}">HERE</a>.
        `;
        window.setInterval(function(){window.location = location.href}, 3000);
    }

    waitScreen = function(count) {
        let players = ''
        if (count == 1) players = 'you are the only player';
        else players = `${count} players are`
        this.dom.innerHTML = 
        `
        <h1>Waiting for the host to start the game! </h1>
        <div id="common">
            <p>The party link for this game room is <strong>${this.party}</strong>. Currently. <span id="player-count">${players}</span> online.</p>
        </div>
        `
    }

    updateWaitScreen = function () {
        let count = this.players.length
        let players = ''
        if (count == 1) players = 'you are the only player';
        else players = `${count} players are`;
        document.getElementById('common').innerHTML = 
        `
        <p>The party link for this game room is <strong>${this.party}</strong>. Currently. <span id="player-count">${players}</span> online.</p>
        `
    }

    countdownScreen = function(time) {
        this.dom.innerHTML = 
        `
        <h1>Game starting in ${time}</h1>
        `
    }

    questionScreen = function() {
        this.updateQuestion();
        
        this.scoreboard = document.createElement('div');
        this.scoreboard.classList.add('scoreboard');
        document.body.appendChild(this.scoreboard);

        this.timer = document.createElement('div');
        this.timer.classList.add('timer');
        this.timer.innerText = this.max_time;
        document.body.appendChild(this.timer);

        this.updateScoreboard();

        let time_old = Date.now()
        let interval = setInterval(function(){
            let elapsed =  Math.round(this.max_time + (time_old - Date.now()) / 1000);
            if (elapsed < 0) {
                window.dispatchEvent(this.done)
                clearInterval(interval);
            }
            else this.timer.innerText = elapsed;
        }.bind(this), 1000)
    }

    finalScreen = function () {
        this.scoreboard.remove();
        this.timer.remove();
        let t = this.players.concat().sort(function (a, b) {
            if (a.score < b.score) return 1;
            if (a.score > b.score) return -1;
            else return 0;
        })
        let u = []
        for (var i = 0; i < t.length; i++) {
            u.push([t[i].name, t[i].score])
        }
        console.log(t)
        
        if (this.players[this.myID].score == t[0].score) {
            this.dom.innerHTML = `<h1>You won!</h1>`;
            this.dom.appendChild(this.createTable(u));
            var duration = 2000;
            var end = Date.now() + duration;

            (function frame() {
            // launch a few confetti from the left edge
            confetti({
                particleCount: 7,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            // and launch a few from the right edge
            confetti({
                particleCount: 7,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });

            // keep going until we are out of time
            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
            }());
        } else {
            this.dom.innerHTML = `<h1>Results</h1>`;
            this.dom.appendChild(this.createTable(u));
        }
    }

    updateQuestion = function() {
        let q = this.generateQuestion();
        this.question = q.question;
        this.answer = q.answer;
        this.dom.innerHTML = 
        `
        <div class="question wrapper">
            <span id="statement">${this.question} =</span>
            <input id="answer"/>
        </div>
        `
        document.getElementById('answer').focus();
    }

    messageHandler = function (message) {
        if (this.stage == 0) {
            if (message.data == 'error') {
                console.log('Error has ocurred');
                this.wrongCodeScreen();
                this.stage = 1;
            } else if (message.data == 'success') {
                this.waitScreen(null)
                this.stage = 1;
            } else {
                //Game room has been allocated
                this.party = message.data
                this.stage = 1;
                this.hostScreen(1);
            }
        } else if (this.stage == 1) {
            if (message.data == 'starting') {
                console.log('game is starting')
                this.stage = 2
            } else {
                let data = JSON.parse(message.data)
                if (this.myID == null) this.myID = data["playerID"];
                var names = data["players"]
                this.players = [];
                for (let i = 0; i < names.length; i++) {
                    this.players.push(new Player(names[i], i))
                }
                console.log(this.players);
                this.updateWaitScreen()
            }
        } else if (this.stage == 2) {
            let mes = JSON.parse(message.data)
            if (mes.type == 'countdown') this.countdownScreen(mes.message);
            else {
                this.twister = new MersenneTwister(parseInt(mes.message))
                this.questionScreen()
                document.addEventListener('keyup', function(){
                    if (this.checkAnswer()) {
                        this.players[this.myID].score += 1
                        this.updateQuestion()
                        document.getElementById('answer').focus();
                        this.updateScoreboard()
                        this.websocket.send('1')
                    }
                }.bind(this))
                window.addEventListener('done', function () {
                    this.finalScreen()
                }.bind(this))
                this.stage += 1
            }
        } else if (this.stage == 3) {
            let id = parseInt(message.data);
            if (id != this.myID) this.players[id].score += 1;
            this.updateScoreboard()
        } else {
            console.log(message.data)
        }
    }

    generateQuestion = function () {
        let seed1, seed2, seed3, op, a, b;
        seed1 = this.twister.random();
        seed2 = this.twister.random();
        seed3 = this.twister.random();
        op = Math.floor(seed3 * 4);
        if (op < 2) {
            a = 2 + Math.floor(seed1 * 99);
            b = 2 + Math.floor(seed2 * 99);
        }
        else {
            a = 2 + Math.floor(seed1 * 11);
            b = 2 + Math.floor(seed3 * 99);
        }
        if (op == 0) return { question: a + ' + ' + b, answer: a+b };
        if (op == 1) return { question: (a + b) + ' - ' + a, answer: b};
        if (op == 2) return { question: a + ' × ' + b, answer: a*b};
        if (op == 3) return { question: (a * b) + ' ÷ ' + a, answer: b};
    }

    checkAnswer = function() {
        if (document.getElementById('answer').value == String(this.answer)) return true;
        else return false;
    }

    updateScoreboard = function () {
        let score = '';
        let t = this.players.concat().sort(function (a, b) {
            if (a.score < b.score) return 1;
            if (a.score > b.score) return -1;
            else return 0;
        })

        console.log(t)

        for (var i = 0; i < t.length; i++) {
            if (t[i].id == this.myID) score += `<strong>${t[i].name}: ${t[i].score}</strong><br>`;
            else score += `${t[i].name}: ${t[i].score}<br>`;
            
        }
        this.scoreboard.innerHTML = `<p>${score}</p>`;
    }

    createTable(tableData) {
        var table = document.createElement('table');
        var tableBody = document.createElement('tbody');
    
        tableData.forEach(function(rowData) {
            var row = document.createElement('tr');
    
            rowData.forEach(function(cellData) {
            var cell = document.createElement('td');
            cell.appendChild(document.createTextNode(cellData));
            row.appendChild(cell);
            });
    
            tableBody.appendChild(row);
        });
    
        table.appendChild(tableBody);
        return table
    }

}