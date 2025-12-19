document.addEventListener('DOMContentLoaded', () => {
    // お正月モードかチェック
    const isNewyearMode = document.body.classList.contains('newyear-mode');

    if (isNewyearMode) {
        initSunshine(); // 太陽の光
        loadWishes(); // 正月モードでもメッセージを読み込む
    } else {
        initSnow(); // 雪のエフェクト
        loadWishes(); // メッセージを読み込む
    }

    autoPlayMusic(); // 音楽を自動再生

    const form = document.getElementById('wishForm');
    const formWrapper = document.querySelector('.form-wrapper');

    // 背景クリックでフォームの表示/非表示を切り替え
    document.addEventListener('click', (e) => {
        const clickedElement = e.target;

        // ボタンやリンクなどの特定要素をクリックした場合はスキップ
        if (clickedElement.closest('.sound-control') ||
            clickedElement.closest('.csv-download') ||
            clickedElement.closest('.wind-control') ||
            clickedElement.closest('.snowflake-card')) {
            return;
        }

        // フォーム以外の場所（背景）をクリックした場合、トグル切り替え
        if (!formWrapper.contains(clickedElement)) {
            formWrapper.classList.toggle('form-submitted');
        }
    });

    // フォーム自体をクリックした時は何もしない
    formWrapper.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // フォームをフェードアウト
        formWrapper.classList.add('form-submitted');

        const formData = new FormData(form);

        fetch('index.php?action=submit', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                console.log('投稿レスポンス:', data); // デバッグ用
                if (data.status === 'success') {
                    console.log('投稿成功！メッセージを表示します:', data.data); // デバッグ用
                    form.reset();

                    // 全モードでメッセージを表示
                    addWishToSky(data.data, true);

                    // フォームをしばらくしたら復活させる（連続投稿用）
                    setTimeout(() => {
                        formWrapper.classList.remove('form-submitted');
                    }, 3000);
                } else {
                    console.error('投稿エラー:', data);
                }
            })
            .catch(error => {
                console.error('通信エラー:', error);
            });
    });
});

function loadWishes() {
    fetch('index.php?action=get')
        .then(res => res.json())
        .then(data => {
            const grid = document.getElementById('wishes-grid');
            grid.innerHTML = '';
            const currentMode = document.querySelector('input[name="mode"]').value;

            // モード一致データを抽出
            const displayData = data.filter(item => item.mode === currentMode);

            // ★制限なしですべて表示
            displayData.forEach(item => {
                addWishToSky(item, false);
            });
        });
}

