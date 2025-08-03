let partsData = {};

const form = document.getElementById('add-parts-form');
const partTypeSelect = document.getElementById('part-type');
const partNameInput = document.getElementById('part-name');
const additionalFields = document.getElementById('additional-fields');
const generateButton = document.getElementById('generate-json-button');
const outputTextarea = document.getElementById('output-json');

// 初期データの読み込み
async function loadInitialData() {
    try {
        const response = await fetch('parts_database.json');
        partsData = await response.json();
        console.log('現在のデータを読み込みました。');
    } catch (error) {
        console.error('データの読み込みに失敗しました。空のデータから開始します。', error);
        // ファイルが存在しないか空の場合の初期データ構造
        partsData = { blades: [], cx_parts: { lock_chips: [], main_blades: [], assist_blades: [] }, ratchets: [], bits: [] };
    }
}

// パーツ種別に応じて追加の入力欄を切り替え
partTypeSelect.addEventListener('change', () => {
    const type = partTypeSelect.value;
    additionalFields.innerHTML = ''; // リセット
    if (type === 'blades') {
        additionalFields.innerHTML = `
            <label>カテゴリ:</label>
            <input type="text" id="blade-category" placeholder="例: BX">
        `;
    } else if (type === 'ratchets') {
        additionalFields.innerHTML = `
            <label>歯の数:</label> <input type="number" id="ratchet-teeth">
            <label>高さ:</label> <input type="number" id="ratchet-height">
        `;
    } else if (type === 'bits') {
        additionalFields.innerHTML = `
            <label>タイプ:</label>
            <input type="text" id="bit-type" placeholder="例: アタック">
        `;
    }
});

// フォーム送信時の処理
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const type = partTypeSelect.value;
    const name = partNameInput.value;

    // ★追加：重複チェック
    const isDuplicate = partsData[type].some(part => part.name === name);
    if (isDuplicate) {
        alert(`エラー: 「${name}」はすでに登録されています。`);
        return; // 重複している場合は処理を中断
    }

    const newPart = { name: name };

    if (type === 'blades') {
        newPart.category = document.getElementById('blade-category').value;
    } else if (type === 'ratchets') {
        newPart.teeth = parseInt(document.getElementById('ratchet-teeth').value);
        newPart.height = parseInt(document.getElementById('ratchet-height').value);
    } else if (type === 'bits') {
        newPart.type = document.getElementById('bit-type').value;
    }

    partsData[type].push(newPart);
    alert(`${newPart.name} を追加しました！\n最後に「JSONを生成」ボタンを押して更新を完了してください。`);
    form.reset();
    partTypeSelect.dispatchEvent(new Event('change'));
});

// JSON生成ボタンの処理
generateButton.addEventListener('click', () => {
    // JSON.stringifyの第3引数に2を指定すると、見やすく整形される
    outputTextarea.value = JSON.stringify(partsData, null, 2);
    outputTextarea.style.height = '400px'; // 見やすいように高さを広げる
    alert('JSONを生成しました。テキストエリアの内容をすべてコピーしてください。');
});

// 最初にデータを読み込む
loadInitialData();
// 初期表示のためにイベントを発火
partTypeSelect.dispatchEvent(new Event('change'));