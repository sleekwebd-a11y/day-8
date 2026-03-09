// ─── State ────────────────────────────────────────────────
let bankroll = parseInt(localStorage.getItem('velvet_bankroll')) || 2500;
let currentBet = 0;
let perfectPairBet = 0;
let twentyOnePlusThreeBet = 0;
let betTarget = 'main';
let deck = [], dealerHand = [], playerHand = [], splitHand2 = [];
let gamePhase = 'bet'; // 'bet' | 'playing' | 'ended'
let isFirstAction = true; // track if double/split are still valid

const suits = ['♥','♦','♣','♠'];
const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

// ─── Deck ─────────────────────────────────────────────────
function createDeck() {
  deck = [];
  for (let i = 0; i < 6; i++)
    for (let s of suits) for (let v of values) {
      const num = v === 'A' ? 11 : (isNaN(parseInt(v)) ? 10 : parseInt(v));
      deck.push({ val: v, suit: s, num });
    }
  deck.sort(() => Math.random() - 0.5);
}

function cardValue(hand) {
  let total = 0, aces = 0;
  hand.forEach(c => { total += c.num; if (c.val === 'A') aces++; });
  while (total > 21 && aces--) total -= 10;
  return total;
}

// ─── Rendering ────────────────────────────────────────────
function makeCardEl(card, hidden = false) {
  const div = document.createElement('div');
  div.className = 'card' + (['♥','♦'].includes(card.suit) ? ' red' : '');
  if (hidden) {
    div.classList.add('card-hidden');
    div.innerHTML = `<div class="card-back-pattern"></div>`;
  } else {
    div.innerHTML = `
      <div class="card-corner top-left">
        <div class="card-rank">${card.val}</div>
        <div class="card-suit-sm">${card.suit}</div>
      </div>
      <div class="card-suit-center">${card.suit}</div>
      <div class="card-corner bottom-right">
        <div class="card-rank">${card.val}</div>
        <div class="card-suit-sm">${card.suit}</div>
      </div>`;
  }
  return div;
}

function renderHand(id, hand, hideSecond = false) {
  const container = document.getElementById(id);
  container.innerHTML = '';
  hand.forEach((card, i) => {
    const el = makeCardEl(card, hideSecond && i === 1);
    el.style.animationDelay = `${i * 0.08}s`;
    el.classList.add('card-deal');
    container.appendChild(el);
  });
}

function addCardAnimated(containerId, card) {
  const container = document.getElementById(containerId);
  const el = makeCardEl(card);
  el.classList.add('card-deal');
  container.appendChild(el);
}

function revealHoleCard() {
  const container = document.getElementById('dealer-hand');
  const hiddenEl = container.children[1];
  if (!hiddenEl) return;
  const card = dealerHand[1];
  const newEl = makeCardEl(card);
  newEl.classList.add('card-flip');
  container.replaceChild(newEl, hiddenEl);
}

function updateTotals(revealDealer = false) {
  const pt = cardValue(playerHand);
  document.getElementById('player-total').textContent = pt;

  if (revealDealer) {
    document.getElementById('dealer-total').textContent = cardValue(dealerHand);
  } else {
    // Only show value of visible card (first card)
    const visibleVal = dealerHand.length > 0 ? dealerHand[0].num : 0;
    document.getElementById('dealer-total').textContent = gamePhase === 'playing' ? `${visibleVal} + ?` : cardValue(dealerHand);
  }
}

// ─── Bet Targeting ────────────────────────────────────────
function selectTarget(target) {
  betTarget = target;
  document.querySelectorAll('.bet-box').forEach(b => b.classList.remove('active'));
  const map = { main: 'main-box', perfect: 'perfect-box', '21plus3': '21plus3-box' };
  document.getElementById(map[target])?.classList.add('active');
}

function placeBet(amount) {
  if (gamePhase !== 'bet') return;
  if (amount === 999999) amount = bankroll;
  amount = Math.min(amount, bankroll - currentBet - perfectPairBet - twentyOnePlusThreeBet);
  if (amount <= 0) return;

  if (betTarget === 'main') {
    currentBet += amount;
    document.getElementById('main-bet-display').textContent = '$' + currentBet;
  } else if (betTarget === 'perfect') {
    perfectPairBet += amount;
    document.getElementById('perfect-bet').textContent = '$' + perfectPairBet;
  } else {
    twentyOnePlusThreeBet += amount;
    document.getElementById('21plus3-bet').textContent = '$' + twentyOnePlusThreeBet;
  }

  document.getElementById('deal-btn').disabled = currentBet < 5;
}

function clearBets() {
  if (gamePhase !== 'bet') return;
  currentBet = perfectPairBet = twentyOnePlusThreeBet = 0;
  document.getElementById('main-bet-display').textContent = '$0';
  document.getElementById('perfect-bet').textContent = '$0';
  document.getElementById('21plus3-bet').textContent = '$0';
  document.getElementById('deal-btn').disabled = true;
}

