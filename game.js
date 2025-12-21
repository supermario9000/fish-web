// Get the query parameter from the URL
const params = new URLSearchParams(window.location.search);
const level = params.get('level') || 'easy'; // Default to 'easy' if no parameter

// Initialize selectedLevel globally
let selectedLevel = document.getElementById(`level-${level}`);

// Check for username in sessionStorage, show entry modal if not present
let storedUsername = sessionStorage.getItem('playerUsername');
if (!storedUsername) {
    document.getElementById('username-entry-modal').classList.remove('hidden');
    document.querySelectorAll('.level-container').forEach(div => div.classList.add('hidden'));
} else {
    document.getElementById('username-entry-modal').classList.add('hidden');
    // Hide all level containers
    document.querySelectorAll('.level-container').forEach(div => {
        div.classList.add('hidden');
    });
    // Show the selected level
    if (selectedLevel) {
        selectedLevel.classList.remove('hidden');
    }
}

// Global variable to store existing usernames for validation
let existingUsernames = new Set();

// Fetch all existing usernames from leaderboards
async function loadExistingUsernames() {
    try {
        const levels = ['easy', 'medium', 'hard'];
        for (const lvl of levels) {
            const response = await fetch('save-score.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level: lvl, action: 'get_all' })
            });
            const data = await response.json();
            if (data.entries && Array.isArray(data.entries)) {
                data.entries.forEach(entry => {
                    existingUsernames.add(entry.username.toLowerCase());
                });
            }
        }
    } catch (err) {
        console.error('Error loading usernames:', err);
    }
}

// Handle username entry modal
document.addEventListener('DOMContentLoaded', () => {
    // Load existing usernames first
    loadExistingUsernames();
    
    const usernameInput = document.getElementById('username-entry-input');
    const usernameForm = document.getElementById('username-entry-form');
    const errorDiv = document.getElementById('username-entry-error');
    const submitBtn = document.getElementById('username-entry-button');
    
    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            validateUsernameEntry();
        });
    }
    
    if (usernameForm) {
        usernameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const hasError = validateUsernameEntry();
            if (!hasError && username.length >= 4) {
                // Store in sessionStorage
                sessionStorage.setItem('playerUsername', username);
                // Hide modal and show level
                document.getElementById('username-entry-modal').classList.add('hidden');
                const selectedLevel = document.getElementById(`level-${level}`);
                if (selectedLevel) {
                    selectedLevel.classList.remove('hidden');
                }
            }
        });
    }
});

function validateUsernameEntry() {
    const usernameInput = document.getElementById('username-entry-input');
    const errorDiv = document.getElementById('username-entry-error');
    const submitBtn = document.getElementById('username-entry-button');
    const username = usernameInput.value.trim();
    let error = '';
    
    // Check length
    if (username.length < 4) {
        error = `Username too short (${username.length}/4 characters)`;
    }
    // Check if username already exists
    else if (existingUsernames.has(username.toLowerCase())) {
        error = 'Username already exists. Please choose a different one.';
    }
    
    if (error) {
        errorDiv.textContent = error;
        errorDiv.style.display = 'block';
        submitBtn.disabled = true;
        return true;
    } else {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        submitBtn.disabled = false;
        return false;
    }
}

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

// Animation frame lists
const ANIM_FRAMES = {
    cloud: [
        'assets/animation pngs/appear disappear cloud/debesis_anim_1.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_2.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_3.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_4.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_5.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_6.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_7.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_8.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_9.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_10.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_11.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_12.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_13.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_14.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_15.png',
        'assets/animation pngs/appear disappear cloud/debesis_anim_16.png'
    ]
};

function playFrames(cardEl, frames, fps = 24, options = {}) {
    const { className = '', onComplete, onMidpoint } = options;
    const overlay = document.createElement('div');
    overlay.className = `anim-overlay ${className}`.trim();
    const img = document.createElement('img');
    overlay.appendChild(img);
    cardEl.appendChild(overlay);
    let i = 0;
    const midpoint = Math.floor(frames.length / 2);
    const interval = setInterval(() => {
        img.src = frames[i];
        if (i === midpoint && typeof onMidpoint === 'function') {
            onMidpoint();
        }
        i++;
        if (i >= frames.length) {
            clearInterval(interval);
            overlay.remove();
            if (typeof onComplete === 'function') onComplete();
        }
    }, Math.max(16, Math.floor(1000 / fps)));
}

function renderCards(container, deck) {
    container.innerHTML = '';
    deck.forEach(symbolId => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.symbol = String(symbolId);

        const inner = document.createElement('div');
        inner.className = 'card-inner';
        inner.style.visibility = 'hidden'; // Hide card faces until animation reaches 50%

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

        // Play appear/disappear cloud on load; show card faces at 50%
        playFrames(cardEl, ANIM_FRAMES.cloud, 16, {
            className: 'cloud',
            onMidpoint: () => {
                inner.style.visibility = 'visible';
            }
        });
    });
}

function onCardClick(cardEl) {
    if (lockBoard) return;
    if (cardEl.classList.contains('flipped')) return;
    if (!cardEl.isConnected) return;
    cardEl.classList.add('flipped');
    openCards.push(cardEl);
    if (openCards.length === 2) {
        handlePair();
    }
}

// Hover effects handled purely by CSS for unflipped cards

