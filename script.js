// HTMLの各エリアを、JavaScriptで操作できるよう変数に入れておく
const deckBuilderArea = document.getElementById('deck-builder-area');
const partsSelectorArea = document.getElementById('parts-selector-area');
const deckListArea = document.getElementById('deck-list-area');

// 読み込んだパーツデータを保存しておくための変数
let partsData = {};
// 現在カスタマイズ中のベイブレードの状態を保存する変数
let currentDeck = [
    { blade: null, ratchet: null, bit: null },
    { blade: null, ratchet: null, bit: null },
    { blade: null, ratchet: null, bit: null },
];
// どのベイのどのパーツを選択中か覚えておくための変数
let activeSelection = { beyIndex: null, partType: null };

// サイトが読み込まれたら、最初に実行される処理
document.addEventListener('DOMContentLoaded', () => {
    loadPartsData();
    renderSavedDecks();
});

// JSONファイルを読み込む関数
async function loadPartsData() {
    const response = await fetch('parts_database.json');
    partsData = await response.json();
    renderDeckBuilder();
}

// デッキカスタマイズエリアの表示を作る関数
function renderDeckBuilder(folderToSelectId = null) {
    const deckNameInput = document.getElementById('deck-name');
    const currentDeckName = deckNameInput ? deckNameInput.value : '';

    // どのフォルダを選択すべきか決定するロジック
    let currentFolderId;
    if (folderToSelectId) {
        // 引数でIDが指定されていれば、それを優先する
        currentFolderId = folderToSelectId;
    } else {
        // 指定がなければ、現在の選択状態を維持する
        const folderSelect = document.getElementById('folder-context-select');
        currentFolderId = folderSelect ? folderSelect.value : 'uncategorized';
    }

    deckBuilderArea.innerHTML = '';

    // フォルダ作成、フォルダ選択、デッキ名を一つのコンテナにまとめる
    const topControlsContainer = document.createElement('div');
    topControlsContainer.id = 'top-controls-container';
    deckBuilderArea.appendChild(topControlsContainer);

    // 要素を生成する順番を変更
    const savedData = JSON.parse(localStorage.getItem('beyDecks')) || { folders: [], uncategorized: [] };
    
    let optionsHTML = `<option value="uncategorized">未分類</option>`;
    savedData.folders.forEach(folder => {
        optionsHTML += `<option value="${folder.id}">${folder.name}</option>`;
    });

    topControlsContainer.innerHTML = `
        <button id="context-create-folder-button">＋ 新しいフォルダを作成</button>
        <select id="folder-context-select">${optionsHTML}</select>
        <input type="text" id="deck-name" placeholder="デッキ名を入力" value="${currentDeckName}">
    `;
    
    // イベントリスナーをここで設定
    topControlsContainer.querySelector('#context-create-folder-button').addEventListener('click', () => {
        const folderName = prompt('新しいフォルダ名を入力してください:');
        if (folderName) {
            createNewFolder(folderName);
        }
    });

    // 決定したIDで選択状態を復元
    topControlsContainer.querySelector('#folder-context-select').value = currentFolderId;

    // ベイブレード3機分のスロットを生成
    for (let i = 0; i < 3; i++) {
        const beybladeSlot = document.createElement('div');
        beybladeSlot.classList.add('beyblade-slot');
        beybladeSlot.innerHTML = `
            <h3>ベイ ${i + 1}</h3>
            <div class="parts-display">
                <span class="part-button" id="bey${i}-blade" data-bey-index="${i}" data-part-type="blade">${currentDeck[i].blade || 'ブレード'}</span>
                <span class="part-button" id="bey${i}-ratchet" data-bey-index="${i}" data-part-type="ratchet">${currentDeck[i].ratchet || 'ラチェット'}</span>
                <span class="part-button" id="bey${i}-bit" data-bey-index="${i}" data-part-type="bit">${currentDeck[i].bit || 'ビット'}</span>
            </div>
        `;
        deckBuilderArea.appendChild(beybladeSlot);
    }
    
    document.querySelectorAll('.part-button').forEach(button => {
        button.addEventListener('click', (event) => {
            activeSelection.beyIndex = event.target.dataset.beyIndex;
            activeSelection.partType = event.target.dataset.partType;
            showPartsSelector();
        });
    });

    const saveButton = document.createElement('button');
    saveButton.id = 'save-deck-button';
    saveButton.textContent = 'このデッキを記録する';
    saveButton.addEventListener('click', saveDeck);
    deckBuilderArea.appendChild(saveButton);
}

