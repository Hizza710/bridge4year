<?php

/******************************************************************************
 * API処理部分 / データの投稿、取得、CSV出力を処理
 ******************************************************************************/
date_default_timezone_set('Asia/Tokyo');
$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/wishes.json';

if (!is_dir($dataDir)) {
    if (!mkdir($dataDir, 0777, true)) {
        error_log("Failed to create directory: $dataDir");
    }
}

if (!file_exists($dataFile)) {
    $result = file_put_contents($dataFile, json_encode([], JSON_PRETTY_PRINT));
    if ($result === false) {
        error_log("Failed to create file: $dataFile");
    } else {
        chmod($dataFile, 0666); // 書き込み権限を確保
    }
}

$action = $_GET['action'] ?? '';
// ==============================
// API処理: CSV出力(管理者のみ)
// ==============================
if ($action === 'csv') {
    // 管理者パスワードチェック
    $adminPassword = 'xxxxxx'; // ★パスワードを変更する場合はここを編集
    $inputPassword = $_GET['pass'] ?? '';

    if ($inputPassword !== $adminPassword) {
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'パスワードが正しくありません']);
        exit;
    }

    $wishes = json_decode(file_get_contents($dataFile), true) ?? [];

    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="wishes_' . date('Ymd_His') . '.csv"');

    // BOM追加（Excelで日本語を正しく表示するため）
    echo "\xEF\xBB\xBF";

    // ヘッダー行
    echo "ID,ニックネーム,メッセージ,モード,投稿日時\n";

    // データ行
    foreach ($wishes as $wish) {
        $row = [
            $wish['id'] ?? '',
            $wish['nickname'] ?? '',
            str_replace(["\r\n", "\n", "\r"], ' ', $wish['message'] ?? ''), // 改行を削除
            $wish['mode'] ?? '',
            $wish['date'] ?? ''
        ];

        // CSVとして出力（カンマや引用符を適切にエスケープ）
        $output = fopen('php://output', 'w');
        fputcsv($output, $row);
        fclose($output);
    }
    exit;
}

