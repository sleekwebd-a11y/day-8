// app.js
let bankroll = 2500;
let currentBet = 0;
let sideBetAmount = 25;
let deck = [];
let dealerHand = [];
let playerHand = [];
let gamePhase = 'bet'; // bet, playing, ended

const suits = ['♥','♦','♣','♠'];
const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function createDeck() {
  deck = [];
  for (let i = 0; i < 6; i++) { // 6-deck shoe
    for (let suit of suits) {
      for (let val of values) {
        deck.push({val, suit, num: isNaN(parseInt(val)) ? (val==='A'?11:10) : parseInt(val)});
      }
    }
  }
  shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function cardValue(hand) {
  let total = 0;
  let aces = 0;
  for (let card of hand) {
    total += card.num;
    if (card.val === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function renderHand(handId, hand, isDealer = false) {
  const container = document.getElementById(handId);
  container.innerHTML = '';
  hand.forEach((card, i) => {
    const div = document.createElement('div');
    div.className = `card ${card.suit==='♥'||card.suit==='♦' ? 'red' : 'black'}`;
    div.innerHTML = `
      <div>${card.val}</div>
      <div class="text-4xl text-center mt-2">${card.suit}</div>
    `;
    div.setAttribute('data-suit', card.suit);
    if (isDealer && i === 1 && gamePhase === 'playing') {
      div.style.transform = 'rotateY(180deg)';
      div.innerHTML = `<div class="w-full h-full bg-zinc-900 rounded-[9px]"></div>`;
    }
    container.appendChild(div);
  });
}

function updateTotals() {
  document.getElementById('dealer-total').textContent = gamePhase === 'playing' ? '?' : cardValue(dealerHand);
  document.getElementById('player-total').textContent = cardValue(playerHand);
}

function setBet(amount) {
  if (amount === 999999) amount = bankroll;
  if (amount > bankroll) amount = bankroll;
  currentBet = amount;
  document.getElementById('current-bet').textContent = '$' + currentBet;
  document.getElementById('deal-btn').disabled = currentBet < 5;
}

function dealHand() {
  if (currentBet < 5) return;

  bankroll -= currentBet;
  updateBankroll();

  createDeck();
  dealerHand = [deck.pop(), deck.pop()];
  playerHand = [deck.pop(), deck.pop()];

  gamePhase = 'playing';
  document.getElementById('bet-phase').classList.add('hidden');
  document.getElementById('action-phase').classList.remove('hidden');

  renderHand('dealer-hand', dealerHand, true);
  renderHand('player-hand', playerHand);
  updateTotals();

  // Check for blackjack
  if (cardValue(playerHand) === 21) {
    endHand('blackjack');
  }
}

function hit() {
  playerHand.push(deck.pop());
  renderHand('player-hand', playerHand);
  updateTotals();

  if (cardValue(playerHand) > 21) {
    endHand('bust');
  }
}

function stand() {
  // Dealer plays
  while (cardValue(dealerHand) < 17) {
    dealerHand.push(deck.pop());
  }
  renderHand('dealer-hand', dealerHand);
  updateTotals();
  endHand('normal');
}

function doubleDown() {
  if (bankroll < currentBet) return;
  bankroll -= currentBet;
  currentBet *= 2;
  updateBankroll();
  document.getElementById('current-bet').textContent = '$' + currentBet;

  playerHand.push(deck.pop());
  renderHand('player-hand', playerHand);
  updateTotals();
  stand();
}

function splitHand() {
  // Simplified: only allow if first two cards same value (basic version)
  alert("Split coming in Day 9 update 🔥");
}

function endHand(reason) {
  gamePhase = 'ended';
  document.getElementById('action-phase').classList.add('hidden');

  const playerTotal = cardValue(playerHand);
  const dealerTotal = cardValue(dealerHand);

  let payout = 0;
  let message = '';

  if (reason === 'blackjack') {
    payout = currentBet * 2.5;
    message = 'BLACKJACK! +2.5x';
  } else if (reason === 'bust') {
    message = 'BUST';
  } else if (playerTotal > 21) {
    message = 'BUST';
  } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
    payout = currentBet * 2;
    message = 'YOU WIN!';
  } else if (playerTotal === dealerTotal) {
    payout = currentBet;
    message = 'PUSH';
  } else {
    message = 'DEALER WINS';
  }

  bankroll += payout;
  updateBankroll();

  document.getElementById('result-text').innerHTML = `
    <span class="text-6xl block mb-2">${message}</span>
    <span class="text-3xl text-emerald-400">+$${payout - currentBet}</span>
  `;
  document.getElementById('result-overlay').classList.remove('hidden');
}

function newHand() {
  document.getElementById('result-overlay').classList.add('hidden');
  document.getElementById('bet-phase').classList.remove('hidden');
  document.getElementById('action-phase').classList.add('hidden');
  currentBet = 0;
  document.getElementById('current-bet').textContent = '$0';
  document.getElementById('dealer-hand').innerHTML = '';
  document.getElementById('player-hand').innerHTML = '';
  gamePhase = 'bet';
}

function updateBankroll() {
  document.getElementById('bankroll-display').textContent = '$' + Math.floor(bankroll);
}

function resetBankroll() {
  if (confirm('Reset bankroll to $2,500?')) {
    bankroll = 2500;
    updateBankroll();
  }
}

// Init
function initGame() {
  updateBankroll();
  document.getElementById('deal-btn').disabled = true;
  createDeck();
  console.log('%cVelvet 21 loaded – Day 8 complete 🎰', 'color:#10b981; font-weight:bold');
}

window.onload = initGame;
