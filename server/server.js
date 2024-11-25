const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });


const games = new Map();


function generateGameId() 
{
    return Math.random().toString(36).substring(2, 8);
}


function checkWinner(board) 
{
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], 
        [0, 3, 6], [1, 4, 7], [2, 5, 8], 
        [0, 4, 8], [2, 4, 6] 
    ];

    for (let pattern of winPatterns) 
        {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) 
        {
            return board[a];
        }
    }
    return null;
}

server.on('connection', (ws) => 
    {
    ws.on('message', (message) => 
        {
        const data = JSON.parse(message);

        switch (data.type) 
        {
            case 'create':
                const gameId = generateGameId();
                games.set(gameId, {
                    board: Array(9).fill(null),
                    players: [ws],
                    currentPlayer: 0,
                    gameId
                });
                ws.gameId = gameId;
                ws.player = 0;
                ws.send(JSON.stringify(
                    {
                    type: 'created',
                    gameId,
                    player: 0
                }));
                break;

            case 'join':
                const game = games.get(data.gameId);
                if (game && game.players.length < 2) 
                    {
                    game.players.push(ws);
                    ws.gameId = data.gameId;
                    ws.player = 1;
                    ws.send(JSON.stringify(
                        {
                        type: 'joined',
                        gameId: data.gameId,
                        player: 1
                    }));

                    
                    game.players.forEach(player => 
                        {
                        player.send(JSON.stringify(
                            {
                            type: 'start',
                            board: game.board
                        }));
                    });
                }
                break;

            case 'move':
                const currentGame = games.get(data.gameId);
                if (currentGame && ws.player === currentGame.currentPlayer) 
                    {
                    const { position } = data;
                    if (currentGame.board[position] === null) {
                        currentGame.board[position] = ws.player === 0 ? 'X' : 'O';
                        currentGame.currentPlayer = currentGame.currentPlayer === 0 ? 1 : 0;

                        const winner = checkWinner(currentGame.board);
                        const isDraw = !currentGame.board.includes(null);

                        
                        currentGame.players.forEach(player => 
                            {
                            player.send(JSON.stringify(
                                {
                                type: 'update',
                                board: currentGame.board,
                                currentPlayer: currentGame.currentPlayer,
                                winner,
                                isDraw
                            }));
                        });

                        if (winner || isDraw) {
                            games.delete(data.gameId);
                        }
                    }
                }
                break;
        }
    });

    ws.on('close', () => 
        {
        if (ws.gameId && games.has(ws.gameId)) 
            {
            const game = games.get(ws.gameId);
            game.players.forEach(player => 
                {
                if (player !== ws && player.readyState === WebSocket.OPEN)
                     {
                    player.send(JSON.stringify(
                        {
                        type: 'opponent_left'
                    }));
                }
            });
            games.delete(ws.gameId);
        }
    });
});