// app.js
let bankroll = 2500;
let currentBet = 0;
let deck = [];
let dealerHand = [];
let playerHand = [];
let gamePhase = 'bet';

const suits = ['♥','♦','♣','♠'];
const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function createDeck() {
  deck = [];
  for (let i = 0; i < 6; i++) {
    for (let s of suits) for (let v of values) {
      const num = v==='A'?11:(isNaN(parseInt(v))?10:parseInt(v));
      deck.push({val:v,suit:s,num});
    }
  }
  deck.sort(()=>Math.random()-0.5);
}

function cardValue(hand) {
  let total=0, aces=0;
  hand.forEach(c=>{total+=c.num; if(c.val==='A') aces++;});
  while(total>21 && aces--) total-=10;
  return total;
}

function renderHand(id, hand, hidden=false) {
  const container = document.getElementById(id);
  container.innerHTML = '';
  hand.forEach((card,i)=>{
    const div = document.createElement('div');
    div.className = `card ${['♥','♦'].includes(card.suit)?'red':'black'}`;
    div.innerHTML = `<div>${card.val}</div><div class="text-4xl text-center">${card.suit}</div>`;
    if (hidden && i===1) div.innerHTML = `<div class="w-full h-full bg-zinc-900 rounded-xl"></div>`;
    container.appendChild(div);
  });
}

function updateTotals() {
  document.getElementById('dealer-total').textContent = gamePhase==='playing' ? '?' : cardValue(dealerHand);
  document.getElementById('player-total').textContent = cardValue(playerHand);
}

function setBet(amount) {
  if (amount===999999) amount=bankroll;
  currentBet = Math.min(amount, bankroll);
  document.getElementById('current-bet').textContent = '$'+currentBet;
  document.getElementById('deal-btn').disabled = currentBet < 5;
}

function showBankrollModal() {
  document.getElementById('modal-bankroll').value = bankroll;
  document.getElementById('bankroll-modal').classList.remove('hidden');
}

function saveBankroll() {
  bankroll = Math.max(100, parseInt(document.getElementById('modal-bankroll').value)||2500);
  document.getElementById('bankroll-display').textContent = '$'+bankroll;
  document.getElementById('bankroll-modal').classList.add('hidden');
  localStorage.setItem('velvet_bankroll', bankroll);
}

function dealHand() {
  if (currentBet < 5) return;
  bankroll -= currentBet;
  document.getElementById('bankroll-display').textContent = '$'+bankroll;

  createDeck();
  dealerHand = [deck.pop(), deck.pop()];
  playerHand = [deck.pop(), deck.pop()];

  gamePhase = 'playing';
  document.getElementById('bet-phase').classList.add('hidden');
  document.getElementById('action-phase').classList.remove('hidden');

  renderHand('dealer-hand', dealerHand, true);
  renderHand('player-hand', playerHand);
  updateTotals();

  if (cardValue(playerHand) === 21) endHand('blackjack');
}

function hit() {
  playerHand.push(deck.pop());
  renderHand('player-hand', playerHand);
  updateTotals();
  if (cardValue(playerHand) > 21) {
    document.getElementById('player-hand').classList.add('bust-flash');
    setTimeout(()=>endHand('bust'), 600);
  }
}

async function stand() {
  document.getElementById('action-phase').classList.add('hidden');

  // Reveal hole card
  renderHand('dealer-hand', dealerHand);
  updateTotals();

  // Dealer hits one by one with visible delay
  while (cardValue(dealerHand) < 17) {
    await new Promise(r => setTimeout(r, 900)); // 900ms pause so you can watch
    dealerHand.push(deck.pop());
    renderHand('dealer-hand', dealerHand);
    updateTotals();
  }

  // Final result
  setTimeout(()=>endHand('normal'), 600);
}

function doubleDown() {
  if (bankroll < currentBet) return;
  bankroll -= currentBet; currentBet *= 2;
  document.getElementById('bankroll-display').textContent = '$'+bankroll;
  document.getElementById('current-bet').textContent = '$'+currentBet;

  playerHand.push(deck.pop());
  renderHand('player-hand', playerHand);
  updateTotals();
  stand();
}

function splitHand() { alert("Split coming Day 9 🔥"); }

function endHand(reason) {
  gamePhase = 'ended';
  const playerTotal = cardValue(playerHand);
  const dealerTotal = cardValue(dealerHand);

  let payout = 0, message = '';
  if (reason==='blackjack') { payout = currentBet*2.5; message='BLACKJACK!'; }
  else if (reason==='bust' || playerTotal>21) message='BUST';
  else if (dealerTotal>21 || playerTotal>dealerTotal) { payout = currentBet*2; message='YOU WIN!'; }
  else if (playerTotal===dealerTotal) { payout = currentBet; message='PUSH'; }
  else message='DEALER WINS';

  bankroll += payout;
  document.getElementById('bankroll-display').textContent = '$'+Math.floor(bankroll);

  document.getElementById('result-text').innerHTML = `<span class="block text-6xl">${message}</span><span class="text-emerald-400 text-4xl">+$${payout-currentBet}</span>`;
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
  document.getElementById('player-hand').classList.remove('bust-flash');
  gamePhase = 'bet';
}

if (localStorage.getItem('velvet_bankroll')) bankroll = parseInt(localStorage.getItem('velvet_bankroll'));
function init() {
  document.getElementById('bankroll-display').textContent = '$'+bankroll;
  document.getElementById('deal-btn').disabled = true;
  createDeck();
  console.log('%cVelvet 21 v3 – dealer now visibly hits! 🔥', 'color:#10b981; font-weight:bold');
}
window.onload = init;