function handlePair() {
    lockBoard = true;
    const [c1, c2] = openCards;
    const match = c1.dataset.symbol === c2.dataset.symbol;
    if (match) {
        // Play cloud on both cards; hide at 50%, then mark matched and update stats
        let completed = 0;
        const done = () => {
            completed++;
            if (completed === 2) {
                score += 1;
                matchedCount += 2;
                updateStats();
                openCards = [];
                lockBoard = false;
                const cfg = levelConfig[level];
                if (matchedCount === cfg.count) {
                    stopTimer();
                    const elapsed = Math.floor((performance.now() - timerStart) / 1000 * 1000) / 1000;
                    finalTime = elapsed;
                    showCompletionModal(elapsed, score, mistakes);
                }
            }
        };
        playFrames(c1, ANIM_FRAMES.cloud, 16, {
            className: 'cloud',
            onMidpoint: () => {
                c1.querySelector('.card-inner').style.visibility = 'hidden';
            },
            onComplete: () => {
                c1.classList.add('matched');
                done();
            }
        });
        playFrames(c2, ANIM_FRAMES.cloud, 16, {
            className: 'cloud',
            onMidpoint: () => {
                c2.querySelector('.card-inner').style.visibility = 'hidden';
            },
            onComplete: () => {
                c2.classList.add('matched');
                done();
            }
        });
    } else {
        setTimeout(() => {
            c1.classList.remove('flipped');
            c2.classList.remove('flipped');
            mistakes += 1;
            updateStats();
            openCards = [];
            lockBoard = false;
        }, 500);
    }
}

// Start / restart helpers
function startGame() {
    if (!selectedLevel) return;
    
    // Hide start screen and show level container
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');
    if (selectedLevel) selectedLevel.classList.remove('hidden');
    
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
    const username = sessionStorage.getItem('playerUsername');
    document.getElementById('modal-player').textContent = username || 'Guest';
    document.getElementById('modal-time').textContent = time.toFixed(3);
    document.getElementById('modal-score').textContent = pts;
    document.getElementById('modal-mistakes').textContent = errs;
    document.getElementById('completion-modal').classList.remove('hidden');
    
    // Auto-save score
    if (username) {
        saveToScoreboard(username, time, pts, errs);
    }
}

function closeCompletionModal() {
    document.getElementById('completion-modal').classList.add('hidden');
}

function viewScoreboard() {
    // Show scoreboard modal
    document.getElementById('completion-modal').classList.add('hidden');
    const username = sessionStorage.getItem('playerUsername');
    // Fetch and display leaderboard
    fetch('save-score.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, action: 'get' })
    })
        .then(response => response.json())
        .then(data => {
            if (data.entries) {
                showScoreboard(data.entries, username, finalTime);
            }
        })
        .catch(err => console.error('Error fetching leaderboard:', err));
}

function closeModal() {
    document.getElementById('completion-modal').classList.add('hidden');
}

function playAgain() {
    document.getElementById('scoreboard-modal').classList.add('hidden');
    startGame();
}

function nextLevel() {
    const levelOrder = ['easy', 'medium', 'hard'];
    const currentIndex = levelOrder.indexOf(level);
    const nextIndex = (currentIndex + 1) % levelOrder.length;
    const nextLevelName = levelOrder[nextIndex];
    
    // Redirect to next level
    window.location.href = `game.html?level=${nextLevelName}`;
}

function saveToScoreboard(username, time, pts, errs) {
    const entry = {
        username,
        level,
        time,
        score: pts,
        mistakes: errs
    };
    
    // Save to backend via PHP silently
    fetch('save-score.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    })
        .then(response => response.json())
        .then(data => {
            if (data.entries) {
                // Store entries for leaderboard display later
                if (!window.leaderboardData) window.leaderboardData = {};
                window.leaderboardData[level] = data.entries;
            }
        })
        .catch(err => {
            console.error('Error saving score:', err);
        });
}

function closeCompletionModal() {
    document.getElementById('completion-modal').classList.add('hidden');
}

function showScoreboard(entries, currentUsername, currentTime) {
    const levelNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    document.getElementById('scoreboard-level').textContent = levelNames[level] || 'Unknown';
    
    // Store leaderboard data globally for duplicate checking
    if (!window.leaderboardData) window.leaderboardData = {};
    window.leaderboardData[level] = entries;
    
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
    const usernameInput = document.getElementById('username');
    const form = document.getElementById('scoreboard-form');
    
    if (usernameInput) {
        usernameInput.addEventListener('input', validateUsername);
    }
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const hasError = validateUsername();
            if (!hasError && username) {
                saveToScoreboard(username, finalTime, score, mistakes);
            }
        });
    }
});

function validateUsername() {
    const usernameInput = document.getElementById('username');
    const errorDiv = document.getElementById('username-error');
    const username = usernameInput.value.trim();
    let error = '';
    
    // Check minimum length
    if (username.length < 4) {
        error = 'Username must be at least 4 letters';
    }
    // Check if username is already taken (fetch from current leaderboard)
    else if (window.leaderboardData && window.leaderboardData[level]) {
        const isTaken = window.leaderboardData[level].some(entry => entry.username.toLowerCase() === username.toLowerCase());
        if (isTaken) {
            error = 'Username already taken';
        }
    }
    
    if (error) {
        errorDiv.textContent = error;
        errorDiv.style.display = 'block';
        return true;
    } else {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        return false;
    }
}

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