// ─── Bankroll Modal ───────────────────────────────────────
function showBankrollModal() {
  if (gamePhase !== 'bet') return;
  document.getElementById('modal-bankroll').value = bankroll;
  document.getElementById('bankroll-modal').classList.remove('hidden');
}

function saveBankroll() {
  const val = parseInt(document.getElementById('modal-bankroll').value);
  bankroll = Math.max(100, isNaN(val) ? 2500 : val);
  updateBankrollDisplay();
  document.getElementById('bankroll-modal').classList.add('hidden');
  localStorage.setItem('velvet_bankroll', bankroll);
}

function updateBankrollDisplay() {
  document.getElementById('bankroll-display').textContent = '$' + bankroll;
}

// ─── Deal ─────────────────────────────────────────────────
function dealHand() {
  if (currentBet < 5 || gamePhase !== 'bet') return;

  const totalBet = currentBet + perfectPairBet + twentyOnePlusThreeBet;
  if (bankroll < totalBet) return;
  bankroll -= totalBet;
  updateBankrollDisplay();

  createDeck();
  dealerHand = [deck.pop(), deck.pop()];
  playerHand = [deck.pop(), deck.pop()];
  gamePhase = 'playing';
  isFirstAction = true;

  document.getElementById('deal-btn').disabled = true;
  document.getElementById('action-phase').classList.remove('hidden');

  renderHand('dealer-hand', dealerHand, true);
  renderHand('player-hand', playerHand);
  updateTotals(false);
  updateActionButtons();

  // Check natural blackjack
  if (cardValue(playerHand) === 21) {
    setTimeout(() => endHand('blackjack'), 600);
  }
}

// ─── Player Actions ───────────────────────────────────────
function hit() {
  if (gamePhase !== 'playing') return;
  isFirstAction = false;
  playerHand.push(deck.pop());
  addCardAnimated('player-hand', playerHand[playerHand.length - 1]);
  updateTotals(false);
  updateActionButtons();
  if (cardValue(playerHand) > 21) {
    setTimeout(() => endHand('bust'), 400);
  } else if (cardValue(playerHand) === 21) {
    setTimeout(() => stand(), 500);
  }
}

async function stand() {
  if (gamePhase !== 'playing') return;
  gamePhase = 'dealer';
  document.getElementById('action-phase').classList.add('hidden');

  revealHoleCard();
  await sleep(500);
  updateTotals(true);

  while (cardValue(dealerHand) < 17) {
    await sleep(700);
    dealerHand.push(deck.pop());
    addCardAnimated('dealer-hand', dealerHand[dealerHand.length - 1]);
    updateTotals(true);
  }

  await sleep(400);
  endHand('normal');
}

function doubleDown() {
  if (!isFirstAction || bankroll < currentBet) return;
  bankroll -= currentBet;
  currentBet *= 2;
  document.getElementById('main-bet-display').textContent = '$' + currentBet;
  updateBankrollDisplay();
  isFirstAction = false;

  playerHand.push(deck.pop());
  addCardAnimated('player-hand', playerHand[playerHand.length - 1]);
  updateTotals(false);

  if (cardValue(playerHand) > 21) {
    setTimeout(() => endHand('bust'), 400);
  } else {
    setTimeout(() => stand(), 500);
  }
}

function splitHand() {
  const canSplit = isFirstAction &&
    playerHand.length === 2 &&
    playerHand[0].num === playerHand[1].num &&
    bankroll >= currentBet;

  if (!canSplit) return;
  // Basic split: move second card out, deal one to each
  bankroll -= currentBet;
  updateBankrollDisplay();

  splitHand2 = [playerHand.pop(), deck.pop()];
  playerHand.push(deck.pop());
  isFirstAction = false;

  renderHand('player-hand', playerHand);
  updateTotals(false);
  updateActionButtons();
  // Note: full split flow (two separate hands) is complex; this plays the first hand to completion
}

function updateActionButtons() {
  const canDouble = isFirstAction && bankroll >= currentBet;
  const canSplit = isFirstAction && playerHand.length === 2 && playerHand[0].num === playerHand[1].num && bankroll >= currentBet;

  document.getElementById('btn-double').style.opacity = canDouble ? '1' : '0.3';
  document.getElementById('btn-split').style.opacity  = canSplit  ? '1' : '0.3';
}

// ─── Side Bet Evaluation ──────────────────────────────────
function evalPerfectPairs() {
  if (perfectPairBet === 0) return 0;
  const [a, b] = playerHand;
  if (a.val !== b.val) return 0;
  if (a.suit === b.suit) return perfectPairBet * 26; // Perfect pair
  const isRed = s => ['♥','♦'].includes(s);
  if (isRed(a.suit) === isRed(b.suit)) return perfectPairBet * 13; // Coloured pair
  return perfectPairBet * 6; // Mixed pair
}