function addWishToSky(item, isNewPost) {
    console.log('addWishToSky呼び出し:', item, 'isNewPost:', isNewPost); // デバッグ用

    const grid = document.getElementById('wishes-grid');
    if (!grid) {
        console.error('wishes-grid要素が見つかりません！');
        return;
    }

    const div = document.createElement('div');
    div.className = 'snowflake-card';
    div.setAttribute('data-id', item.id); // IDを保存

    // メッセージ内の改行文字<br>タグ
    const messageWithBreaks = item.message.replace(/\n/g, '<br>');

    // 中身のHTML（揺れる動き用のinnerクラスを追加 + 削除ボタン）
    div.innerHTML = `
        <div class="snowflake-inner">
            <button class="delete-btn" onclick="deleteWish('${item.id}')" title="削除（管理者のみ）">×</button>
            <p>${messageWithBreaks}</p>
            <strong>- ${item.nickname}</strong>
        </div>
    `;

    // 最終的な到達位置（ランダム）
    // 画面の上半分〜中段くらいに散らす
    const targetTop = Math.random() * 60 + 10; // 10%〜70%
    const targetLeft = Math.random() * 80 + 10; // 10%〜90%

    if (isNewPost) {
        console.log('新規投稿のアニメーション開始'); // デバッグ用

        // 新規投稿時は、最初は「フォームの真ん中」に配置
        div.style.position = 'absolute';
        div.style.top = '50%';
        div.style.left = '50%';
        div.style.transform = 'translate(-50%, -50%) scale(0.5)'; // 最初は小さく
        div.style.opacity = '0';
        div.style.zIndex = '25'; // フォームより上に

        grid.appendChild(div);
        console.log('要素をDOMに追加しました'); // デバッグ用

        // ブラウザに描画反映させるためのウェイト
        setTimeout(() => {
            console.log('アニメーション実行:', `top:${targetTop}%, left:${targetLeft}%`); // デバッグ用
            // アニメーション開始（最終位置へ移動）
            div.style.opacity = '1';
            div.style.transform = 'translate(0, 0) scale(1)';
            div.style.top = `${targetTop}%`;
            div.style.left = `${targetLeft}%`;
        }, 50);

    } else {
        // 読み込み時は最初から最終位置
        div.style.position = 'absolute';
        div.style.top = `${targetTop}%`;
        div.style.left = `${targetLeft}%`;
        div.style.opacity = '0'; // ふわっと出すため一旦0
        grid.appendChild(div);

        // ランダムなタイミングで出現させる
        setTimeout(() => {
            div.style.opacity = '1';
        }, Math.random() * 2000);
    }

    // ホバー時に周りの投稿を避ける
    div.addEventListener('mouseenter', function () {
        pushAwayNearbyCards(this);
    });

    div.addEventListener('mouseleave', function () {
        resetNearbyCards();
    });
}

// 近くのカードを押しのける
function pushAwayNearbyCards(hoveredCard) {
    const allCards = document.querySelectorAll('.snowflake-card');
    const hoveredRect = hoveredCard.getBoundingClientRect();
    const hoveredCenterX = hoveredRect.left + hoveredRect.width / 2;
    const hoveredCenterY = hoveredRect.top + hoveredRect.height / 2;

    allCards.forEach(card => {
        if (card === hoveredCard) return;

        const cardRect = card.getBoundingClientRect();
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;

        const dx = cardCenterX - hoveredCenterX;
        const dy = cardCenterY - hoveredCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 250px以内の近くのカードを押しのける
        if (distance < 250 && distance > 0) {
            const angle = Math.atan2(dy, dx);
            const pushDistance = 80; // 押しのける距離
            const pushX = Math.cos(angle) * pushDistance;
            const pushY = Math.sin(angle) * pushDistance;

            card.style.transition = 'transform 0.3s ease-out';
            card.style.transform = `translate(${pushX}px, ${pushY}px) scale(0.9)`;
            card.style.opacity = '0.7';
        }
    });
}

// カードを元の位置に戻す
function resetNearbyCards() {
    const allCards = document.querySelectorAll('.snowflake-card');
    allCards.forEach(card => {
        card.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
        card.style.transform = '';
        card.style.opacity = '1';
    });
}

// 風を吹かせて投稿を散らばらせる
function scatterWishes() {
    const allCards = document.querySelectorAll('.snowflake-card');

    // すべてのカードを一時的に半透明にして風が吹いている感を出す
    allCards.forEach((card, index) => {
        // ランダムな遅延で各カードをアニメーション
        setTimeout(() => {
            // 新しいランダムな位置を計算
            const newTop = Math.random() * 70 + 10; // 10%〜80%
            const newLeft = Math.random() * 80 + 10; // 10%〜90%

            // 一時的に風に吹かれるアニメーション
            card.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
            card.style.transform = `rotate(${Math.random() * 360 - 180}deg) scale(0.8)`;
            card.style.opacity = '0.3';

            // 少し遅れて新しい位置に配置
            setTimeout(() => {
                card.style.top = `${newTop}%`;
                card.style.left = `${newLeft}%`;
                card.style.transform = 'rotate(0deg) scale(1)';
                card.style.opacity = '1';
                card.style.transition = 'all 1s ease-out';
            }, 400);

        }, index * 50); // 順番に散らばる
    });
}