// パーツ選択エリアの表示を、フィルター形式に変更
function showPartsSelector() {
    partsSelectorArea.innerHTML = '';
    const { partType } = activeSelection;

    const filterContainer = document.createElement('div');
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'parts-results';
    
    partsSelectorArea.appendChild(filterContainer);
    partsSelectorArea.appendChild(resultsContainer);

    switch (partType) {
        case 'blade':
            renderBladeFilters(filterContainer, resultsContainer);
            renderPartButtons(partsData.blades, resultsContainer, 'blade');
            break;
        case 'ratchet':
            renderRatchetFilters(filterContainer, resultsContainer);
            renderPartButtons(partsData.ratchets, resultsContainer, 'ratchet');
            break;
        case 'bit':
            renderBitFilters(filterContainer, resultsContainer);
            renderPartButtons(partsData.bits, resultsContainer, 'bit');
            break;
    }
}

function renderRatchetFilters(filterContainer, resultsContainer) {
    filterContainer.innerHTML = '<h4>ラチェットで絞り込み</h4>';
    const teeth = [...new Set(partsData.ratchets.map(r => r.teeth).filter(t => t !== null && t !== 'M'))].sort((a, b) => a - b);
    const heights = [...new Set(partsData.ratchets.map(r => r.height).filter(h => h !== null))].sort((a, b) => a - b);
    const teethDiv = document.createElement('div');
    teethDiv.innerHTML = '<strong>歯の数:</strong> ';
    teeth.forEach(t => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" name="teeth" value="${t}"> ${t}`;
        teethDiv.appendChild(label);
    });
    filterContainer.appendChild(teethDiv);
    const heightDiv = document.createElement('div');
    heightDiv.innerHTML = '<strong>高さ:</strong> ';
    heights.forEach(h => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" name="height" value="${h}"> ${h}`;
        heightDiv.appendChild(label);
    });
    filterContainer.appendChild(heightDiv);
    filterContainer.addEventListener('change', () => {
        const checkedTeeth = Array.from(filterContainer.querySelectorAll('input[name="teeth"]:checked')).map(cb => parseInt(cb.value));
        const checkedHeights = Array.from(filterContainer.querySelectorAll('input[name="height"]:checked')).map(cb => parseInt(cb.value));
        let filteredRatchets = partsData.ratchets;
        if (checkedTeeth.length > 0) {
            filteredRatchets = filteredRatchets.filter(r => checkedTeeth.includes(r.teeth));
        }
        if (checkedHeights.length > 0) {
            filteredRatchets = filteredRatchets.filter(r => checkedHeights.includes(r.height));
        }
        renderPartButtons(filteredRatchets, resultsContainer, 'ratchet');
    });
}

function renderBitFilters(filterContainer, resultsContainer) {
    filterContainer.innerHTML = '<h4>タイプで絞り込み</h4>';
    const types = ['アタック', 'ディフェンス', 'スタミナ', 'バランス'];
    types.forEach(type => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${type}"> ${type}`;
        filterContainer.appendChild(label);
    });
    filterContainer.addEventListener('change', () => {
        const checkedTypes = Array.from(filterContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        const filteredBits = (checkedTypes.length > 0)
            ? partsData.bits.filter(bit => checkedTypes.includes(bit.type))
            : partsData.bits;
        renderPartButtons(filteredBits, resultsContainer, 'bit');
    });
}

