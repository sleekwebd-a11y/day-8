// ─── State ────────────────────────────────────────────────
let bankroll = parseInt(localStorage.getItem('velvet_bankroll')) || 2500;
let currentBet = 0;
let perfectPairBet = 0;
let twentyOnePlusThreeBet = 0;
let betTarget = 'main';

let deck = [];
let dealerHand = [];
let hands = [];          // array of {cards, bet} — supports split
let activeHandIdx = 0;
let gamePhase = 'bet';   // 'bet' | 'playing' | 'dealer' | 'ended'
let isFirstAction = true;

const suits  = ['♥','♦','♣','♠'];
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

function renderHand(id, cards, hideSecond = false) {
  const container = document.getElementById(id);
  container.innerHTML = '';
  cards.forEach((card, i) => {
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
  const newEl = makeCardEl(dealerHand[1]);
  newEl.classList.add('card-flip');
  container.replaceChild(newEl, hiddenEl);
}

function updateTotals(revealDealer = false) {
  const active = hands[activeHandIdx];
  if (active) {
    document.getElementById('player-total').textContent = cardValue(active.cards);
  }
  if (revealDealer) {
    document.getElementById('dealer-total').textContent = cardValue(dealerHand);
  } else {
    document.getElementById('dealer-total').textContent =
      dealerHand.length > 0 ? `${dealerHand[0].num} + ?` : '';
  }
}

// ─── Split UI — render both hands with active highlight ───
function renderSplitHands() {
  const container = document.getElementById('player-hand');
  container.innerHTML = '';
  container.style.flexDirection = 'column';
  container.style.gap = '10px';

  hands.forEach((h, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'split-hand-wrapper' + (idx === activeHandIdx ? ' split-active' : '');
    wrapper.id = `split-wrapper-${idx}`;

    const label = document.createElement('div');
    label.className = 'split-label';
    label.textContent = `Hand ${idx + 1}  •  $${h.bet}  •  ${cardValue(h.cards)}`;
    wrapper.appendChild(label);

    const cardRow = document.createElement('div');
    cardRow.className = 'flex gap-2 justify-center';
    h.cards.forEach(card => {
      const el = makeCardEl(card);
      el.classList.add('card-deal');
      cardRow.appendChild(el);
    });
    wrapper.appendChild(cardRow);
    container.appendChild(wrapper);
  });
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
  const spent = currentBet + perfectPairBet + twentyOnePlusThreeBet;
  amount = Math.min(amount, bankroll - spent);
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

// ─── Bankroll ─────────────────────────────────────────────
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
  hands = [{ cards: [deck.pop(), deck.pop()], bet: currentBet }];
  activeHandIdx = 0;
  gamePhase = 'playing';
  isFirstAction = true;

  document.getElementById('deal-btn').disabled = true;
  document.getElementById('player-hand').style.flexDirection = '';
  document.getElementById('player-hand').style.gap = '';
  document.getElementById('action-phase').classList.remove('hidden');

  renderHand('dealer-hand', dealerHand, true);
  renderHand('player-hand', hands[0].cards);
  updateTotals(false);
  updateActionButtons();

  // Natural blackjack check
  if (cardValue(hands[0].cards) === 21) {
    setTimeout(() => endHand('blackjack'), 600);
  }
}

// ─── Player Actions ───────────────────────────────────────
function hit() {
  if (gamePhase !== 'playing') return;
  isFirstAction = false;
  const h = hands[activeHandIdx];
  h.cards.push(deck.pop());

  if (hands.length > 1) {
    renderSplitHands();
  } else {
    addCardAnimated('player-hand', h.cards[h.cards.length - 1]);
  }

  updateTotals(false);
  updateActionButtons();

  if (cardValue(h.cards) > 21) {
    setTimeout(() => bustCurrentHand(), 400);
  } else if (cardValue(h.cards) === 21) {
    setTimeout(() => advanceOrDealer(), 400);
  }
}

async function stand() {
  if (gamePhase !== 'playing') return;
  await advanceOrDealer();
}

async function advanceOrDealer() {
  // Move to next split hand, or start dealer turn
  if (activeHandIdx < hands.length - 1) {
    activeHandIdx++;
    isFirstAction = true;
    renderSplitHands();
    updateTotals(false);
    updateActionButtons();
  } else {
    await dealerTurn();
  }
}

function bustCurrentHand() {
  if (hands.length > 1) {
    renderSplitHands();
    if (activeHandIdx < hands.length - 1) {
      activeHandIdx++;
      isFirstAction = true;
      renderSplitHands();
      updateTotals(false);
      updateActionButtons();
      return;
    }
  }
  // All hands done — go to dealer
  dealerTurn();
}

async function dealerTurn() {
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
  if (!isFirstAction || gamePhase !== 'playing') return;
  const h = hands[activeHandIdx];
  if (bankroll < h.bet) return;

  bankroll -= h.bet;
  h.bet *= 2;
  document.getElementById('main-bet-display').textContent = '$' + h.bet;
  updateBankrollDisplay();
  isFirstAction = false;

  h.cards.push(deck.pop());

  if (hands.length > 1) {
    renderSplitHands();
  } else {
    addCardAnimated('player-hand', h.cards[h.cards.length - 1]);
  }

  updateTotals(false);

  if (cardValue(h.cards) > 21) {
    setTimeout(() => bustCurrentHand(), 400);
  } else {
    setTimeout(() => advanceOrDealer(), 500);
  }
}

function splitHand() {
  if (!isFirstAction || gamePhase !== 'playing') return;
  const h = hands[activeHandIdx];
  if (h.cards.length !== 2 || h.cards[0].num !== h.cards[1].num) return;
  if (bankroll < h.bet) return;

  // Deduct extra bet for the new hand
  bankroll -= h.bet;
  updateBankrollDisplay();

  // Split into two hands, each gets one original card + one new card
  const card1 = h.cards[0];
  const card2 = h.cards[1];
  hands.splice(activeHandIdx, 1,
    { cards: [card1, deck.pop()], bet: h.bet },
    { cards: [card2, deck.pop()], bet: h.bet }
  );

  isFirstAction = true;
  document.getElementById('player-hand').style.flexDirection = 'column';
  renderSplitHands();
  updateTotals(false);
  updateActionButtons();
}

function updateActionButtons() {
  if (gamePhase !== 'playing') return;
  const h = hands[activeHandIdx];
  const canDouble = isFirstAction && bankroll >= h.bet;
  const canSplit  = isFirstAction && h.cards.length === 2 &&
                    h.cards[0].num === h.cards[1].num && bankroll >= h.bet;

  document.getElementById('btn-double').style.opacity = canDouble ? '1' : '0.3';
  document.getElementById('btn-split').style.opacity  = canSplit  ? '1' : '0.3';
}

// ─── Side Bet Evaluation ──────────────────────────────────
// Returns TOTAL return (stake + winnings), 0 if lost
function evalPerfectPairs() {
  if (perfectPairBet === 0) return 0;
  const [a, b] = hands[0].cards; // evaluated on original first two cards
  if (a.val !== b.val) return 0;
  const isRed = s => ['♥','♦'].includes(s);
  if (a.suit === b.suit)                        return perfectPairBet * 26; // Perfect pair
  if (isRed(a.suit) === isRed(b.suit))          return perfectPairBet * 13; // Coloured pair
  return perfectPairBet * 6;                                                 // Mixed pair
}

function eval21plus3() {
  if (twentyOnePlusThreeBet === 0) return 0;
  const [p1, p2] = hands[0].cards;
  const d = dealerHand[0]; // dealer up-card only
  const threeCards = [p1, p2, d];
  const suitSet = new Set(threeCards.map(c => c.suit));
  const sameSuit = suitSet.size === 1;

  // Build rank indices for straight detection
  const rankOrder = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const indices = threeCards.map(c => rankOrder.indexOf(c.val)).sort((a, b) => a - b);
  const straight = (indices[2] - indices[0] === 2 && indices[1] - indices[0] === 1) ||
                   // Ace-high wrap: Q K A
                   (indices.join(',') === '0,11,12');
  const threeKind = p1.val === p2.val && p2.val === d.val;

  // Payouts return stake + winnings
  if (sameSuit && straight && threeKind)  return twentyOnePlusThreeBet * 101; // Suited trips
  if (sameSuit && threeKind)              return twentyOnePlusThreeBet * 31;
  if (sameSuit && straight)               return twentyOnePlusThreeBet * 20;
  if (threeKind)                          return twentyOnePlusThreeBet * 31;
  if (straight)                           return twentyOnePlusThreeBet * 10;
  if (sameSuit)                           return twentyOnePlusThreeBet * 6;
  return 0; // lose — no return
}

// ─── End Hand ─────────────────────────────────────────────
function endHand(reason) {
  gamePhase = 'ended';
  document.getElementById('action-phase').classList.add('hidden');

  const dealerTotal = cardValue(dealerHand);

  // Reveal all cards
  renderHand('dealer-hand', dealerHand, false);
  if (hands.length > 1) renderSplitHands();
  updateTotals(true);

  // Calculate main bet return across all hands
  let mainReturn = 0;
  let anyWin = false, anyLoss = false, allPush = true;

  hands.forEach(h => {
    const pt = cardValue(h.cards);
    if (reason === 'blackjack') {
      mainReturn += Math.floor(h.bet * 2.5);
      anyWin = true; allPush = false;
    } else if (pt > 21) {
      // bust — lose bet, return 0
      anyLoss = true; allPush = false;
    } else if (dealerTotal > 21 || pt > dealerTotal) {
      mainReturn += h.bet * 2;
      anyWin = true; allPush = false;
    } else if (pt === dealerTotal) {
      mainReturn += h.bet; // push — return stake
    } else {
      anyLoss = true; allPush = false;
    }
  });

  // Side bets — evaluated now that dealerHand is fully known
  const ppReturn   = evalPerfectPairs();
  const p3Return   = eval21plus3();
  const sideReturn = ppReturn + p3Return;
  const sidePaid   = perfectPairBet + twentyOnePlusThreeBet;

  const totalReturn = mainReturn + sideReturn;
  const totalPaid   = hands.reduce((s, h) => s + h.bet, 0) + sidePaid;
  const net         = totalReturn - totalPaid;

  bankroll += totalReturn;
  updateBankrollDisplay();
  localStorage.setItem('velvet_bankroll', bankroll);

  // ── Build result display ──
  let label, amountText, colorClass;

  if (reason === 'blackjack') {
    label = '🃏 BLACKJACK!';
    amountText = `+$${net}`;
    colorClass = 'text-emerald-400';
  } else if (allPush) {
    label = 'PUSH';
    amountText = 'Bet returned';
    colorClass = 'text-yellow-400';
  } else if (net > 0) {
    label = anyLoss ? 'PARTIAL WIN' : 'YOU WIN!';
    amountText = `+$${net}`;
    colorClass = 'text-emerald-400';
  } else if (net === 0) {
    label = 'BREAK EVEN';
    amountText = '$0';
    colorClass = 'text-yellow-400';
  } else {
    label = 'DEALER WINS';
    amountText = `-$${Math.abs(net)}`;
    colorClass = 'text-rose-400';
  }

  // Side bet bonus line
  let bonusLine = '';
  if (ppReturn > 0)  bonusLine += `🃏 Perfect Pairs +$${ppReturn - perfectPairBet}  `;
  if (p3Return > 0)  bonusLine += `🎰 21+3 +$${p3Return - twentyOnePlusThreeBet}`;

  document.getElementById('result-label').textContent  = label;
  document.getElementById('result-text').textContent   = amountText;
  document.getElementById('result-text').className     = `text-6xl font-bold mb-2 ${colorClass}`;
  document.getElementById('result-amount').innerHTML   = bonusLine
    ? `<span class="text-emerald-300">${bonusLine.trim()}</span>`
    : `Balance: $${bankroll}`;
  document.getElementById('result-amount').className   = 'text-lg font-medium mb-8 text-center';

  document.getElementById('result-overlay').classList.remove('hidden');
}

// ─── New Hand ─────────────────────────────────────────────
function newHand() {
  document.getElementById('result-overlay').classList.add('hidden');
  document.getElementById('action-phase').classList.add('hidden');
  currentBet = perfectPairBet = twentyOnePlusThreeBet = 0;
  hands = []; activeHandIdx = 0;
  document.getElementById('main-bet-display').textContent = '$0';
  document.getElementById('perfect-bet').textContent = '$0';
  document.getElementById('21plus3-bet').textContent = '$0';
  document.getElementById('dealer-hand').innerHTML = '';
  const ph = document.getElementById('player-hand');
  ph.innerHTML = '';
  ph.style.flexDirection = '';
  ph.style.gap = '';
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
