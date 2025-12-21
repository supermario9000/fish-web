// Get the query parameter from the URL
const params = new URLSearchParams(window.location.search);
const level = params.get('level') || 'easy'; // Default to 'easy' if no parameter

// Hide all level containers
document.querySelectorAll('.level-container').forEach(div => {
    div.classList.add('hidden');
});

// Show the selected level
const selectedLevel = document.getElementById(`level-${level}`);
if (selectedLevel) {
    selectedLevel.classList.remove('hidden');
}

// Card counts and layout per level
const levelConfig = {
    easy: { count: 8, cols: 4, rows: 2 },
    medium: { count: 12, cols: 4, rows: 3 },
    hard: { count: 16, cols: 4, rows: 4 }
};

let timerInterval = null;
let timerStart = null;
let mistakes = 0;
let score = 0;
let matchedCount = 0;
let finalTime = 0;

function updateTimerDisplay(elapsedMs) {
    const el = document.getElementById('timer-value');
    if (el) el.textContent = (elapsedMs / 1000).toFixed(3);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerStart = performance.now();
    updateTimerDisplay(0);
    // Update roughly every 10ms to show thousandths
    timerInterval = setInterval(() => {
        const now = performance.now();
        const elapsedMs = now - timerStart;
        updateTimerDisplay(elapsedMs);
    }, 1);
}

function updateStats() {
    const mistakesEl = document.getElementById('mistake-count');
    const scoreEl = document.getElementById('score-value');
    if (mistakesEl) mistakesEl.textContent = mistakes;
    if (scoreEl) scoreEl.textContent = score;
}

// Build deck of symbol pairs for the selected level
function buildDeck(count) {
    const totalSymbols = 16;
    const symbols = Array.from({ length: totalSymbols }, (_, i) => i + 1);
    const neededPairs = Math.floor(count / 2);
    // pick random unique symbols for pairs
    const chosen = symbols.sort(() => Math.random() - 0.5).slice(0, neededPairs);
    const deck = chosen.flatMap(s => [s, s]);
    // shuffle deck
    return deck.sort(() => Math.random() - 0.5);
}

// Render cards into the selected container
let openCards = [];
let lockBoard = false;

function renderCards(container, deck) {
    container.innerHTML = '';
    deck.forEach(symbolId => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.symbol = String(symbolId);

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        const front = document.createElement('div');
        front.className = 'card-face front';

        const back = document.createElement('div');
        back.className = 'card-face back';

        const sym = document.createElement('img');
        sym.className = 'symbol-img';
        sym.alt = `symbol ${symbolId}`;
        sym.src = `assets/Simple pngs/symbols for guessing/simbolis_${symbolId}.png`;
        back.appendChild(sym);

        inner.appendChild(front);
        inner.appendChild(back);
        cardEl.appendChild(inner);

        cardEl.addEventListener('click', () => onCardClick(cardEl));

        container.appendChild(cardEl);
    });
}

function onCardClick(cardEl) {
    if (lockBoard) return;
    if (cardEl.classList.contains('flipped')) return;
    if (!cardEl.isConnected) return;

    cardEl.classList.add('flipped');
    openCards.push(cardEl);

    if (openCards.length === 2) {
        lockBoard = true;
        const [c1, c2] = openCards;
        const match = c1.dataset.symbol === c2.dataset.symbol;
        if (match) {
            setTimeout(() => {
                // hide matched cards, keep them in grid to preserve layout
                c1.classList.add('matched');
                c2.classList.add('matched');
                score += 1;
                matchedCount += 2;
                updateStats();
                openCards = [];
                lockBoard = false;
                
                // Check if game is won
                const cfg = levelConfig[level];
                if (matchedCount === cfg.count) {
                    stopTimer();
                    const elapsed = Math.floor((performance.now() - timerStart) / 1000 * 1000) / 1000;
                    finalTime = elapsed;
                    showCompletionModal(elapsed, score, mistakes);
                }
            }, 400);
        } else {
            setTimeout(() => {
                c1.classList.remove('flipped');
                c2.classList.remove('flipped');
                mistakes += 1;
                updateStats();
                openCards = [];
                lockBoard = false;
            }, 800);
        }
    }
}

// Start / restart helpers
function startGame() {
    if (!selectedLevel) return;
    mistakes = 0;
    score = 0;
    matchedCount = 0;
    updateStats();
    startTimer();
    const cfg = levelConfig[level] || levelConfig.easy;
    const deck = buildDeck(cfg.count);
    renderCards(selectedLevel, deck);
    sizeCardsToContainer(selectedLevel, cfg);
    // Resize handling to keep cards contained on viewport changes
    window.addEventListener('resize', () => sizeCardsToContainer(selectedLevel, cfg), { passive: true });
}

