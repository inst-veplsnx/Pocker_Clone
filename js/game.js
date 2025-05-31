document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room') || 'DEMO';
  const username = localStorage.getItem('username') || 'Игрок';

  const sounds = {
    chip: new Audio('assets/sounds/chip.wav'),
    card: new Audio('assets/sounds/card.wav'),
    win: new Audio('assets/sounds/win.mp3')
  };

  const Blinds = { small: 10, big: 20 };
  const MinRaise = Blinds.big;
  const MaxPlayers = 6;

  const state = { 
    players: [], 
    deck: [], 
    communityCards: [], 
    pot: 0, 
    dealerIndex: -1, 
    currentBet: 0, 
    phase: 'preflop', 
    currentPlayerIdx: 0 
  };

  let currentRoundBets = {};

  initGameTable();
  startHand();

  function initGameTable() {
    document.querySelector('.action-panel').style.display = 'none';

    document.querySelectorAll('.player-seat').forEach((el, i) => {
      const nameEl = el.querySelector('.player-name');
      if (nameEl.textContent === '...') {
        nameEl.textContent = el.id === 'currentPlayer' ? username : `Игрок${i+1}`;
      }
      
      const isBot = el.id !== 'currentPlayer';
      
      state.players.push({ 
        el, 
        name: nameEl.textContent, 
        chips: 1000, 
        hand: [], 
        invested: 0, 
        folded: false, 
        isBot 
      });
      
      const handContainer = el.querySelector('.player-cards'); 
      handContainer.innerHTML = '';
      
      for (let j = 0; j < 2; j++) { 
        const slot = document.createElement('div'); 
        slot.className = 'card back'; 
        handContainer.appendChild(slot); 
      }
    });

    const comm = document.getElementById('communityCards'); 
    comm.innerHTML = '';
    
    for (let i = 0; i < 5; i++) { 
      const card = document.createElement('div'); 
      card.className = 'community-card back'; 
      card.id = `communityCard${i+1}`; 
      comm.appendChild(card); 
    }

    document.getElementById('potAmount').textContent = '0';
    
    const raiseSlider = document.getElementById('raiseSlider');
    const raiseAmount = document.getElementById('raiseAmount');
    
    if (raiseSlider && raiseAmount) {
      raiseSlider.min = MinRaise;
      raiseSlider.max = 500;
      raiseSlider.value = MinRaise;
      raiseAmount.textContent = MinRaise;
      
      raiseSlider.addEventListener('input', function() {
        raiseAmount.textContent = this.value;
      });
    }
  }

  function startHand() {
    resetStateForHand();
    shuffleDeck();
    
    currentRoundBets = {};
    state.players.forEach(p => currentRoundBets[p.name] = 0);
    
    postBlinds();
    dealHoleCards();
    state.phase = 'preflop';
    state.currentBet = Blinds.big;
    state.currentPlayerIdx = (state.dealerIndex + 3) % state.players.length;
    renderTable();
    runBettingRound();
  }

  function resetStateForHand() {
    state.players.forEach(p => {
      p.hand = [];
      p.invested = 0;
      p.folded = false;
      p.el.classList.remove('folded', 'active');
      p.el.querySelector('.player-bet').textContent = '0';
      p.el.querySelector('.player-chips').textContent = p.chips;
      p.el.querySelectorAll('.player-cards .card').forEach(c => { 
        c.classList.add('back'); 
        c.style.backgroundImage = `url(assets/cards/back.png)`;
      });
    });
    
    state.communityCards = [];
    document.querySelectorAll('#communityCards .community-card').forEach(c => { 
      c.classList.add('back'); 
      c.style.backgroundImage = `url(assets/cards/back.png)`;
    });
    
    state.pot = 0;
    document.getElementById('potAmount').textContent = state.pot;
  }

  function shuffleDeck() {
    const suits = ['hearts','diamonds','clubs','spades'];
    const ranks = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
    state.deck = [];
    
    suits.forEach(s => ranks.forEach(r => 
      state.deck.push({suit: s, rank: r})
    ));
    
    for (let i = state.deck.length-1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
  }

  function postBlinds() {
    state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
    const sbIdx = (state.dealerIndex + 1) % state.players.length;
    const bbIdx = (state.dealerIndex + 2) % state.players.length;
    
    const sb = state.players[sbIdx];
    const bb = state.players[bbIdx];
    
    applyActionInternal(sb, 'raise', Blinds.small);
    applyActionInternal(bb, 'raise', Blinds.big);
  }

  function dealHoleCards() {
    state.players.forEach(p => {
      const card1 = state.deck.pop();
      const card2 = state.deck.pop();
      p.hand = [card1, card2];
      
      if (!p.isBot) {
        showCard(p.el.querySelector('.player-cards .card:nth-child(1)'), card1);
        showCard(p.el.querySelector('.player-cards .card:nth-child(2)'), card2);
      }
    });
    
    playSound('card');
  }

  async function runBettingRound() {
    const startIdx = state.currentPlayerIdx;
    let currentIdx = startIdx;
    let roundCompleted = false;
    
    while (!roundCompleted) {
      const player = state.players[currentIdx];
      
      if (!player.folded) {
        player.el.classList.add('active');
        
        if (player.isBot) {
          await botAction(player);
        } else {
          await playerAction(player);
        }
        
        player.el.classList.remove('active');
        
        roundCompleted = isBettingClosed();
      }
      
      currentIdx = (currentIdx + 1) % state.players.length;
      
      if (currentIdx === startIdx && roundCompleted) {
        break;
      }
    }
    
    nextPhase();
  }

  function isBettingClosed() {
    const activePlayers = state.players.filter(p => !p.folded);
    
    if (activePlayers.length <= 1) return true;
    
    return activePlayers.every(player => {
      const hasActed = currentRoundBets[player.name] !== undefined;
      const hasCalled = player.invested >= state.currentBet;
      return hasActed && (hasCalled || player.folded);
    });
  }

  function nextPhase() {
    currentRoundBets = {};
    state.players.forEach(p => currentRoundBets[p.name] = undefined);
    
    if (state.phase === 'preflop') {
      dealCommunity(3);
      state.phase = 'flop';
      state.currentBet = 0;
    } else if (state.phase === 'flop') {
      dealCommunity(1);
      state.phase = 'turn';
    } else if (state.phase === 'turn') {
      dealCommunity(1);
      state.phase = 'river';
    } else {
      showdown();
      return;
    }
    
    state.currentPlayerIdx = (state.dealerIndex + 1) % state.players.length;
    
    renderTable();
    setTimeout(() => runBettingRound(), 1000);
  }

  function dealCommunity(count) {
    for (let i = 0; i < count; i++) {
      const card = state.deck.pop();
      state.communityCards.push(card);
      const el = document.getElementById(`communityCard${state.communityCards.length}`);
      showCard(el, card);
    }
    
    playSound('card');
    
    const phaseNames = {
      flop: 'Флоп',
      turn: 'Тёрн',
      river: 'Ривер'
    };
    
    if (state.phase !== 'preflop') {
      showNotification(`${phaseNames[state.phase]}! Открыто ${state.communityCards.length} карт`);
    }
  }

  function showdown() {
    const contenders = state.players.filter(p => !p.folded);
    
    if (contenders.length === 0) {
      showNotification("Никто не остался в игре! Банк возвращен");
      return;
    }
    
    const winner = contenders[Math.floor(Math.random() * contenders.length)];
    winner.chips += state.pot;
    
    renderTable();
    playSound('win');
    showNotification(`${winner.name} выигрывает ${state.pot}🪙!`, 'win');
    
    setTimeout(() => startHand(), 3000);
  }

  function playerAction(player) {
    return new Promise(resolve => {
      document.querySelector('.action-panel').style.display = 'flex';
      
      const toCall = state.currentBet - player.invested;
      document.getElementById('callAmount').textContent = toCall;
      
      const finish = (action, amt) => {
        playSound(action === 'fold' ? 'card' : 'chip');
        applyActionInternal(player, action, amt);
        document.querySelector('.action-panel').style.display = 'none';
        resolve();
      };
      
      document.querySelector('.fold').onclick = () => finish('fold', 0);
      document.querySelector('.check').onclick = () => finish('check', 0);
      document.querySelector('.call').onclick = () => finish('call', toCall);
      document.querySelector('.raise').onclick = () => 
        finish('raise', parseInt(document.getElementById('raiseAmount').textContent));
    });
  }

  async function botAction(player) {
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
    
    const toCall = state.currentBet - player.invested;
    const canCheck = toCall === 0;
    const options = [];
    
    if (canCheck) options.push('check');
    if (toCall > 0 && toCall <= player.chips) options.push('call');
    if (player.chips > toCall + MinRaise) options.push('raise');
    options.push('fold');
    
    const action = options[Math.floor(Math.random() * options.length)];
    let amount = 0;
    
    if (action === 'call') {
      amount = toCall;
    } else if (action === 'raise') {
      amount = toCall + MinRaise + Math.floor(Math.random() * 50);
    }
    
    applyActionInternal(player, action, amount);
  }

  function applyActionInternal(player, action, amount) {
    let actualAmount = 0;
    
    currentRoundBets[player.name] = 0;
    
    if (action === 'fold') {
      player.folded = true;
    } 
    else if (action === 'call' || action === 'raise') {
      actualAmount = Math.min(amount, player.chips);
      
      player.chips -= actualAmount;
      player.invested += actualAmount;
      state.pot += actualAmount;
      
      currentRoundBets[player.name] = actualAmount;
      
      createChipAnimation(player.el, actualAmount);
    }
    
    if (action === 'raise') {
      state.currentBet = player.invested;
    }
    
    const actionText = {
      fold: 'сбросил карты',
      call: `уравнял ${actualAmount}`,
      raise: `повысил на ${actualAmount}`,
      check: 'проверил'
    }[action];
    
    showNotification(`${player.name} ${actionText}`);
    
    renderTable();
  }

  function renderTable() {
    state.players.forEach(p => {
      p.el.querySelector('.player-chips').textContent = p.chips;
      p.el.querySelector('.player-bet').textContent = p.invested;
      
      if (p.folded) {
        p.el.classList.add('folded');
      } else {
        p.el.classList.remove('folded');
      }
    });
    
    document.getElementById('potAmount').textContent = state.pot;
  }

  function createChipAnimation(fromEl, amount) {
    const chipCount = Math.min(Math.ceil(amount / 50), 10);
    
    for (let i = 0; i < chipCount; i++) {
      const chip = document.createElement('div'); 
      chip.className = 'chip-animation';
      
      const colors = ['red', 'blue', 'green', 'black', 'white'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      chip.style.background = `url(assets/chips/${color}.png) center/cover`;
      
      const fromRect = fromEl.getBoundingClientRect(); 
      const tableRect = document.querySelector('.poker-table').getBoundingClientRect();
      
      const startX = fromRect.left + fromRect.width / 2 - 15;
      const startY = fromRect.top - 15;
      
      const endX = tableRect.left + tableRect.width / 2 - 15 + (Math.random() - 0.5) * 80;
      const endY = tableRect.top + tableRect.height / 2 - 15 + (Math.random() - 0.5) * 80;
      
      chip.style.setProperty('--start-x', `${startX}px`);
      chip.style.setProperty('--start-y', `${startY}px`);
      chip.style.setProperty('--end-x', `${endX}px`);
      chip.style.setProperty('--end-y', `${endY}px`);
      
      chip.style.left = `${startX}px`;
      chip.style.top = `${startY}px`;
      
      document.body.appendChild(chip);
      
      setTimeout(() => {
        if (chip.parentNode) chip.parentNode.removeChild(chip);
      }, 1000);
    }
  }

  function showCard(el, card) {
    if (!el) return;
    
    el.classList.remove('back'); 
    el.style.backgroundImage = `url(assets/cards/${card.suit}/${card.rank}.png)`;
    el.classList.add('dealing'); 
    
    playSound('card'); 
    
    setTimeout(() => {
      el.classList.remove('dealing');
    }, 500);
  }

  function playSound(type) { 
    try { 
      if (sounds[type]) {
        sounds[type].currentTime = 0; 
        sounds[type].play().catch(e => console.error("Ошибка воспроизведения звука:", e));
      }
    } catch (e) {
      console.error("Ошибка работы со звуком:", e);
    }
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-icon">${type === 'info' ? 'ℹ️' : '✅'}</div>
      <div class="notification-text">${message}</div>
    `;
    
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}); 