function renderBladeFilters(filterContainer, resultsContainer) {
    filterContainer.innerHTML = '<h4>カテゴリで絞り込み</h4>';
    const categories = ['BX', 'UX', 'SP'];
    categories.forEach(cat => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${cat}"> ${cat}`;
        filterContainer.appendChild(label);
    });
    const cxButton = document.createElement('button');
    cxButton.textContent = 'CX';
    cxButton.addEventListener('click', () => renderCXSelector(resultsContainer));
    filterContainer.appendChild(cxButton);
    filterContainer.addEventListener('change', () => {
        const checkedCats = Array.from(filterContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        const filteredBlades = (checkedCats.length > 0)
            ? partsData.blades.filter(blade => checkedCats.includes(blade.category))
            : partsData.blades;
        renderPartButtons(filteredBlades, resultsContainer, 'blade');
    });
}

function renderPartButtons(parts, container, partType) {
    container.innerHTML = '';
    parts.forEach(part => {
        const button = document.createElement('button');
        button.textContent = part.name;
        button.addEventListener('click', () => selectPart(part, partType));
        container.appendChild(button);
    });
}

function renderCXSelector(container) {
    container.innerHTML = '<h4>CXパーツ選択</h4>';
    const { lock_chips, main_blades, assist_blades } = partsData.cx_parts;
    const lockChipSelect = createSelect(lock_chips);
    const mainBladeSelect = createSelect(main_blades);
    const assistBladeSelect = createSelect(assist_blades);
    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'この組み合わせで決定';
    confirmButton.addEventListener('click', () => {
        const combinedName = `CX: ${lockChipSelect.value}-${mainBladeSelect.value}-${assistBladeSelect.value}`;
        selectPart({ name: combinedName }, 'blade');
    });
    container.append(lockChipSelect, mainBladeSelect, assistBladeSelect, confirmButton);
}

function createSelect(parts) {
    const select = document.createElement('select');
    parts.forEach(part => {
        const option = document.createElement('option');
        option.value = part.name;
        option.textContent = part.name;
        select.appendChild(option);
    });
    return select;
}

function selectPart(part, partType) {
    const { beyIndex } = activeSelection;
    let displayName = part.name;

    if (partType === 'blade' && part.category) {
        if (part.category === 'BX' || part.category === 'UX') {
            displayName = `${part.category}: ${part.name}`;
        }
    }
    
    currentDeck[beyIndex][partType] = displayName;
    partsSelectorArea.innerHTML = '';
    renderDeckBuilder(); // 画面を再描画
}

// 保存ロジックは前回要望の「1つでも保存できる」形を維持
// saveDeck関数
function saveDeck() {
    // ★追加：どのフォルダが選択されているかを取得
    const selectedFolderId = document.getElementById('folder-context-select').value;

    const deckName = document.getElementById('deck-name').value;
    if (!deckName) {
        alert('デッキ名を入力してください。');
        return;
    }
    const completedBays = currentDeck.filter(bey => bey.blade && bey.ratchet && bey.bit);
    if (completedBays.length === 0) {
        alert('パーツがすべて揃っているベイが1つもありません。');
        return;
    }

    const savedData = JSON.parse(localStorage.getItem('beyDecks')) || { folders: [], uncategorized: [] };
    const newDeck = { name: deckName, bays: completedBays };

    // ★変更：選択されたフォルダに直接保存するロジック
    if (selectedFolderId === 'uncategorized') {
        savedData.uncategorized.push(newDeck);
    } else {
        const folder = savedData.folders.find(f => f.id === parseInt(selectedFolderId));
        if (folder) {
            folder.decks.push(newDeck);
        } else {
            alert('エラー: 保存先のフォルダが見つかりません。');
            return;
        }
    }
    
    localStorage.setItem('beyDecks', JSON.stringify(savedData));
    alert('デッキを保存しました！');
    
    currentDeck = [ { blade: null, ratchet: null, bit: null }, { blade: null, ratchet: null, bit: null }, { blade: null, ratchet: null, bit: null } ];
    document.getElementById('deck-name').value = ''; 
    renderDeckBuilder();
    renderSavedDecks();
}

