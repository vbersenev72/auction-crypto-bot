import { Router, Request, Response } from 'express';
import swaggerSpec from './swagger.json';

const docsRouter = Router();

// Swagger JSON
docsRouter.get('/swagger.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});

// Swagger UI HTML
docsRouter.get('/', (_req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auction API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .websocket-section {
      padding: 20px;
      margin: 20px;
      background: #1a1a2e;
      border-radius: 8px;
      color: #fff;
    }
    .websocket-section h2 { color: #61affe; margin-top: 0; }
    .websocket-section h3 { color: #49cc90; }
    .websocket-section h4 { color: #fca130; margin: 10px 0 5px; }
    .websocket-section pre {
      background: #0d0d1a;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
    .websocket-section code { color: #98c379; }
    .event-card {
      background: #16213e;
      padding: 15px;
      margin: 10px 0;
      border-radius: 6px;
      border-left: 4px solid #61affe;
    }
    .event-card.client { border-left-color: #49cc90; }
    .event-card.server { border-left-color: #fca130; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  
  <div class="websocket-section">
    <h2>🔌 WebSocket Events (Socket.IO)</h2>
    
    <h3>Подключение</h3>
    <pre><code>import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});</code></pre>

    <h3>📤 Client → Server</h3>
    
    <div class="event-card client">
      <h4>join:auction</h4>
      <p>Подписаться на события аукциона</p>
      <pre><code>socket.emit('join:auction', 'AUCTION_UUID');</code></pre>
    </div>
    
    <div class="event-card client">
      <h4>leave:auction</h4>
      <p>Отписаться от аукциона</p>
      <pre><code>socket.emit('leave:auction', 'AUCTION_UUID');</code></pre>
    </div>

    <h3>📥 Server → Client</h3>
    
    <div class="event-card server">
      <h4>auction:state</h4>
      <p>Полное состояние аукциона (при подключении)</p>
      <pre><code>{
  "status": "active",
  "currentRound": 1,
  "totalRounds": 3,
  "round": {
    "id": "uuid",
    "roundNumber": 1,
    "itemsCount": 2,
    "timeRemaining": 45000
  },
  "leaderboard": [
    { "rank": 1, "username": "user1", "amount": 100, "isWinning": true, "isCurrentUser": true }
  ]
}</code></pre>
    </div>
    
    <div class="event-card server">
      <h4>timer:update</h4>
      <p>Обновление таймера (каждую секунду)</p>
      <pre><code>{
  "roundId": "uuid",
  "roundNumber": 1,
  "timeRemaining": 44000,
  "itemsCount": 2
}</code></pre>
    </div>
    
    <div class="event-card server">
      <h4>bid:update</h4>
      <p>Обновление лидерборда при новой ставке</p>
      <pre><code>{
  "roundNumber": 1,
  "leaderboard": [
    { "rank": 1, "username": "user2", "amount": 150, "isWinning": true, "timestamp": 1234567890 }
  ]
}</code></pre>
    </div>
    
    <div class="event-card server">
      <h4>round:end</h4>
      <p>Раунд завершён</p>
      <pre><code>{
  "roundNumber": 1,
  "winners": [
    { "username": "user1", "amount": 150, "giftNumber": 1 }
  ],
  "nextRound": 2
}</code></pre>
    </div>
    
    <div class="event-card server">
      <h4>auction:end</h4>
      <p>Аукцион завершён</p>
      <pre><code>{
  "finalLeaderboard": [
    { "rank": 1, "username": "user1", "amount": 150, "won": true }
  ]
}</code></pre>
    </div>
  </div>

  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/docs/swagger.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
        deepLinking: true,
        persistAuthorization: true
      });
    };
  </script>
</body>
</html>
  `.trim();

  res.type('html').send(html);
});

export { docsRouter };

