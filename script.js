    const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

    const els = {
        apiKey: document.getElementById('apiKey'),
        city: document.getElementById('city'),
        dateFrom: document.getElementById('dateFrom'),
        dateTo: document.getElementById('dateTo'),
        adults: document.getElementById('adults'),
        children: document.getElementById('children'),
        generateBtn: document.getElementById('generateBtn'),
        clearBtn: document.getElementById('clearBtn'),
        status: document.getElementById('status'),
        recBox: document.getElementById('recBox'),
        recContent: document.getElementById('recContent'),
    };

    function setStatus(text, isError = false) {
        els.status.textContent = text;
        els.status.classList.toggle('error', isError);
    }

    function buildPrompt() {
        const city = els.city.value.trim() || 'Казань';
        const from = els.dateFrom.value;
        const to = els.dateTo.value;
        const adults = Number(els.adults.value) || 0;
        const children = Number(els.children.value) || 0;

        return `Ты — опытный туристический планировщик. Составь подробный план путешествия.

Параметры:
- Город: ${city}
- Даты: с ${from} по ${to}
- Взрослых: ${adults}
- Детей: ${children}

Требования к ответу:
1. Разбей план по дням (каждый день — заголовок с датой).
2. Для каждого дня укажи 3–5 активностей с краткими пояснениями (что это, для кого подходит, ориентировочная длительность).
3. Учти интересы и взрослых, и детей (возраст детей неизвестен — предлагай универсальные семейные варианты и отметь, что стоит уточнить возраст).
4. Отдельно выдели: гастрономию, культурные объекты, прогулки/природу, вечерние занятия.
5. Добавь блок «Практические советы»: транспорт, сезонная одежда, что бронировать заранее.
6. В конце — блок «Бюджет-ориентиры» (примерные диапазоны, без точных цен).
7. Пиши на русском языке, структурированно, с подзаголовками и маркированными списками.`;
    }

    async function generateRecommendations() {
        const apiKey = els.apiKey.value.trim();
        if (!apiKey) {
            setStatus('Введите DeepSeek API-ключ', true);
            els.apiKey.focus();
            return;
        }
        if (!els.dateFrom.value || !els.dateTo.value) {
            setStatus('Укажите даты поездки', true);
            return;
        }
        if (new Date(els.dateFrom.value) > new Date(els.dateTo.value)) {
            setStatus('Дата начала позже даты окончания', true);
            return;
        }

        els.generateBtn.disabled = true;
        setStatus('Запрос к DeepSeek...');
        els.recBox.classList.remove('visible');
        els.recContent.textContent = '';

        try {
            const response = await fetch(DEEPSEEK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: 'Ты — профессиональный туристический планировщик. Отвечай структурированно, на русском языке.' },
                        { role: 'user', content: buildPrompt() },
                    ],
                    temperature: 0.7,
                    max_tokens: 2500,
                }),
            });

            if (!response.ok) {
                let errText = `HTTP ${response.status}`;
                try {
                    const errData = await response.json();
                    if (errData?.error?.message) errText += `: ${errData.error.message}`;
                } catch (_) {}
                throw new Error(errText);
            }

            const data = await response.json();
            const content = data?.choices?.[0]?.message?.content?.trim();
            if (!content) throw new Error('Пустой ответ от модели');

            // Простейшая разметка: строки, начинающиеся с #, ##, ### → заголовки
            els.recContent.innerHTML = renderMarkdownLite(content);
            els.recBox.classList.add('visible');
            setStatus('Готово ✓');
        } catch (err) {
            console.error(err);
            setStatus(`Ошибка: ${err.message}`, true);
        } finally {
            els.generateBtn.disabled = false;
        }
    }

    // Минимальный рендер: заголовки, **жирный**, *курсив* и списки без маркеров
    function renderMarkdownLite(text) {
        const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));

        // Инлайновая разметка: **жирный** и *курсив* (отдельные метки для открытия и закрытия)
        const B0 = '\u0002', B1 = '\u0004', I0 = '\u0003', I1 = '\u0005';
        const inline = (s) => s
            .replace(/\*\*([^*\n]+)\*\*/g, (m, inner) => B0 + inner + B1)
            .replace(/\*([^*\n]+)\*/g, (m, inner) => I0 + inner + I1)
            .split(B0).join('<strong>').split(B1).join('</strong>')
            .split(I0).join('<em>').split(I1).join('</em>');

        return text.split('\n').map(line => {
            const safe = escapeHtml(line);
            if (/^###\s+/.test(line)) return `<h4>${inline(safe.replace(/^###\s+/, ''))}</h4>`;
            if (/^##\s+/.test(line)) return `<h3>${inline(safe.replace(/^##\s+/, ''))}</h3>`;
            if (/^#\s+/.test(line)) return `<h3>${inline(safe.replace(/^#\s+/, ''))}</h3>`;
            if (/^\s*[-*]\s+/.test(line)) return `<div class="rec-item">${inline(safe.replace(/^\s*[-*]\s+/, ''))}</div>`;
            if (line.trim() === '') return '<br>';
            return `<div>${inline(safe)}</div>`;
        }).join('');
    }

    function clearAll() {
        els.apiKey.value = '';
        els.city.value = 'Казань';
        els.dateFrom.value = '2026-01-03';
        els.dateTo.value = '2026-01-08';
        els.adults.value = 8;
        els.children.value = 5;
        els.recBox.classList.remove('visible');
        els.recContent.textContent = '';
        setStatus('');
    }

    els.generateBtn.addEventListener('click', generateRecommendations);
    els.clearBtn.addEventListener('click', clearAll);

    // Ctrl+Enter для быстрой генерации
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generateRecommendations();
    });