//デッキ保存
// renderSavedDecks関数
function renderSavedDecks() {
    const buttonContainer = document.getElementById('create-folder-button').parentElement;
    // 既に追加されていないかチェック
    if (!document.getElementById('export-txt-button')) {
        buttonContainer.insertAdjacentHTML('beforeend', `
            <button id="export-txt-button">TXT形式で書き出す</button>
            <button id="export-csv-button">CSV形式で書き出す (Excel用)</button>
        `);
        // ボタンにイベントリスナーを再設定
        setupExportListeners();
    }

    const foldersContainer = document.getElementById('folders-container');
    const uncategorizedContainer = document.getElementById('uncategorized-container');
    
    foldersContainer.innerHTML = '';
    uncategorizedContainer.innerHTML = '';

    const savedData = JSON.parse(localStorage.getItem('beyDecks')) || { folders: [], uncategorized: [] };

    // フォルダの表示
    if (savedData.folders && savedData.folders.length > 0) {
        savedData.folders.forEach(folder => {
            const folderEl = document.createElement('details');
            folderEl.classList.add('folder');
            
            // ★変更：フォルダ名の部分にボタンを追加
            folderEl.innerHTML = `
                <summary>
                    <span>${folder.name}</span>
                    <div class="folder-buttons">
                        <button class="rename-folder-button">✏️</button>
                        <button class="delete-folder-button">🗑️</button>
                    </div>
                </summary>
            `;
            
            folder.decks.forEach((deck, index) => {
                const deckEl = createDeckElement(deck, index, 'folder', folder.id);
                folderEl.appendChild(deckEl);
            });

            // ★追加：ボタンにイベントリスナーを設定
            folderEl.querySelector('.rename-folder-button').addEventListener('click', (e) => {
                e.preventDefault(); // detailsの開閉をキャンセル
                renameFolder(folder.id, folder.name);
            });
            folderEl.querySelector('.delete-folder-button').addEventListener('click', (e) => {
                e.preventDefault(); // detailsの開閉をキャンセル
                deleteFolder(folder.id, folder.name);
            });

            foldersContainer.appendChild(folderEl);
        });
    }

    // 未分類のデッキを表示 (この部分は変更なし)
    if (savedData.uncategorized && savedData.uncategorized.length > 0) {
        const uncategorizedHeader = document.createElement('h3');
        uncategorizedHeader.textContent = '未分類のデッキ';
        uncategorizedContainer.appendChild(uncategorizedHeader);

        savedData.uncategorized.forEach((deck, index) => {
            const deckEl = createDeckElement(deck, index, 'uncategorized');
            uncategorizedContainer.appendChild(deckEl);
        });
    }
}

