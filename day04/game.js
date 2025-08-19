(function () {
    // ==== Конфиг ====
    const CFG   = window.NINJAGO_MEMORY_CONFIG || { COLS: 8, PAIRS: 32, BACK_ICON: "🌀" };
    const COLS  = CFG.COLS || 8;
    const PAIRS = CFG.PAIRS || 32;
    const BACK  = CFG.BACK_ICON || "🌀";

    // ==== UI ====
    const board   = document.getElementById('board');
    const movesEl = document.getElementById('moves');
    const pairsEl = document.getElementById('pairs');
    const totalEl = document.getElementById('total');
    const modalWin = document.getElementById('modal-win');

    totalEl.textContent = String(PAIRS);

    // ==== helpers ====
    const $ = (tag, cls, attrs={}) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v);
        return n;
    };
    const shuffle = arr => arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]);

    // ==== state ====
    let deck = [];           // [{id, src, idx}]
    let open = [];           // [{tile, id}]
    let moves = 0;
    let foundPairs = 0;
    let busy = false;

    function buildDeck() {
        // берём изображения 1..PAIRS (ожидаются в images/)
        const base = Array.from({length: PAIRS}, (_,i) => {
            const id = String(i+1);
            return { id, src: `images/${id}.png` };
        });

        // удваиваем и перемешиваем
        const doubled = base.flatMap((c, i) => [
            { id: c.id, src: c.src, idx: i*2 },
            { id: c.id, src: c.src, idx: i*2+1 }
        ]);
        deck = shuffle(doubled);
    }

    function renderBoard() {
        // установить число колонок
        board.style.setProperty('--cols', COLS);
        board.innerHTML = '';

        for (const card of deck) {
            const tile = $('button','card-tile', {'data-id':card.id, 'aria-label':'закрытая карта'});
            tile.type = 'button';

            const inner = $('div','card-inner');
            const back  = $('div','face back');  back.textContent = BACK;
            const front = $('div','face front');
            const img   = $('img','',{src: card.src, alt: `card ${card.id}`});
            front.appendChild(img);

            inner.append(back, front);
            tile.appendChild(inner);

            tile.addEventListener('click', () => onFlip(tile, card.id));

            board.appendChild(tile);
        }
    }

    function onFlip(tile, id) {
        if (busy) return;
        if (tile.classList.contains('is-open') || tile.classList.contains('is-matched')) return;

        tile.classList.add('is-open');
        open.push({ tile, id });

        if (open.length === 2) {
            busy = true;
            moves += 1; movesEl.textContent = String(moves);

            const [a, b] = open;
            if (a.id === b.id) {
                // совпадение
                setTimeout(() => {
                    a.tile.classList.remove('is-open'); a.tile.classList.add('is-matched');
                    b.tile.classList.remove('is-open'); b.tile.classList.add('is-matched');
                    open = []; busy = false;

                    foundPairs += 1; pairsEl.textContent = String(foundPairs);
                    if (foundPairs >= PAIRS) win();
                }, 220);
            } else {
                // не совпало — закрываем
                setTimeout(() => {
                    a.tile.classList.remove('is-open');
                    b.tile.classList.remove('is-open');
                    open = []; busy = false;
                }, 650);
            }
        }
    }

    function start() {
        open = []; moves = 0; foundPairs = 0; busy = false;
        movesEl.textContent = '0';
        pairsEl.textContent = '0';
        buildDeck();
        renderBoard();
    }

    function win() {
        // показать ключи
        const box = document.getElementById('keys-reveal');
        box.innerHTML = '';
        const keys = (window.NINJAGO_KEYS || []).filter(k => k && k.emoji && k.letter);
        const toShow = keys.slice(0, Math.max(1, Math.min(window.NINJAGO_REVEAL_COUNT || 1, keys.length)));
        if (!toShow.length) {
            const p = document.createElement('p');
            p.textContent = '🔒 Добавь ключи в keys.js (window.NINJAGO_KEYS).';
            box.appendChild(p);
        } else {
            for (const k of toShow) {
                const row = document.createElement('div');
                row.className = 'key';
                row.innerHTML = `
          <div class="emoji">${k.emoji}</div>
          <div class="letter">${k.letter}</div>
        `;
                box.appendChild(row);
            }
        }

        modalWin.querySelector('[data-bind="final-moves"]').textContent = String(moves);
        modalWin.showModal();
        modalWin.addEventListener('close', () => {
            if (modalWin.returnValue === 'restart') start();
        }, { once: true });
    }

    // go
    start();
})();
