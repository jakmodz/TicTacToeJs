const ws = new WebSocket('ws://localhost:8080');
        let myPlayer = null;
        let currentPlayer = 0;
        let gameActive = false;
        const playerLabel = document.getElementById('playerLabel');
        const board = document.getElementById('board');
        const status = document.getElementById('status');
        const createGameBtn = document.getElementById('createGame');
        const joinGameBtn = document.getElementById('joinGame');
        const joinGameId = document.getElementById('joinGameId');
        const gameIdDisplay = document.getElementById('gameId');

        createGameBtn.addEventListener('click', () => {
            ws.send(JSON.stringify({ type: 'create' }));
        });

        joinGameBtn.addEventListener('click', () => {
            const gameId = joinGameId.value.trim();
            if (gameId) {
                ws.send(JSON.stringify({ type: 'join', gameId }));
            }
        });

        board.addEventListener('click', (e) => 
          {
            if (!gameActive) return;
            if (currentPlayer !== myPlayer) return;

            const cell = e.target;
            if (cell.classList.contains('cell') && !cell.textContent) 
                {
                const position = parseInt(cell.dataset.index);
                ws.send(JSON.stringify({
                    type: 'move',
                    gameId: gameIdDisplay.dataset.gameId,
                    position
                }));
            }
        });

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) 
            {
                case 'created':
                    gameIdDisplay.textContent = `Game ID: ${data.gameId}`;
                    gameIdDisplay.dataset.gameId = data.gameId;
                    myPlayer = data.player;
                    playerLabel.textContent = `You are Player X`;
                    playerLabel.style.backgroundColor = '#2196F3';
                    status.textContent = 'Waiting for opponent to join...';
                    break;

                case 'joined':
                    gameIdDisplay.textContent = `Game ID: ${data.gameId}`;
                    gameIdDisplay.dataset.gameId = data.gameId;
                    myPlayer = data.player;
                    playerLabel.textContent = `You are Player O`;
                    playerLabel.style.backgroundColor = '#F44336';
                    break;

                case 'start':
                    gameActive = true;
                    updateBoard(data.board);
                    updateStatus();
                    break;

                case 'update':
                    updateBoard(data.board);
                    currentPlayer = data.currentPlayer;
                    
                    if (data.winner !== null) 
                        {
                        gameActive = false;
                        status.textContent = data.winner === (myPlayer === 0 ? 'X' : 'O') ? 'You won!' : 'You lost!';
                    }
                    else if (data.isDraw) 
                        {
                        gameActive = false;
                        status.textContent = "It's a draw!";
                        }
                    else 
                        {
                        updateStatus();
                        }
                    break;

                case 'opponent_left':
                    gameActive = false;
                    status.textContent = 'Opponent left the game';
                    break;
            }
        };

        function updateBoard(boardState) {
            const cells = document.getElementsByClassName('cell');
            for (let i = 0; i < cells.length; i++) {
                cells[i].textContent = boardState[i] || '';
            }
        }

        function updateStatus() {
            status.textContent = currentPlayer === myPlayer ? 
                'Your turn!' : 
                "Opponent's turn";
        }

        ws.onclose = () => {
            status.textContent = 'Connection lost. Please refresh the page.';
            gameActive = false;
        };