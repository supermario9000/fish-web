let currentLeaderboardLevel = 'easy';

function showLeaderboard() {
    currentLeaderboardLevel = 'easy';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    loadLeaderboard('easy');
    document.getElementById('leaderboard-modal').classList.remove('hidden');
}

function closeLeaderboard() {
    document.getElementById('leaderboard-modal').classList.add('hidden');
}

function switchLeaderboardLevel(level) {
    currentLeaderboardLevel = level;
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach((btn, index) => {
        btn.classList.remove('active');
        const levels = ['easy', 'medium', 'hard'];
        if (levels[index] === level) {
            btn.classList.add('active');
        }
    });
    loadLeaderboard(level);
}

function loadLeaderboard(level) {
    fetch(`data/scoreboard_${level}.json`)
        .then(response => response.json())
        .catch(() => ({ entries: [] }))
        .then(data => {
            displayLeaderboard(data.entries || []);
        })
        .catch(err => {
            console.error('Error loading leaderboard:', err);
            document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="5">Error loading leaderboard</td></tr>';
        });
}

function displayLeaderboard(entries) {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No scores yet. Be the first!</td></tr>';
        return;
    }

    entries.slice(0, 10).forEach((entry, index) => {
        const movesValue = entry.moves ?? entry.score ?? '—';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.username}</td>
            <td>${entry.time.toFixed(3)}</td>
            <td>${movesValue}</td>
            <td>${entry.mistakes}</td>
        `;
        tbody.appendChild(row);
    });
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('leaderboard-modal');
    if (e.target === modal) {
        closeLeaderboard();
    }
});