// デッキのHTML要素を生成する補助関数（新設）
function createDeckElement(deck, index, folderKey, folderId = null) {
    const deckEl = document.createElement('div');
    deckEl.classList.add('saved-deck');
    let deckHTML = `<h3>${deck.name}</h3>`;
    deck.bays.forEach((bey, beyIndex) => {
        deckHTML += `<p>ベイ${beyIndex + 1}: ${bey.blade} / ${bey.ratchet} / ${bey.bit}</p>`;
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '削除';
    deleteButton.classList.add('delete-button');
    deleteButton.addEventListener('click', () => deleteDeck(index, folderKey, folderId));
    
    const copyButton = document.createElement('button');
    copyButton.textContent = 'コピー';
    copyButton.classList.add('copy-button');
    copyButton.addEventListener('click', () => copyDeck(deck));

    // ★ここから追記
    const moveButton = document.createElement('button');
    moveButton.textContent = '移動';
    moveButton.classList.add('move-button');
    moveButton.addEventListener('click', () => showMoveOptions(deck, index, folderKey, folderId));
    // ★ここまで追記

    deckEl.innerHTML = deckHTML;
    deckEl.appendChild(deleteButton);
    deckEl.appendChild(copyButton);
    deckEl.appendChild(moveButton); // ★追記：移動ボタンを要素に追加
    return deckEl;
}

//デッキ削除
function deleteDeck(deckIndex, folderKey, folderId) {
    const savedData = JSON.parse(localStorage.getItem('beyDecks')) || { folders: [], uncategorized: [] }
    if (folderKey === 'uncategorized') {
        savedData.uncategorized.splice(deckIndex, 1);
    } else if (folderKey === 'folder') {
        const folder = savedData.folders.find(f => f.id === folderId);
        if (folder) {
            folder.decks.splice(deckIndex, 1);
        }
    }
    localStorage.setItem('beyDecks', JSON.stringify(savedData));
    renderSavedDecks(); // リストを再描画
}

//デッキコピー
function copyDeck(deck) {
    // デッキ名をコピー元が分かるように変更
    document.getElementById('deck-name').value = `${deck.name} のコピー`;
    // currentDeckを一旦リセット
    currentDeck = [
        { blade: null, ratchet: null, bit: null },
        { blade: null, ratchet: null, bit: null },
        { blade: null, ratchet: null, bit: null },
    ];
    // コピー元のデッキ情報をcurrentDeckに反映
    deck.bays.forEach((bey, index) => {
        if (index < 3) { // 3機まで
            currentDeck[index] = { ...bey };
        }
    });
    // デッキビルダーを再描画して画面に反映
    renderDeckBuilder();
    // ページ上部にスクロールして、編集しやすくする
    window.scrollTo(0, 0);
    alert('デッキをカスタマイズエリアにコピーしました。');
}

function setupExportListeners() {
    // TXT形式で書き出すボタンの処理
    document.getElementById('export-txt-button').addEventListener('click', () => {
        // ★修正点：ここでデータを再取得する
        const savedData = JSON.parse(localStorage.getItem('beyDecks')) || { folders: [], uncategorized: [] };
        
        if (savedData.folders.length === 0 && savedData.uncategorized.length === 0) {
            alert('書き出すデッキがありません。');
            return;
        }

        let textContent = "ベイブレードX デッキレシピ一覧\n\n";

        // フォルダ内のデッキ
        savedData.folders.forEach(folder => {
            textContent += `【${folder.name}】\n`;
            folder.decks.forEach(deck => {
                textContent += `■ デッキ名: ${deck.name}\n`;
                deck.bays.forEach((bey, index) => {
                    textContent += `  ベイ${index + 1}: ${bey.blade} / ${bey.ratchet} / ${bey.bit}\n`;
                });
                textContent += "\n";
            });
        });

        // 未分類のデッキ
        if (savedData.uncategorized.length > 0) {
            textContent += `【未分類のデッキ】\n`;
            savedData.uncategorized.forEach(deck => {
                textContent += `■ デッキ名: ${deck.name}\n`;
                deck.bays.forEach((bey, index) => {
                    textContent += `  ベイ${index + 1}: ${bey.blade} / ${bey.ratchet} / ${bey.bit}\n`;
                });
                textContent += "\n";
            });
        }

        downloadFile(textContent, 'bey-decks.txt', 'text/plain');
    });

    // CSV形式で書き出すボタンの処理
    document.getElementById('export-csv-button').addEventListener('click', () => {
        // ★修正点：ここでデータを再取得する
        const savedData = JSON.parse(localStorage.getItem('beyDecks')) || { folders: [], uncategorized: [] };

        if (savedData.folders.length === 0 && savedData.uncategorized.length === 0) {
            alert('書き出すデッキがありません。');
            return;
        }

        let csvContent = "フォルダ名,デッキ名,ベイ1 ブレード,ベイ1 ラチェット,ベイ1 ビット,ベイ2 ブレード,ベイ2 ラチェット,ベイ2 ビット,ベイ3 ブレード,ベイ3 ラチェット,ベイ3 ビット\n";

        // フォルダ内のデッキ
        savedData.folders.forEach(folder => {
            folder.decks.forEach(deck => {
                let row = [folder.name, deck.name];
                for (let i = 0; i < 3; i++) {
                    if (deck.bays[i]) {
                        row.push(deck.bays[i].blade, deck.bays[i].ratchet, deck.bays[i].bit);
                    } else {
                        row.push('', '', '');
                    }
                }
                // 各項目をダブルクォーテーションで囲む
                csvContent += row.map(item => `"${(item || '').replace(/"/g, '""')}"`).join(',') + "\n";
            });
        });

        // 未分類のデッキ
        savedData.uncategorized.forEach(deck => {
            let row = ["未分類", deck.name];
            for (let i = 0; i < 3; i++) {
                if (deck.bays[i]) {
                    row.push(deck.bays[i].blade, deck.bays[i].ratchet, deck.bays[i].bit);
                } else {
                    row.push('', '', '');
                }
            }
            csvContent += row.map(item => `"${(item || '').replace(/"/g, '""')}"`).join(',') + "\n";
        });

        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadFile(blob, 'bey-decks.csv');
    });
}

// ファイルをダウンロードさせるための補助関数
function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const isBlob = content instanceof Blob;
    const file = isBlob ? content : new Blob([content], { type: contentType });

    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

// 古いデータ形式から新しいフォルダ形式へ移行するための関数
function migrateData() {
    const oldData = localStorage.getItem('beyDecks');
    
    // 古いデータが存在し、かつ、それが配列（フォルダ形式ではない）の場合
    if (oldData && Array.isArray(JSON.parse(oldData))) {
        console.log('古いデータ形式を検出しました。新しい形式に移行します。');
        const decks = JSON.parse(oldData);
        const newData = {
            folders: [],
            uncategorized: decks
        };
        localStorage.setItem('beyDecks', JSON.stringify(newData));
        alert('データ構造を新しいフォルダ形式に更新しました。');
    }
}

// ページ読み込み時にデータ移行処理を実行
migrateData();

// 「新しいフォルダを作成」ボタンの処理
document.getElementById('create-folder-button').addEventListener('click', () => {
    const folderName = prompt('新しいフォルダ名を入力してください:');
    if (folderName) {
        createNewFolder(folderName);
    }
});

// 新しいフォルダを作る関数
function createNewFolder(name) {
    const savedData = JSON.parse(localStorage.getItem('beyDecks')) || { folders: [], uncategorized: [] };
    
    const newFolder = {
        id: Date.now(),
        name: name,
        decks: []
    };

    savedData.folders.push(newFolder);
    localStorage.setItem('beyDecks', JSON.stringify(savedData));
    
    // ★新しく作ったフォルダのIDを引数として渡す
    renderDeckBuilder(newFolder.id);
    
    alert(`フォルダ「${name}」を作成しました。`);
}


// デッキの移動先フォルダを選択するUIを表示する関数
function showMoveOptions(deck, fromIndex, fromFolderKey, fromFolderId) {
    const savedData = JSON.parse(localStorage.getItem('beyDecks')) || { folders: [], uncategorized: [] };
    
    // 移動先の選択肢を生成
    let optionsHTML = `<option value="uncategorized">未分類</option>`;
    savedData.folders.forEach(folder => {
        optionsHTML += `<option value="${folder.id}">${folder.name}</option>`;
    });

    const modalHTML = `
        <div id="move-modal" class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h4>「${deck.name}」の移動先を選択</h4>
                <select id="folder-select">${optionsHTML}</select>
                <button id="confirm-move">ここに移動</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('move-modal');
    modal.style.display = 'block';

    // モーダルを閉じる処理
    modal.querySelector('.close-button').onclick = () => modal.remove();
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.remove();
        }
    };

    // 「ここに移動」ボタンの処理
    document.getElementById('confirm-move').addEventListener('click', () => {
        const select = document.getElementById('folder-select');
        const toFolderId = select.value;
        moveDeck(deck, fromIndex, fromFolderKey, fromFolderId, toFolderId);
        modal.remove();
    });
}

// デッキを実際に移動させる関数
function moveDeck(deckToMove, fromIndex, fromFolderKey, fromFolderId, toFolderId) {
    const savedData = JSON.parse(localStorage.getItem('beyDecks')) || { folders: [], uncategorized: [] };

    // 1. 元の場所からデッキを削除
    if (fromFolderKey === 'uncategorized') {
        savedData.uncategorized.splice(fromIndex, 1);
    } else {
        const folder = savedData.folders.find(f => f.id === fromFolderId);
        if (folder) {
            folder.decks.splice(fromIndex, 1);
        }
    }

    // 2. 新しい場所にデッキを追加
    if (toFolderId === 'uncategorized') {
        savedData.uncategorized.push(deckToMove);
    } else {
        const folder = savedData.folders.find(f => f.id === parseInt(toFolderId));
        if (folder) {
            folder.decks.push(deckToMove);
        }
    }

    localStorage.setItem('beyDecks', JSON.stringify(savedData));
    renderSavedDecks();
    alert('デッキを移動しました。');
}

// フォルダ選択UIを描画する関数
function renderFolderContext() {
    const container = document.getElementById('context-container');
    const savedData = JSON.parse(localStorage.getItem('beyDecks')) || { folders: [], uncategorized: [] };
    
    let optionsHTML = `<option value="uncategorized">未分類</option>`;
    savedData.folders.forEach(folder => {
        optionsHTML += `<option value="${folder.id}">${folder.name}</option>`;
    });

    container.innerHTML = `
        <label for="folder-context-select">現在の作業フォルダ:</label>
        <select id="folder-context-select">${optionsHTML}</select>
        <button id="context-create-folder-button">＋</button>
    `;

    document.getElementById('context-create-folder-button').addEventListener('click', () => {
        const folderName = prompt('新しいフォルダ名を入力してください:');
        if (folderName) {
            createNewFolder(folderName);
            // 作成後、すぐにフォルダ選択UIも更新
            renderFolderContext(); 
        }
    });
}

// フォルダ名を変更する関数
function renameFolder(folderId, currentName) {
    const newName = prompt('新しいフォルダ名を入力してください:', currentName);
    if (newName && newName !== currentName) {
        const savedData = JSON.parse(localStorage.getItem('beyDecks'));
        const folder = savedData.folders.find(f => f.id === folderId);
        if (folder) {
            folder.name = newName;
            localStorage.setItem('beyDecks', JSON.stringify(savedData));
            renderSavedDecks();
            renderDeckBuilder(); // 上の選択肢も更新
        }
    }
}

// フォルダを削除する関数
function deleteFolder(folderId, folderName) {
    const confirmation = confirm(`フォルダ「${folderName}」を削除しますか？\n（中のデッキは「未分類」に移動します）`);
    if (confirmation) {
        const savedData = JSON.parse(localStorage.getItem('beyDecks'));
        const folderIndex = savedData.folders.findIndex(f => f.id === folderId);
        
        if (folderIndex > -1) {
            // フォルダ内のデッキを「未分類」に移動
            const decksToMove = savedData.folders[folderIndex].decks;
            savedData.uncategorized.push(...decksToMove);

            // フォルダを削除
            savedData.folders.splice(folderIndex, 1);

            localStorage.setItem('beyDecks', JSON.stringify(savedData));
            renderSavedDecks();
            renderDeckBuilder(); // 上の選択肢も更新
        }
    }
}