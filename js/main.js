document.addEventListener('DOMContentLoaded', () => {
  const createBtn = document.getElementById('createBtn');
  const joinBtn = document.getElementById('joinBtn');
  const roomCodeInput = document.getElementById('roomCode');
  
  createBtn.addEventListener('click', () => {
    const roomId = generateRoomId();
    const username = `Игрок${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem('username', username);
    window.location.href = `lobby.html?room=${roomId}&host=true`;
  });
  
  joinBtn.addEventListener('click', () => {
    const roomId = roomCodeInput.value.trim().toUpperCase();
    if (roomId && roomId.length >= 4) {
      const username = `Игрок${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem('username', username);
      window.location.href = `lobby.html?room=${roomId}`;
    } else {
      roomCodeInput.placeholder = 'ВВЕДИТЕ КОД ПРЕЖДЕ ЧЕМ ПРИСОЕДИНИТЬСЯ!';
      roomCodeInput.classList.add('shake');
      setTimeout(() => roomCodeInput.classList.remove('shake'), 500);
    }
  });
  
  roomCodeInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      joinBtn.click();
    }
  });
}); 