// 音楽コントロール
let isPlaying = false;

// 音楽を自動再生（20%のボリューム）
function autoPlayMusic() {
    const audio = document.getElementById('bgm');
    const btn = document.querySelector('.sound-control');

    // 初期ボリュームを20%に設定
    audio.volume = 0.20;

    // 自動再生を試みる
    audio.play()
        .then(() => {
            isPlaying = true;
            btn.textContent = "🎵 On";
            console.log('音楽が自動再生されました (ボリューム: 20%)');
        })
        .catch(e => {
            console.log('自動再生がブロックされました。最初のクリックで再生します。');
            btn.textContent = "🎵 Off";
            isPlaying = false;

            // 最初のクリックで音楽を再生
            const startMusic = () => {
                audio.play()
                    .then(() => {
                        isPlaying = true;
                        btn.textContent = "🎵 On";
                        console.log('ユーザー操作により音楽が再生されました');
                        document.removeEventListener('click', startMusic);
                    })
                    .catch(err => console.error('音楽再生エラー:', err));
            };

            document.addEventListener('click', startMusic, { once: true });
        });
}

function toggleMusic() {
    const audio = document.getElementById('bgm');
    const btn = document.querySelector('.sound-control');

    // ボリュームは常に20%
    audio.volume = 0.20;

    if (!isPlaying) {
        audio.play().catch(e => alert('再生できません。ファイル配置を確認してください。'));
        btn.textContent = "🎵 On";
        isPlaying = true;
    } else {
        audio.pause();
        btn.textContent = "🎵 Off";
        isPlaying = false;
    }
}

// CSV出力（管理者パスワード）
function downloadCSV() {
    // すでにログイン済みの場合はパスワード不要
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';

    if (isLoggedIn) {
        const password = sessionStorage.getItem('adminPassword');
        window.location.href = `index.php?action=csv&pass=${encodeURIComponent(password)}`;
    } else {
        const password = prompt('管理者パスワードを入力してください:');
        if (password) {
            window.location.href = `index.php?action=csv&pass=${encodeURIComponent(password)}`;
        }
    }
}

// 管理者ログイン
function adminLogin() {
    const password = prompt('管理者パスワードを入力してください:');
    if (!password) return;

    // パスワード確認（簡易的にフロントエンドでチェック）
    if (password === 'admin') {
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminPassword', password);

        // メニューを表示
        document.getElementById('adminMenu').style.display = 'block';
        console.log('管理者ログイン成功');
    } else {
        alert('パスワードが正しくありません');
    }
}

// 管理者ログアウト
function adminLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminPassword');

    // メニューを非表示
    document.getElementById('adminMenu').style.display = 'none';
    console.log('管理者ログアウト');
}

// ページ読み込み時にログイン状態をチェック
document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    if (isLoggedIn) {
        document.getElementById('adminMenu').style.display = 'block';
    }
});

// 個別削除（管理者パスワード）
function deleteWish(id) {
    const password = prompt('管理者パスワードを入力してください:');
    if (!password) return;

    const formData = new FormData();
    formData.append('id', id);
    formData.append('pass', password);

    fetch('index.php?action=delete', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('削除成功:', id);
                // 画面から削除
                const card = document.querySelector(`[data-id="${id}"]`);
                if (card) {
                    card.style.transition = 'opacity 0.5s, transform 0.5s';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0)';
                    setTimeout(() => card.remove(), 500);
                }
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('削除エラー:', error);
            alert('削除に失敗しました');
        });
}

