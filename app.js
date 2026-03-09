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