function restart() {
    startGame();
}

// Modal and Scoreboard functions
function showCompletionModal(time, pts, errs) {
    document.getElementById('modal-time').textContent = time.toFixed(3);
    document.getElementById('modal-score').textContent = pts;
    document.getElementById('modal-mistakes').textContent = errs;
    document.getElementById('completion-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('completion-modal').classList.add('hidden');
    document.getElementById('scoreboard-form').reset();
}

function playAgain() {
    document.getElementById('scoreboard-modal').classList.add('hidden');
    startGame();
}

function saveToScoreboard(username, time, pts, errs) {
    const entry = {
        username,
        level,
        time,
        score: pts,
        mistakes: errs
    };
    
    // Save to backend via PHP
    fetch('save-score.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success || data.entries) {
                showScoreboard(data.entries, username, time);
                closeCompletionModal();
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(err => {
            console.error('Error saving score:', err);
            alert('Error saving score. Make sure PHP is enabled on your server.');
            closeModal();
        });
}

function closeCompletionModal() {
    document.getElementById('completion-modal').classList.add('hidden');
}

function showScoreboard(entries, currentUsername, currentTime) {
    const levelNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    document.getElementById('scoreboard-level').textContent = levelNames[level] || 'Unknown';
    
    const tbody = document.getElementById('scoreboard-body');
    tbody.innerHTML = '';
    
    // Get top 10 entries
    const top10 = entries.slice(0, 10);
    let userRank = -1;
    
    // Check if current user is in top 10
    top10.forEach((entry, index) => {
        if (entry.username === currentUsername && entry.time === currentTime) {
            userRank = index + 1;
        }
    });
    
    // Display top 10
    top10.forEach((entry, index) => {
        const row = document.createElement('tr');
        if (entry.username === currentUsername && entry.time === currentTime) {
            row.classList.add('user-row');
        }
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.username}</td>
            <td>${entry.time.toFixed(3)}</td>
            <td>${entry.score}</td>
            <td>${entry.mistakes}</td>
        `;
        tbody.appendChild(row);
    });
    
    // If user is not in top 10, show them at position 11+
    if (userRank === -1 && entries.length > 10) {
        const userIndex = entries.findIndex(e => e.username === currentUsername && e.time === currentTime);
        if (userIndex !== -1) {
            const row = document.createElement('tr');
            row.classList.add('user-row');
            row.innerHTML = `
                <td>${userIndex + 1}</td>
                <td>${currentUsername}</td>
                <td>${currentTime.toFixed(3)}</td>
                <td>${score}</td>
                <td>${mistakes}</td>
            `;
            tbody.appendChild(row);
        }
    }
    
    document.getElementById('scoreboard-modal').classList.remove('hidden');
}

// Scoreboard form submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('scoreboard-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            if (username.trim()) {
                saveToScoreboard(username, finalTime, score, mistakes);
            }
        });
    }
});

// Compute a card width that fits both container width and height
function sizeCardsToContainer(container, cfg) {
    const styles = getComputedStyle(container);
    const colGap = parseFloat(styles.columnGap) || parseFloat(styles.gap) || 0;
    const rowGap = parseFloat(styles.rowGap) || parseFloat(styles.gap) || colGap;
    const rect = container.getBoundingClientRect();
    const availableW = rect.width - colGap * (cfg.cols - 1);
    const availableH = rect.height - rowGap * (cfg.rows - 1);
    const widthPerCol = availableW / cfg.cols;

    // Read border sizes from a card (assumes uniform border)
    const sampleCard = container.querySelector('.card');
    const cs = sampleCard ? getComputedStyle(sampleCard) : null;
    const bL = cs ? parseFloat(cs.borderLeftWidth) || 0 : 0;
    const bR = cs ? parseFloat(cs.borderRightWidth) || 0 : 0;
    const bT = cs ? parseFloat(cs.borderTopWidth) || 0 : 0;
    const bB = cs ? parseFloat(cs.borderBottomWidth) || 0 : 0;
    const wBorder = bL + bR;
    const hBorder = bT + bB;

    // Derive width from per-row height while considering borders and A4 ratio
    const hPerRow = availableH / cfg.rows;
    const widthFromHeightTotal = wBorder + (Math.max(0, hPerRow - hBorder)) / Math.SQRT2;

    // Final card width (include a small safety margin to avoid rounding overflow)
    const cardW = Math.max(20, Math.floor(Math.min(widthPerCol, widthFromHeightTotal)) - 1);
    container.style.setProperty('--card-w', `${cardW}px`);
}

// Wait for user to press Play (no auto-start)