// ==============================
// API処理: 投稿処理
// ==============================
if ($action === 'submit' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');

    $nickname = trim($_POST['nickname'] ?? 'Anonymous');
    $message = trim($_POST['message'] ?? '');
    $mode = trim($_POST['mode'] ?? 'christmas');

    if (empty($message)) {
        echo json_encode(['status' => 'error', 'message' => 'メッセージが空です']);
        exit;
    }

    // 既存データを読み込み
    $wishes = json_decode(file_get_contents($dataFile), true) ?? [];

    // 新しいデータを追加
    $newWish = [
        'id' => uniqid(),
        'nickname' => $nickname,
        'message' => $message,
        'mode' => $mode,
        'timestamp' => time(),
        'date' => date('Y-m-d H:i:s')
    ];

    $wishes[] = $newWish;

    // ファイルに保存
    file_put_contents($dataFile, json_encode($wishes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    echo json_encode([
        'status' => 'success',
        'message' => '投稿しました',
        'data' => $newWish
    ]);
    exit;
}

// ==============================
// API処理: 一覧取得
// ==============================
if ($action === 'get') {
    header('Content-Type: application/json');

    $wishes = json_decode(file_get_contents($dataFile), true) ?? [];

    // 非表示フラグがついているものを除外
    $wishes = array_filter($wishes, function ($wish) {
        return empty($wish['hidden']);
    });

    // 新しい順に並べ替え
    usort($wishes, function ($a, $b) {
        return ($b['timestamp'] ?? 0) - ($a['timestamp'] ?? 0);
    });

    echo json_encode($wishes);
    exit;
}

// ==============================
// API処理: 個別削除(管理者のみ)
// ==============================
if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');

    // 管理者パスワードチェック
    $adminPassword = 'xxxxxx';
    $inputPassword = $_POST['pass'] ?? '';

    if ($inputPassword !== $adminPassword) {
        echo json_encode(['status' => 'error', 'message' => 'パスワードが正しくありません']);
        exit;
    }

    $deleteId = $_POST['id'] ?? '';

    if (empty($deleteId)) {
        echo json_encode(['status' => 'error', 'message' => 'IDが指定されていません']);
        exit;
    }

    // 既存データを読み込み
    $wishes = json_decode(file_get_contents($dataFile), true) ?? [];

    // 指定されたIDを削除
    $wishes = array_filter($wishes, function ($wish) use ($deleteId) {
        return $wish['id'] !== $deleteId;
    });

    // 配列のインデックスを振り直す
    $wishes = array_values($wishes);

    // ファイルに保存
    file_put_contents($dataFile, json_encode($wishes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    echo json_encode(['status' => 'success', 'message' => '削除しました']);
    exit;
}

// ==============================
// API処理: 画面クリア(データは保持)
// ==============================
if ($action === 'clearScreen') {
    header('Content-Type: application/json');

    // 管理者パスワードチェック
    $adminPassword = 'xxxxxx';
    $inputPassword = $_POST['pass'] ?? '';

    if ($inputPassword !== $adminPassword) {
        echo json_encode(['status' => 'error', 'message' => 'パスワードが正しくありません']);
        exit;
    }

    // 既存データを読み込み
    $wishes = json_decode(file_get_contents($dataFile), true) ?? [];

    // 全ての投稿に非表示フラグを追加（データは削除しない）
    foreach ($wishes as &$wish) {
        $wish['hidden'] = true;
    }
    unset($wish); // 参照を解除

    // ファイルに保存
    file_put_contents($dataFile, json_encode($wishes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    echo json_encode(['status' => 'success', 'message' => '画面をクリアしました（データは保持されています）']);
    exit;
}

// ==============================
// API処理: インサイト分析(管理者のみ)
// ==============================
if ($action === 'insights') {
    header('Content-Type: application/json');

    // 管理者パスワードチェック
    $adminPassword = 'xxxxxx';
    $inputPassword = $_GET['pass'] ?? '';

    if ($inputPassword !== $adminPassword) {
        echo json_encode(['status' => 'error', 'message' => 'パスワードが正しくありません']);
        exit;
    }

    $wishes = json_decode(file_get_contents($dataFile), true) ?? [];
    $currentMode = $_GET['mode'] ?? 'all';

    // モードでフィルタ
    if ($currentMode !== 'all') {
        $wishes = array_filter($wishes, function ($wish) use ($currentMode) {
            return ($wish['mode'] ?? '') === $currentMode;
        });
    }

    $totalCount = count($wishes);
    $christmasCount = count(array_filter($wishes, function ($w) {
        return ($w['mode'] ?? '') === 'christmas';
    }));
    $newyearCount = count(array_filter($wishes, function ($w) {
        return ($w['mode'] ?? '') === 'newyear';
    }));

    // テキスト分析
    $allText = '';
    $messageLengths = [];
    foreach ($wishes as $wish) {
        $message = $wish['message'] ?? '';
        $allText .= $message . ' ';
        $messageLengths[] = mb_strlen($message);
    }

    // 頻出キーワード抽出（簡易版：名詞っぽい2文字以上の単語）
    preg_match_all('/[ぁ-んァ-ヶー一-龠々]{2,}/u', $allText, $matches);
    $words = $matches[0];

    // ストップワード除外
    $stopwords = ['こと', 'もの', 'ため', 'よう', 'どんな', 'ます', 'です', 'ました', 'でした', 'これ', 'それ', 'あれ', 'この', 'その', 'あの'];
    $words = array_filter($words, function ($w) use ($stopwords) {
        return !in_array($w, $stopwords);
    });

    $wordCount = array_count_values($words);
    arsort($wordCount);
    $topWords = array_slice($wordCount, 0, 10, true);

    // 統計情報
    $avgLength = $totalCount > 0 ? round(array_sum($messageLengths) / $totalCount, 1) : 0;
    $maxLength = $totalCount > 0 ? max($messageLengths) : 0;
    $minLength = $totalCount > 0 ? min($messageLengths) : 0;

    // ポジティブ/ネガティブ判定（簡易版）
    $positiveWords = [
        '嬉しい',
        'うれしい',
        'ウレシイ',
        '楽しい',
        'たのしい',
        'タノシイ',
        '幸せ',
        'しあわせ',
        'シアワセ',
        '良い',
        'よい',
        'いい',
        'イイ',
        '素敵',
        'すてき',
        'ステキ',
        '最高',
        'さいこう',
        'サイコウ',
        '感謝',
        'かんしゃ',
        'カンシャ',
        'ありがとう',
        'アリガトウ',
        '好き',
        'すき',
        'スキ',
        '愛',
        'あい',
        'アイ',
        '笑顔',
        'えがお',
        'エガオ',
        '頑張',
        'がんば',
        'ガンバ',
        'できた',
        'デキタ',
        '成功',
        'せいこう',
        'セイコウ'
    ];
    $negativeWords = [
        '悲しい',
        'かなしい',
        'カナシイ',
        '辛い',
        'つらい',
        'ツライ',
        '大変',
        'たいへん',
        'タイヘン',
        '難しい',
        'むずかしい',
        'ムズカシイ',
        '苦しい',
        'くるしい',
        'クルシイ',
        '疲れ',
        'つかれ',
        'ツカレ',
        '無理',
        'むり',
        'ムリ',
        'できない',
        'デキナイ',
        '失敗',
        'しっぱい',
        'シッパイ',
        '不安',
        'ふあん',
        'フアン'
    ];

    $positiveCount = 0;
    $negativeCount = 0;
    foreach ($wishes as $wish) {
        $message = $wish['message'] ?? '';
        foreach ($positiveWords as $pw) {
            if (mb_strpos($message, $pw) !== false) {
                $positiveCount++;
                break;
            }
        }
        foreach ($negativeWords as $nw) {
            if (mb_strpos($message, $nw) !== false) {
                $negativeCount++;
                break;
            }
        }
    }

    $insights = [
        'status' => 'success',
        'total_posts' => $totalCount,
        'christmas_posts' => $christmasCount,
        'newyear_posts' => $newyearCount,
        'top_keywords' => $topWords,
        'statistics' => [
            'avg_length' => $avgLength,
            'max_length' => $maxLength,
            'min_length' => $minLength
        ],
        'sentiment' => [
            'positive' => $positiveCount,
            'negative' => $negativeCount,
            'neutral' => $totalCount - $positiveCount - $negativeCount
        ]
    ];

    echo json_encode($insights, JSON_UNESCAPED_UNICODE);
    exit;
}

// APIリクエスト以外のエラー処理
if (!empty($action)) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => '無効なリクエスト']);
    exit;
}

/*******************************************************************************
 CONFIG設定部分 モード別の設定を管理
 ******************************************************************************/

// モード判定（GETパラメータで切り替え）
$mode = isset($_GET['mode']) && $_GET['mode'] === 'newyear' ? 'newyear' : 'christmas';

// ==============================
// クリスマスモードの設定
// ==============================
if ($mode === 'christmas') {
    $config = [
        'title' => 'Christmas Wishes',
        'intro_text' => 'How was 2025 for you?',
        'placeholder_name' => 'ニックネーム',
        'placeholder_text' => '2025年はどんな1年でしたか？',
        'music' => 'bgm.mp3'
    ];
}
// ==============================
// お正月モードの設定
// ==============================
else {
    $config = [
        'title' => 'New Year Wishes',
        'intro_text' => 'How will you enjoy 2026?',
        'placeholder_name' => 'ニックネーム',
        'placeholder_text' => '2026年はどんな1年にしたいですか？',
        'music' => 'bgm_ny.mp3'
    ];
}

/*******************************************************************************
 HTML表示部分 ページのUI表示を担当
 ******************************************************************************/

// モード別の設定
$isNewyear = ($mode === 'newyear');
$canvasId = $isNewyear ? 'sunshineCanvas' : 'snowCanvas';
$bodyClass = $isNewyear ? 'newyear-mode' : 'christmas';
$pageTitle = $isNewyear ? '🎍 新年の抱負' : '🎅 Santa\'s List';
$titleClass = $isNewyear ? 'newyear-title' : '';
$buttonText = $isNewyear ? '抱負を届ける' : '想いを届ける';
$csvLabel = $isNewyear ? '🎍 お正月管理人' : '🎅 サンタハウス管理人';
$modeIcon = $isNewyear ? '🎄' : '🎍';
$modeTitle = $isNewyear ? 'クリスマスモードに戻る' : 'お正月モードに切り替え';
$nextMode = $isNewyear ? 'christmas' : 'newyear';
?>
<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $config['title']; ?></title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=M+PLUS+Rounded+1c:wght@400;700&display=swap" rel="stylesheet">
</head>

<body class="<?php echo $bodyClass; ?>">

    <canvas id="<?php echo $canvasId; ?>"></canvas>

    <div id="intro-overlay">
        <h1 class="handwritten-text"><?php echo $config['intro_text']; ?></h1>
    </div>

    <div class="container" id="main-container">
        <div class="form-wrapper">
            <h2 class="<?php echo $titleClass; ?>"><?php echo $pageTitle; ?></h2>
            <form id="wishForm">
                <input type="text" name="nickname" placeholder="<?php echo $config['placeholder_name']; ?>" required>
                <textarea name="message" placeholder="<?php echo $config['placeholder_text']; ?>" required></textarea>
                <input type="hidden" name="mode" value="<?php echo $mode; ?>">
                <button type="submit"><?php echo $buttonText; ?></button>
            </form>
        </div>

        <div id="wishes-grid" class="wishes-grid">
        </div>
    </div>

    <div class="music-controls">
        <div class="sound-control" onclick="toggleMusic()">🎵 On</div>
    </div>

    <!-- 管理者ログインボタン -->
    <div class="admin-login-btn">
        <a href="#" onclick="adminLogin(); return false;" title="管理者ログイン">
            🔐
        </a>
    </div>

    <!-- 管理者メニュー（ログイン後に表示） -->
    <div class="admin-menu" id="adminMenu" style="display: none;">
        <div class="admin-menu-header">
            <span>管理者メニュー</span>
            <button onclick="adminLogout()" title="ログアウト">×</button>
        </div>
        <div class="admin-menu-content">
            <button onclick="downloadCSV()">
                📊 CSV出力
            </button>
            <button onclick="showInsights()">
                🔍 インサイト分析
            </button>
            <button onclick="deleteAllWishes()">
                🗑️ 画面クリア
            </button>
        </div>
    </div>

    <!-- 風のアイコン（再配置ボタン） -->
    <div class="wind-control" onclick="scatterWishes()" title="投稿を散らばらせる">
        💨
    </div>

    <!-- インサイト分析 -->
    <div class="insights-modal" id="insightsModal" style="display: none;">
        <div class="insights-content">
            <div class="insights-header">
                <h3>📊 インサイト分析</h3>
                <button onclick="closeInsights()">×</button>
            </div>
            <div class="insights-body" id="insightsBody">
                <p>分析中...</p>
            </div>
        </div>
    </div>

    <!-- スクリーンショットボタン -->
    <div class="screenshot-control" onclick="takeScreenshot()" title="スクリーンショットを撮る">
        📷
    </div>

    <!-- モード切り替えボタン（左上） -->
    <div class="mode-switch" onclick="location.href='?mode=<?php echo $nextMode; ?>'" title="<?php echo $modeTitle; ?>">
        <?php echo $modeIcon; ?>
    </div>

    <audio id="bgm" loop>
        <source src="assets/<?php echo $config['music']; ?>" type="audio/mp3">
    </audio>

    <script src="script.js"></script>
</body>

</html>