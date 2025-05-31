function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function playSound(type) {
  const sound = new Audio(`assets/sounds/${type}.wav`);
  sound.play().catch(e => console.log("Sound play error:", e));
}

function createFloatingCards(container, count = 20) {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['ace', 'king', 'queen', 'jack', '10', '9', '8', '7', '6'];
  
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'floating-card';
    
    const isFaceUp = Math.random() > 0.3;
    if (isFaceUp) {
      const suit = suits[Math.floor(Math.random() * suits.length)];
      const rank = ranks[Math.floor(Math.random() * ranks.length)];
      card.style.backgroundImage = `url(assets/cards/${suit}/${rank}.png)`;
    } else {
      card.style.backgroundImage = 'url(assets/cards/back.png)';
    }
    
    card.style.left = `${Math.random() * 100}%`;
    const duration = 15 + Math.random() * 20;
    card.style.animation = `floatCard ${duration}s linear infinite`;
    card.style.opacity = `${0.1 + Math.random() * 0.15}`;
    card.style.zIndex = Math.floor(Math.random() * 10);
    
    container.appendChild(card);
  }
}

function initPage() {
  const floatingCards = document.querySelector('.floating-cards');
  if (floatingCards) {
    createFloatingCards(floatingCards);
  }
  
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      playSound('chip');
    });
  });
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', initPage);