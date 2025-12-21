<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['username']) || !isset($input['level']) || !isset($input['time']) || 
        !isset($input['score']) || !isset($input['mistakes'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }

    $username = htmlspecialchars($input['username']);
    $level = htmlspecialchars($input['level']);
    $time = floatval($input['time']);
    $score = intval($input['score']);
    $mistakes = intval($input['mistakes']);

    // Validate level
    if (!in_array($level, ['easy', 'medium', 'hard'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid level']);
        exit;
    }

    $scoreboardFile = __DIR__ . "/data/scoreboard_$level.json";

    try {
        // Read existing scoreboard or create new one
        $data = ['entries' => []];
        if (file_exists($scoreboardFile)) {
            $fileContent = file_get_contents($scoreboardFile);
            $data = json_decode($fileContent, true);
            if ($data === null) {
                $data = ['entries' => []];
            }
        }

        // Ensure entries is an array
        if (!isset($data['entries'])) {
            $data['entries'] = [];
        }

        // Add new entry
        $entry = [
            'username' => $username,
            'time' => $time,
            'score' => $score,
            'mistakes' => $mistakes,
            'date' => date('c')
        ];

        $data['entries'][] = $entry;

        // Sort by time ascending (fastest first)
        usort($data['entries'], function($a, $b) {
            return $a['time'] <=> $b['time'];
        });

        // Write back to file
        file_put_contents($scoreboardFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        http_response_code(200);
        echo json_encode(['success' => true, 'entries' => $data['entries']]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save score: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
