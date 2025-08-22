(function () {
    const characters = window.NINJAGO_CHARACTERS || [];
    const imgEl      = document.getElementById('charImg');
    const progressEl = document.getElementById('progress');
    const promptEl   = document.getElementById('prompt');
    const micBtn     = document.getElementById('micBtn');
    const repeatBtn  = document.getElementById('repeatBtn');
    const heardEl    = document.getElementById('heard');
    const feedbackEl = document.getElementById('feedback');
    const winModal   = document.getElementById('modal-win');
    const appRoot    = document.body;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!SpeechRec;
    if (!supported) {
        appRoot.classList.add('unsupported');
        document.getElementById('supportBadge').textContent = '🎤✖︎';
        feedback('Ваш браузер не поддерживает распознавание речи. Попробуйте Chrome/Edge на смартфоне.', 'err');
    } else {
        document.getElementById('supportBadge').textContent = '🎤✔︎';
    }

    const normalize = (s) => (s || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    function feedback(text, type) {
        feedbackEl.textContent = text;
        feedbackEl.classList.remove('ok','err');
        if (type) feedbackEl.classList.add(type);
    }

    function speak(text) {
        try {
            if (!('speechSynthesis' in window)) return;
            speechSynthesis.cancel();            // на всякий случай гасим предыдущую озвучку
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'ru-RU';
            u.rate = 1;
            window.speechSynthesis.speak(u);
        } catch (_) {}
    }

    let idx = 0;
    let listening = false;
    let recognizer = null;

    function showCurrent() {
        const c = characters[idx];
        imgEl.src = c.src;
        imgEl.alt = c.name;
        progressEl.textContent = String(idx);
        //promptEl.textContent = 'Нажми на микрофон и скажи: ' + c.name;
        heardEl.textContent = '—';
        feedback('Готов к началу', null);
    }

    function startGame() {
        idx = 0;
        progressEl.textContent = '0';
        showCurrent();
    }

    function next() {
        idx += 1;
        progressEl.textContent = String(idx);
        if (idx >= characters.length) {
            // === Победа ===
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

            winModal.showModal();
            winModal.addEventListener('close', () => {
                if (winModal.returnValue === 'restart') startGame();
            }, { once: true });
            return;
        }
        showCurrent();
    }

    function speakHint() {
        const c = characters[idx];
        const utt = new SpeechSynthesisUtterance();
        utt.text = `Скажи: ${c.name}`;
        utt.lang = 'ru-RU';
        speechSynthesis.cancel();
        speechSynthesis.speak(utt);
    }

    function startListening() {
        if (!supported || listening) return;
        listening = true;

        // Важно: если перед этим озвучивали подсказку — выключим TTS,
        // иначе движок захватывает аудио-выход и может «глушить» микрофон
        try { speechSynthesis.cancel(); } catch (_) {}

        recognizer = new SpeechRec();
        recognizer.lang = 'ru-RU';
        recognizer.interimResults = false;
        recognizer.maxAlternatives = 3;

        feedback('Слушаю… скажи имя персонажа', null);

        // === управление индикатором на кнопке ===
        recognizer.onstart       = () => { micBtn.classList.add('listening'); };
        recognizer.onspeechstart = () => { micBtn.classList.add('speaking');  };
        recognizer.onspeechend   = () => { micBtn.classList.remove('speaking'); };

        recognizer.onresult = (e) => {
            const variants = [];
            for (let i = 0; i < e.results[0].length; i++) {
                variants.push(e.results[0][i].transcript);
            }
            const saidRaw = variants[0] || '';
            heardEl.textContent = saidRaw;

            const said = normalize(saidRaw);
            const { aliases, name } = characters[idx];
            const canon = normalize(name);
            const all = [canon, ...(aliases || []).map(normalize)];
            const ok = all.includes(said);

            if (ok) {
                feedback('Молодец! Это правильно ✅', 'ok');
                setTimeout(next, 500);
            } else {
                // Голосовой фидбек для неверного ответа
                feedback('Не совсем. Попробуй ещё раз 🙂', 'err');
                setTimeout(() => {
                    const phrase = saidRaw && saidRaw.trim()
                        ? `Ты сказал: ${saidRaw}. Это неправильно. Попробуй ещё раз.`
                        : `Ответ не расслышала. Попробуй ещё раз.`;
                    speak(phrase);
                }, 150); // дадим распознаванию корректно завершиться
            }
        };

        recognizer.onerror = () => {
            feedback('Ошибка распознавания. Попробуй ещё раз.', 'err');
        };

        recognizer.onend = () => {
            listening = false;
            micBtn.classList.remove('listening', 'speaking'); // погасить индикатор
        };

        recognizer.start();
    }

    micBtn.addEventListener('click', startListening);
    repeatBtn.addEventListener('click', speakHint);

    startGame();
})();
