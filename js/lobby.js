document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room') || generateRoomId();
  const isHost = urlParams.get('host') === 'true';
  const username = localStorage.getItem('username') || 'Игрок';
  
  document.getElementById('roomId').textContent = roomId;
  
  document.getElementById('copyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        showNotification('Ссылка скопирована!', 'success');
      })
      .catch(err => {
        showNotification('Ошибка копирования', 'error');
      });
  });
  
  document.getElementById('addBotBtn').addEventListener('click', () => {
    showNotification('Бот добавлен в игру!', 'success');
    addPlayerToLobby(`🤖 Бот${Math.floor(Math.random() * 100)}`, true);
  });
  
  document.getElementById('startBtn').addEventListener('click', () => {
    window.location.href = `game.html?room=${roomId}`;
  });
  
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatMessages = document.getElementById('chatMessages');
  
  function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
      addMessageToChat(username, message);
      messageInput.value = '';
    }
  }
  
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  function addPlayerToLobby(name, isBot = false) {
    const playersList = document.getElementById('playersList');
    const playerCount = playersList.children.length;
    
    if (playerCount >= 6) return;
    
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card';
    
    playerCard.innerHTML = `
      <div class="player-avatar">${isBot ? '🤖' : '👤'}</div>
      <div class="player-name">${name}</div>
      <div class="player-status">${isBot ? 'Бот' : 'Готов'}</div>
    `;
    
    playersList.appendChild(playerCard);
    document.getElementById('playersCount').textContent = playerCount + 1;
    
    if (playerCount + 1 >= 2) {
      document.getElementById('startBtn').disabled = false;
      document.getElementById('startBtn').textContent = 'НАЧАТЬ ИГРУ!';
    }
  }
  
  function addMessageToChat(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === username ? 'player' : 'opponent'}`;
    messageDiv.textContent = `${sender}: ${message}`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  addPlayerToLobby(username);
  
  console.log(`Подключение к комнате ${roomId} как ${username}`);
  
  setTimeout(() => {
    if (isHost) {
      addPlayerToLobby('ДругойИгрок');
      addMessageToChat('ДругойИгрок', 'Привет! Готов играть!');
    }
  }, 4000);
}); 