// 全削除（管理者パスワード）
function deleteAllWishes() {
    if (!confirm('画面上の全ての投稿をクリアしますか？\n（データはCSVに残り、画面には表示されなくなります）')) return;

    // すでにログイン済みの場合はパスワード不要
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    const password = isLoggedIn ? sessionStorage.getItem('adminPassword') : prompt('管理者パスワードを入力してください:');

    if (!password) return;

    const formData = new FormData();
    formData.append('pass', password);

    fetch('index.php?action=clearScreen', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('画面クリア成功（データは保持）');
                // 画面上のカードを全て削除（アニメーション付き）
                const allCards = document.querySelectorAll('.snowflake-card');
                allCards.forEach((card, index) => {
                    setTimeout(() => {
                        card.style.transition = 'opacity 0.5s, transform 0.5s';
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0) rotate(360deg)';
                        setTimeout(() => card.remove(), 500);
                    }, index * 50);
                });
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('クリアエラー:', error);
            alert('画面クリアに失敗しました');
        });
}

// インサイト分析表示
function showInsights() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    const password = isLoggedIn ? sessionStorage.getItem('adminPassword') : prompt('管理者パスワードを入力してください:');

    if (!password) return;

    const currentMode = document.querySelector('input[name="mode"]').value;

    fetch(`index.php?action=insights&pass=${encodeURIComponent(password)}&mode=all`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                displayInsights(data);
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('分析エラー:', error);
            alert('分析に失敗しました');
        });
}