function eval21plus3() {
  if (twentyOnePlusThreeBet === 0) return 0;
  const [p1, p2] = playerHand;
  const d = dealerHand[0];
  const vals = [p1.val, p2.val, d.val].sort().join('');
  const suits3 = [p1.suit, p2.suit, d.suit];
  const sameSuit = suits3.every(s => s === suits3[0]);
  const rankOrder = [...'A234567891JQK'];
  const nums = [p1.val, p2.val, d.val].map(v => rankOrder.indexOf(v[0])).sort((a,b)=>a-b);
  const straight = nums[2] - nums[0] === 2 && nums[1] - nums[0] === 1;
  const threeKind = p1.val === p2.val && p2.val === d.val;

  if (sameSuit && straight && threeKind) return twentyOnePlusThreeBet * 101; // Suited triple
  if (sameSuit && threeKind)  return twentyOnePlusThreeBet * 31;
  if (sameSuit && straight)   return twentyOnePlusThreeBet * 20;
  if (straight && threeKind)  return twentyOnePlusThreeBet * 31;
  if (threeKind)              return twentyOnePlusThreeBet * 31;
  if (straight)               return twentyOnePlusThreeBet * 10;
  if (sameSuit)               return twentyOnePlusThreeBet * 6;
  return 0;
}

// ─── End Hand ─────────────────────────────────────────────
function endHand(reason) {
  gamePhase = 'ended';
  document.getElementById('action-phase').classList.add('hidden');

  const playerTotal = cardValue(playerHand);
  const dealerTotal = cardValue(dealerHand);

  let mainPayout = 0;
  let resultLabel = '';
  let resultText = '';

  if (reason === 'blackjack') {
    mainPayout = Math.floor(currentBet * 2.5);
    resultLabel = 'BLACKJACK!';
    resultText = 'win';
  } else if (reason === 'bust') {
    mainPayout = 0;
    resultLabel = 'BUST';
    resultText = 'lose';
  } else if (playerTotal > dealerTotal || dealerTotal > 21) {
    mainPayout = currentBet * 2;
    resultLabel = 'YOU WIN!';
    resultText = 'win';
  } else if (playerTotal === dealerTotal) {
    mainPayout = currentBet; // push — return bet
    resultLabel = 'PUSH';
    resultText = 'push';
  } else {
    mainPayout = 0;
    resultLabel = 'DEALER WINS';
    resultText = 'lose';
  }

  const sidePayout = evalPerfectPairs() + eval21plus3();
  const totalReturn = mainPayout + sidePayout;
  const netResult = totalReturn - currentBet - perfectPairBet - twentyOnePlusThreeBet;

  bankroll += totalReturn;
  updateBankrollDisplay();
  localStorage.setItem('velvet_bankroll', bankroll);

  // Make sure dealer cards are all visible
  renderHand('dealer-hand', dealerHand, false);
  updateTotals(true);

  const amountEl  = document.getElementById('result-amount');
  const labelEl   = document.getElementById('result-label');
  const textEl    = document.getElementById('result-text');

  labelEl.textContent = resultLabel;

  if (resultText === 'win') {
    textEl.textContent = '+$' + (totalReturn - currentBet - perfectPairBet - twentyOnePlusThreeBet);
    textEl.className = 'text-6xl font-bold mb-2 text-emerald-400';
    amountEl.textContent = `Total return: $${totalReturn}`;
    amountEl.className = 'text-xl font-medium mb-8 text-emerald-300';
  } else if (resultText === 'push') {
    textEl.textContent = 'PUSH';
    textEl.className = 'text-6xl font-bold mb-2 text-yellow-400';
    amountEl.textContent = `Bet returned: $${currentBet}`;
    amountEl.className = 'text-xl font-medium mb-8 text-yellow-300';
  } else {
    const lost = currentBet + perfectPairBet + twentyOnePlusThreeBet;
    textEl.textContent = '-$' + lost;
    textEl.className = 'text-6xl font-bold mb-2 text-rose-400';
    amountEl.textContent = sidePayout > 0 ? `Side win: +$${sidePayout}` : `Balance: $${bankroll}`;
    amountEl.className = 'text-xl font-medium mb-8 text-rose-300';
  }

  document.getElementById('result-overlay').classList.remove('hidden');
}

// ─── New Hand ─────────────────────────────────────────────
function newHand() {
  document.getElementById('result-overlay').classList.add('hidden');
  document.getElementById('action-phase').classList.add('hidden');
  currentBet = perfectPairBet = twentyOnePlusThreeBet = 0;
  splitHand2 = [];
  document.getElementById('main-bet-display').textContent = '$0';
  document.getElementById('perfect-bet').textContent = '$0';
  document.getElementById('21plus3-bet').textContent = '$0';
  document.getElementById('dealer-hand').innerHTML = '';
  document.getElementById('player-hand').innerHTML = '';
  document.getElementById('dealer-total').textContent = '';
  document.getElementById('player-total').textContent = '';
  gamePhase = 'bet';
  betTarget = 'main';
  selectTarget('main');
  document.getElementById('deal-btn').disabled = true;
}

// ─── Utils ────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

window.onload = () => {
  updateBankrollDisplay();
  createDeck();
  selectTarget('main');
  console.log('%cVelvet 21 – loaded 🃏', 'color:#10b981;font-weight:bold');
};
