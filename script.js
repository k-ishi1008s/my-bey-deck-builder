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
function renderDeckBuilder() {
    deckBuilderArea.innerHTML = '';

    const deckNameInput = document.createElement('div');
    deckNameInput.innerHTML = `
        <label for="deck-name">デッキ名: </label>
        <input type="text" id="deck-name" placeholder="2025年夏大会用デッキ">
    `;
    deckBuilderArea.appendChild(deckNameInput);

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
            // ★追加：ラチェットフィルターの呼び出し
            renderRatchetFilters(filterContainer, resultsContainer);
            renderPartButtons(partsData.ratchets, resultsContainer, 'ratchet');
            break;
        case 'bit':
            renderBitFilters(filterContainer, resultsContainer);
            renderPartButtons(partsData.bits, resultsContainer, 'bit');
            break;
    }
}

// ★追加：ラチェット用のフィルターUIを作る
function renderRatchetFilters(filterContainer, resultsContainer) {
    filterContainer.innerHTML = '<h4>ラチェットで絞り込み</h4>';

    // 歯の数と高さのユニークな値を取得してソート
    const teeth = [...new Set(partsData.ratchets.map(r => r.teeth).filter(t => t !== null && t !== 'M'))].sort((a, b) => a - b);
    const heights = [...new Set(partsData.ratchets.map(r => r.height).filter(h => h !== null))].sort((a, b) => a - b);

    // 歯の数フィルター
    const teethDiv = document.createElement('div');
    teethDiv.innerHTML = '<strong>歯の数:</strong> ';
    teeth.forEach(t => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" name="teeth" value="${t}"> ${t}`;
        teethDiv.appendChild(label);
    });
    filterContainer.appendChild(teethDiv);

    // 高さフィルター
    const heightDiv = document.createElement('div');
    heightDiv.innerHTML = '<strong>高さ:</strong> ';
    heights.forEach(h => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" name="height" value="${h}"> ${h}`;
        heightDiv.appendChild(label);
    });
    filterContainer.appendChild(heightDiv);

    // フィルターイベント
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

// ビット用のフィルターUI（チェックボックス）を作る
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

// ブレード用のフィルターUIを作る
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


// パーツのボタンリストを作る
function renderPartButtons(parts, container, partType) {
    container.innerHTML = '';
    parts.forEach(part => {
        const button = document.createElement('button');
        button.textContent = part.name;
        button.addEventListener('click', () => selectPart(part, partType));
        container.appendChild(button);
    });
}

// CXパーツの選択UIを作る
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

// select要素とoption要素を作る補助関数
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

// パーツ選択時の処理
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
    renderDeckBuilder();
}


// --- 保存・読み込み・削除の機能（変更なし） ---
function saveDeck() {
    const deckName = document.getElementById('deck-name').value;
    if (!deckName) {
        alert('デッキ名を入力してください。');
        return;
    }
    const isComplete = currentDeck.every(bey => bey.blade && bey.ratchet && bey.bit);
    if (!isComplete) {
        alert('すべてのパーツを選択してください。');
        return;
    }
    const savedDecks = JSON.parse(localStorage.getItem('beyDecks')) || [];
    savedDecks.push({ name: deckName, bays: currentDeck });
    localStorage.setItem('beyDecks', JSON.stringify(savedDecks));
    alert('デッキを保存しました！');
    currentDeck = [ { blade: null, ratchet: null, bit: null }, { blade: null, ratchet: null, bit: null }, { blade: null, ratchet: null, bit: null } ];
    renderDeckBuilder();
    renderSavedDecks();
}
function renderSavedDecks() {
    deckListArea.innerHTML = '';
    const savedDecks = JSON.parse(localStorage.getItem('beyDecks')) || [];
    savedDecks.forEach((deck, index) => {
        const deckEl = document.createElement('div');
        deckEl.classList.add('saved-deck');
        let deckHTML = `<h3>${deck.name}</h3>`;
        deck.bays.forEach((bey, beyIndex) => {
            deckHTML += `<p>ベイ${beyIndex + 1}: ${bey.blade} / ${bey.ratchet} / ${bey.bit}</p>`;
        });
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.addEventListener('click', () => deleteDeck(index));
        deckEl.innerHTML = deckHTML;
        deckEl.appendChild(deleteButton);
        deckListArea.appendChild(deckEl);
    });
}
function deleteDeck(deckIndex) {
    const savedDecks = JSON.parse(localStorage.getItem('beyDecks')) || [];
    savedDecks.splice(deckIndex, 1);
    localStorage.setItem('beyDecks', JSON.stringify(savedDecks));
    renderSavedDecks();
}