// インサイト結果を表示
function displayInsights(data) {
    const modal = document.getElementById('insightsModal');
    const body = document.getElementById('insightsBody');

    // 頻出キーワードのHTML生成
    let keywordsHtml = '<div class="keyword-cloud">';
    for (const [word, count] of Object.entries(data.top_keywords)) {
        const size = Math.min(20 + count * 3, 40);
        keywordsHtml += `<span style="font-size: ${size}px; margin: 5px; opacity: ${0.6 + count * 0.1}">${word} (${count})</span>`;
    }
    keywordsHtml += '</div>';

    // 感情分析の円グラフ風表示
    const total = data.sentiment.positive + data.sentiment.negative + data.sentiment.neutral;
    const posPercent = total > 0 ? Math.round((data.sentiment.positive / total) * 100) : 0;
    const negPercent = total > 0 ? Math.round((data.sentiment.negative / total) * 100) : 0;
    const neuPercent = 100 - posPercent - negPercent;

    body.innerHTML = `
        <div class="insight-section">
            <h4>📈 投稿統計</h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${data.total_posts}</div>
                    <div class="stat-label">総投稿数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.christmas_posts}</div>
                    <div class="stat-label">🎄 クリスマス</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.newyear_posts}</div>
                    <div class="stat-label">🎍 正月</div>
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <h4>🔤 頻出キーワード TOP10</h4>
            ${keywordsHtml}
        </div>
        
        <div class="insight-section">
            <h4>📊 文字数統計</h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${data.statistics.avg_length}</div>
                    <div class="stat-label">平均文字数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.statistics.max_length}</div>
                    <div class="stat-label">最大文字数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.statistics.min_length}</div>
                    <div class="stat-label">最小文字数</div>
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <h4>😊 感情分析</h4>
            <div class="sentiment-bars">
                <div class="sentiment-bar">
                    <span class="sentiment-label">ポジティブ</span>
                    <div class="bar-container">
                        <div class="bar positive" style="width: ${posPercent}%"></div>
                    </div>
                    <span class="sentiment-value">${data.sentiment.positive} (${posPercent}%)</span>
                </div>
                <div class="sentiment-bar">
                    <span class="sentiment-label">ネガティブ</span>
                    <div class="bar-container">
                        <div class="bar negative" style="width: ${negPercent}%"></div>
                    </div>
                    <span class="sentiment-value">${data.sentiment.negative} (${negPercent}%)</span>
                </div>
                <div class="sentiment-bar">
                    <span class="sentiment-label">ニュートラル</span>
                    <div class="bar-container">
                        <div class="bar neutral" style="width: ${neuPercent}%"></div>
                    </div>
                    <span class="sentiment-value">${data.sentiment.neutral} (${neuPercent}%)</span>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// インサイトを閉じる
function closeInsights() {
    document.getElementById('insightsModal').style.display = 'none';
}

// スクリーンショット機能（LocalStorage保存）
function takeScreenshot() {
    // ボタンを一時的に非表示にする
    const controls = document.querySelectorAll('.music-controls, .csv-download, .wind-control, .screenshot-control, .mode-switch');
    controls.forEach(control => {
        control.style.visibility = 'hidden';
    });

    // フォームも非表示
    const formWrapper = document.querySelector('.form-wrapper');
    const wasFormVisible = formWrapper && !formWrapper.classList.contains('form-submitted');
    if (formWrapper && wasFormVisible) {
        formWrapper.style.visibility = 'hidden';
    }

    // イントロオーバーレイも非表示
    const introOverlay = document.getElementById('intro-overlay');
    if (introOverlay) {
        introOverlay.style.visibility = 'hidden';
    }

    // 少し待ってからキャプチャ
    setTimeout(() => {
        try {
            // キャンバスを作成（解像度を下げてファイルサイズを削減）
            const captureCanvas = document.createElement('canvas');
            const scale = 1.5; // 高解像度（2→1.5に変更でファイルサイズ削減）
            captureCanvas.width = window.innerWidth * scale;
            captureCanvas.height = window.innerHeight * scale;
            const ctx = captureCanvas.getContext('2d');

            // 背景画像を描画
            const isNewyear = document.body.classList.contains('newyear-mode');
            const bgImage = new Image();
            bgImage.crossOrigin = 'anonymous';
            bgImage.src = isNewyear ? 'assets/image_1.png' : 'assets/image_0.png';

            bgImage.onload = () => {
                // 背景を描画
                ctx.drawImage(bgImage, 0, 0, captureCanvas.width, captureCanvas.height);

                // アニメーションcanvas（雪または太陽）を描画
                const animCanvas = document.querySelector('canvas');
                if (animCanvas) {
                    ctx.drawImage(animCanvas, 0, 0, captureCanvas.width, captureCanvas.height);
                }

                // メッセージカードを描画
                const wishCards = document.querySelectorAll('.snowflake-card');
                wishCards.forEach(card => {
                    const rect = card.getBoundingClientRect();
                    const inner = card.querySelector('.snowflake-inner');
                    if (!inner) return;

                    // カードの位置とサイズ
                    const x = rect.left * scale;
                    const y = rect.top * scale;
                    const w = rect.width * scale;
                    const h = rect.height * scale;

                    // カードの背景を描画
                    const computedStyle = window.getComputedStyle(inner);
                    ctx.save();

                    // 絵馬の形を描画（正月モード）
                    if (isNewyear) {
                        ctx.beginPath();
                        // 絵馬の五角形パス
                        ctx.moveTo(x + w * 0.1, y);
                        ctx.lineTo(x + w * 0.9, y);
                        ctx.lineTo(x + w * 0.9, y + h * 0.85);
                        ctx.lineTo(x + w * 0.5, y + h);
                        ctx.lineTo(x + w * 0.1, y + h * 0.85);
                        ctx.closePath();

                        // グラデーション背景
                        const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
                        gradient.addColorStop(0, 'rgba(255, 248, 220, 0.92)');
                        gradient.addColorStop(0.5, 'rgba(245, 222, 179, 0.88)');
                        gradient.addColorStop(1, 'rgba(230, 200, 160, 0.9)');
                        ctx.fillStyle = gradient;
                        ctx.fill();

                        // 影
                        ctx.shadowColor = 'rgba(139, 69, 19, 0.35)';
                        ctx.shadowBlur = 20 * scale;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 6 * scale;
                    } else {
                        // クリスマスモード（雪の結晶型 - 六角形）
                        ctx.beginPath();
                        // 六角形のパス（clip-path: polygon(50% 0%, 90% 25%, 90% 75%, 50% 100%, 10% 75%, 10% 25%)）
                        ctx.moveTo(x + w * 0.5, y);           // 上中央
                        ctx.lineTo(x + w * 0.9, y + h * 0.25); // 右上
                        ctx.lineTo(x + w * 0.9, y + h * 0.75); // 右下
                        ctx.lineTo(x + w * 0.5, y + h);        // 下中央
                        ctx.lineTo(x + w * 0.1, y + h * 0.75); // 左下
                        ctx.lineTo(x + w * 0.1, y + h * 0.25); // 左上
                        ctx.closePath();

                        // グラデーション背景
                        const gradient = ctx.createRadialGradient(
                            x + w / 2, y + h / 2, 0,
                            x + w / 2, y + h / 2, Math.max(w, h) / 2
                        );
                        gradient.addColorStop(0, 'rgba(255, 255, 250, 0.9)');
                        gradient.addColorStop(1, 'rgba(255, 240, 200, 0.6)');
                        ctx.fillStyle = gradient;
                        ctx.fill();

                        // 影
                        ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
                        ctx.shadowBlur = 15 * scale;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                    }

                    // テキストを描画
                    ctx.shadowColor = 'transparent';
                    ctx.fillStyle = isNewyear ? '#8B4513' : '#333';
                    ctx.font = `bold ${16 * scale}px 'M PLUS Rounded 1c', sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';

                    const nickname = card.querySelector('strong')?.textContent || '';
                    const messageParagraph = card.querySelector('p');

                    // <br>タグを改行文字に変換してテキストを取得
                    let message = '';
                    if (messageParagraph) {
                        // innerHTMLから<br>タグを\nに変換
                        message = messageParagraph.innerHTML
                            .replace(/<br\s*\/?>/gi, '\n')  // <br>を改行に
                            .replace(/<[^>]*>/g, '')        // 他のHTMLタグを削除
                            .trim();
                    }

                    // ニックネーム
                    ctx.fillText(nickname, x + w / 2, y + 20 * scale);

                    // メッセージ（改行対応 + 自動折り返し）
                    ctx.font = `${14 * scale}px 'M PLUS Rounded 1c', sans-serif`;
                    const maxWidth = w * 0.85; // カード幅の85%
                    const lineHeight = 20 * scale;
                    let currentY = y + 50 * scale;

                    // 改行で分割
                    const paragraphs = message.split('\n');

                    paragraphs.forEach(paragraph => {
                        if (!paragraph.trim()) {
                            // 空行の場合は行送りだけ
                            currentY += lineHeight;
                            return;
                        }

                        // 長い行を自動折り返し
                        const words = paragraph.split('');
                        let currentLine = '';

                        for (let i = 0; i < words.length; i++) {
                            const testLine = currentLine + words[i];
                            const metrics = ctx.measureText(testLine);

                            if (metrics.width > maxWidth && currentLine !== '') {
                                // 行が長すぎる場合、現在の行を描画して次の行へ
                                ctx.fillText(currentLine, x + w / 2, currentY);
                                currentY += lineHeight;
                                currentLine = words[i];
                            } else {
                                currentLine = testLine;
                            }
                        }

                        // 最後の行を描画
                        if (currentLine) {
                            ctx.fillText(currentLine, x + w / 2, currentY);
                            currentY += lineHeight;
                        }
                    });

                    ctx.restore();
                });

                // JPEG形式で圧縮（PNG→JPEGでファイルサイズを大幅削減）
                const dataURL = captureCanvas.toDataURL('image/jpeg', 0.85); // 品質85%
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const storageKey = `screenshot_${timestamp}`;

                // ファイルサイズを計算（Base64のサイズ ≈ 実際のサイズ * 0.75）
                const fileSizeKB = Math.round((dataURL.length * 0.75) / 1024);
                console.log(`スクリーンショットサイズ: ${fileSizeKB} KB`);

                try {
                    // LocalStorageの制限（5MB = 5120KB）を確認
                    if (fileSizeKB > 4000) {
                        // 4MB以上の場合はLocalStorageに保存せず、ダウンロードのみ
                        console.warn(`ファイルサイズが大きいため、LocalStorageに保存しません (${fileSizeKB} KB)`);

                        const link = document.createElement('a');
                        link.download = `wish-memory-${timestamp}.jpg`;
                        link.href = dataURL;
                        link.click();
                    } else {
                        // 4MB以下の場合はLocalStorageに保存
                        localStorage.setItem(storageKey, dataURL);
                        console.log(`LocalStorageに保存しました: ${storageKey} (${fileSizeKB} KB)`);

                        // ダウンロードも可能にする
                        const link = document.createElement('a');
                        link.download = `wish-memory-${timestamp}.jpg`;
                        link.href = dataURL;
                        link.click();
                    }
                } catch (e) {
                    console.error('LocalStorage保存エラー:', e, `(${fileSizeKB} KB)`);

                    // ダウンロードのみ
                    const link = document.createElement('a');
                    link.download = `wish-memory-${timestamp}.jpg`;
                    link.href = dataURL;
                    link.click();
                }

                // 元に戻す
                controls.forEach(control => {
                    control.style.visibility = '';
                });
                if (formWrapper && wasFormVisible) {
                    formWrapper.style.visibility = '';
                }
                if (introOverlay) {
                    introOverlay.style.visibility = '';
                }
            };

            bgImage.onerror = () => {
                console.error('背景画像の読み込みに失敗しました');

                // 元に戻す
                controls.forEach(control => {
                    control.style.visibility = '';
                });
                if (formWrapper && wasFormVisible) {
                    formWrapper.style.visibility = '';
                }
                if (introOverlay) {
                    introOverlay.style.visibility = '';
                }
            };

        } catch (error) {
            console.error('スクリーンショットエラー:', error);

            // エラー時も元に戻す
            controls.forEach(control => {
                control.style.visibility = '';
            });
            if (formWrapper && wasFormVisible) {
                formWrapper.style.visibility = '';
            }
            if (introOverlay) {
                introOverlay.style.visibility = '';
            }
        }
    }, 300);
}

// 雪のアニメーション
function initSnow() {
    const canvas = document.getElementById('snowCanvas');
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = [];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 3 + 1,
            d: Math.random() * particleCount
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.beginPath();
        for (let i = 0; i < particleCount; i++) {
            let p = particles[i];
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
        }
        ctx.fill();
        update();
        requestAnimationFrame(draw);
    }

    function update() {
        for (let i = 0; i < particleCount; i++) {
            let p = particles[i];
            p.y += Math.cos(p.d) + 1 + p.r / 2;
            p.x += Math.sin(p.d) * 2;

            if (p.x > width + 5 || p.x < -5 || p.y > height) {
                particles[i] = { x: Math.random() * width, y: -10, r: p.r, d: p.d };
            }
        }
    }
    draw();

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    });
}

// 太陽の光エフェクト（お正月モード用）
function initSunshine() {
    const canvas = document.getElementById('sunshineCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const rays = [];
    const rayCount = 40;

    // 光の粒子を生成
    for (let i = 0; i < rayCount; i++) {
        rays.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.3
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // 光の粒子を描画
        for (let i = 0; i < rayCount; i++) {
            let r = rays[i];
            ctx.fillStyle = `rgba(255, 215, 0, ${r.opacity})`;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
            ctx.fill();
        }

        update();
        requestAnimationFrame(draw);
    }

    function update() {
        for (let i = 0; i < rayCount; i++) {
            let r = rays[i];
            r.x += r.speedX;
            r.y += r.speedY;

            // 画面外に出たら反対側から再登場
            if (r.x > width) r.x = 0;
            if (r.x < 0) r.x = width;
            if (r.y > height) r.y = 0;
            if (r.y < 0) r.y = height;

            // 透明度をゆっくり変化
            r.opacity += (Math.random() - 0.5) * 0.02;
            if (r.opacity < 0.2) r.opacity = 0.2;
            if (r.opacity > 0.8) r.opacity = 0.8;
        }
    }

    draw();

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    });
}