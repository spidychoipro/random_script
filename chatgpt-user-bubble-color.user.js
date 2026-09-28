// ==UserScript==
// @name         ChatGPT User Bubble Color Customizer
// @namespace    https://github.com/spidychoipro/random_script
// @version      2.0.1
// @description  Customize the background color of your own ChatGPT user message bubbles.
// @author       spidychoipro
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/spidychoipro/random_script/main/chatgpt-user-bubble-color.user.js
// @downloadURL  https://raw.githubusercontent.com/spidychoipro/random_script/main/chatgpt-user-bubble-color.user.js
// ==/UserScript==

(() => {
    'use strict';

    const VERSION = '2.0.1';

    const STORAGE_KEY = 'chatgpt-user-bubble-color';
    const STYLE_ID = 'tm-user-bubble-style';
    const UI_ID = 'tm-bubble-customizer';
    const ACTIVE_CLASS = 'tm-user-bubble-active';

    const DEFAULTS = {
        color: '#2B2D42',
        alpha: 100,
        enabled: true
    };

    const PRESETS = [
        '#2B2D42', '#3A506B', '#1B998B', '#2EC4B6',
        '#E71D36', '#FF6B6B', '#F4A261', '#FFD166',
        '#7B2CBF', '#4361EE', '#1D3557', '#0B0B0F'
    ];

    const ROOT = {
        color: '--tm-ub-color',
        alpha: '--tm-ub-alpha',
        background: '--tm-ub-bg',
        foreground: '--tm-ub-fg'
    };

    let state = loadState();
    let observerScheduled = false;
    let suppressObserver = false;

    function storageGet(key, fallback) {
        try {
            const raw = GM_getValue(STORAGE_KEY, null);
            return raw && typeof raw === 'object' ? raw[key] : fallback;
        } catch {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            const raw = GM_getValue(STORAGE_KEY, null);
            const next = raw && typeof raw === 'object' ? { ...raw } : {};
            next[key] = value;
            GM_setValue(STORAGE_KEY, next);
        } catch {
            // Storage failure must never break the page.
        }
    }

    function clampAlpha(value) {
        const num = Number.parseInt(value, 10);

        if (Number.isNaN(num)) {
            return DEFAULTS.alpha;
        }

        return Math.min(100, Math.max(0, num));
    }

    function loadState() {
        return {
            color: normalizeHex(storageGet('color', DEFAULTS.color)) || DEFAULTS.color,
            alpha: clampAlpha(storageGet('alpha', DEFAULTS.alpha)),
            enabled: storageGet('enabled', DEFAULTS.enabled) !== false
        };
    }

    function normalizeHex(value) {
        if (typeof value !== 'string') {
            return null;
        }

        let hex = value.trim().replace(/^#/, '');

        if (/^[0-9a-fA-F]{3}$/.test(hex)) {
            hex = [...hex].map(char => char + char).join('');
        }

        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            return '#' + hex.slice(0, 3).toUpperCase();
        }

        if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
            return null;
        }

        return '#' + hex.toUpperCase();
    }

    function hexToRgb(hex) {
        return {
            r: Number.parseInt(hex.slice(1, 3), 16),
            g: Number.parseInt(hex.slice(3, 5), 16),
            b: Number.parseInt(hex.slice(5, 7), 16)
        };
    }

    function toRgba(hex, alpha) {
        const { r, g, b } = hexToRgb(hex);
        return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
    }

    function relativeLuminance(hex) {
        const { r, g, b } = hexToRgb(hex);
        const [red, green, blue] = [r, g, b].map(channel => {
            const value = channel / 255;
            return value <= 0.03928
                ? value / 12.92
                : Math.pow((value + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    }

    function getTextColor(hex) {
        const luminance = relativeLuminance(hex);
        const blackContrast = (luminance + 0.05) / 0.05;
        const whiteContrast = 1.05 / (luminance + 0.05);

        return whiteContrast > blackContrast ? '#FFFFFF' : '#101010';
    }

    const BUBBLE_SELECTOR = '.user-message-bubble-color';

    const FALLBACK_BUBBLE_SELECTORS = [
        '[data-message-author-role="user"] .whitespace-pre-wrap:not(.user-message-bubble-color *)',
        '[data-message-author-role="user"] .markdown:not(.user-message-bubble-color *)',
        '[data-message-author-role="user"] .prose:not(.user-message-bubble-color *)',
        '[data-turn="user"] .whitespace-pre-wrap:not(.user-message-bubble-color *)',
        '[data-turn="user"] .markdown:not(.user-message-bubble-color *)'
    ].join(',\n            ');

    const FALLBACK_CONTENT_SELECTORS = [
        '.whitespace-pre-wrap',
        '.markdown',
        '.prose',
        '.standard-markdown',
        '.progressive-markdown'
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            :root {
                --tm-ub-color: ${DEFAULTS.color};
                --tm-ub-alpha: ${DEFAULTS.alpha};
                --tm-ub-fg: ${getTextColor(DEFAULTS.color)};
                --tm-ub-bg: ${toRgba(DEFAULTS.color, DEFAULTS.alpha)};
            }

            ${BUBBLE_SELECTOR},
            .${ACTIVE_CLASS} {
                background-color: var(--tm-ub-bg) !important;
                color: var(--tm-ub-fg) !important;
            }

            ${BUBBLE_SELECTOR} *,
            .${ACTIVE_CLASS} * {
                color: inherit !important;
            }

            ${FALLBACK_BUBBLE_SELECTORS} {
                box-sizing: border-box;
                width: fit-content;
                max-width: 100%;
                margin-left: auto;
                padding: 10px 16px;
                background-color: var(--tm-ub-bg) !important;
                color: var(--tm-ub-fg) !important;
                border-radius: 22px !important;
            }

            ${FALLBACK_BUBBLE_SELECTORS} * {
                color: inherit !important;
            }

            :root[data-tm-ub-off="true"] ${BUBBLE_SELECTOR},
            :root[data-tm-ub-off="true"] .${ACTIVE_CLASS},
            :root[data-tm-ub-off="true"] ${FALLBACK_BUBBLE_SELECTORS} {
                background-color: revert !important;
                color: revert !important;
            }

            :root[data-tm-ub-off="true"] ${FALLBACK_BUBBLE_SELECTORS} {
                box-sizing: revert;
                width: revert;
                max-width: revert;
                margin-left: revert;
                padding: revert;
                border-radius: revert !important;
            }

            #${UI_ID} {
                position: fixed;
                right: 18px;
                bottom: 72px;
                z-index: 2147483000;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                -webkit-font-smoothing: antialiased;
            }

            #${UI_ID} * {
                box-sizing: border-box;
            }

            #tm-ub-toggle {
                width: 42px;
                height: 42px;
                padding: 0;
                border: 1px solid rgba(255, 255, 255, .28);
                border-radius: 50%;
                cursor: grab;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 19px;
                line-height: 1;
                color: #FFFFFF;
                box-shadow: 0 4px 14px rgba(0, 0, 0, .28);
                transition: transform .15s ease, box-shadow .15s ease, opacity .2s ease;
                touch-action: none;
            }

            #tm-ub-toggle:hover {
                transform: scale(1.08);
                box-shadow: 0 6px 18px rgba(0, 0, 0, .34);
            }

            #tm-ub-toggle:active {
                cursor: grabbing;
            }

            #tm-ub-toggle:focus-visible {
                outline: 2px solid #FFFFFF;
                outline-offset: 2px;
            }

            #tm-ub-toggle[data-active="false"] {
                opacity: .55;
            }

            #tm-ub-panel {
                position: absolute;
                right: 0;
                bottom: 52px;
                width: min(264px, calc(100vw - 32px));
                padding: 14px;
                border: 1px solid rgba(255, 255, 255, .12);
                border-radius: 14px;
                background: rgba(28, 28, 30, .98);
                color: #FFFFFF;
                box-shadow: 0 10px 34px rgba(0, 0, 0, .42);
                display: none;
            }

            #tm-ub-panel.open {
                display: block;
            }

            #tm-ub-title {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 12px;
                font-size: 14px;
                font-weight: 600;
            }

            #tm-ub-version {
                font-size: 10px;
                font-weight: 400;
                color: rgba(255, 255, 255, .45);
            }

            #tm-ub-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            #tm-ub-color {
                width: 46px;
                height: 36px;
                padding: 2px;
                border: 1px solid rgba(255, 255, 255, .2);
                border-radius: 8px;
                cursor: pointer;
                background: transparent;
            }

            #tm-ub-hex {
                flex: 1;
                min-width: 0;
                padding: 8px 9px;
                border: 1px solid rgba(255, 255, 255, .2);
                border-radius: 8px;
                outline: none;
                background: rgba(255, 255, 255, .08);
                color: #FFFFFF;
                font-size: 13px;
            }

            #tm-ub-hex:focus {
                border-color: rgba(255, 255, 255, .5);
            }

            #tm-ub-alpha {
                width: 100%;
                margin: 12px 0 2px;
                accent-color: #6C8CFF;
            }

            #tm-ub-alpha-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 12px;
                color: rgba(255, 255, 255, .7);
            }

            #tm-ub-presets {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 6px;
                margin: 12px 0 4px;
            }

            .tm-ub-swatch {
                width: 100%;
                aspect-ratio: 1;
                padding: 0;
                border: 1px solid rgba(255, 255, 255, .18);
                border-radius: 6px;
                cursor: pointer;
                transition: transform .12s ease;
            }

            .tm-ub-swatch:hover {
                transform: scale(1.12);
            }

            #tm-ub-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 12px;
            }

            #tm-ub-actions button {
                flex: 1;
                padding: 8px;
                border: 0;
                border-radius: 8px;
                cursor: pointer;
                background: rgba(255, 255, 255, .1);
                color: #FFFFFF;
                font-size: 12px;
            }

            #tm-ub-actions button:hover {
                background: rgba(255, 255, 255, .18);
            }

            #tm-ub-status {
                min-height: 16px;
                margin-top: 8px;
                font-size: 11px;
                color: rgba(255, 255, 255, .6);
            }

            #tm-ub-hint {
                margin-top: 6px;
                font-size: 10px;
                line-height: 1.5;
                color: rgba(255, 255, 255, .35);
            }
        `;

        (document.head || document.documentElement).appendChild(style);
    }

    function applyCssVariables() {
        const root = document.documentElement;
        const background = toRgba(state.color, state.alpha);

        root.style.setProperty(ROOT.color, state.color);
        root.style.setProperty(ROOT.alpha, String(state.alpha));
        root.style.setProperty(ROOT.background, background);
        root.style.setProperty(ROOT.foreground, getTextColor(state.color));
        root.dataset.tmUbOff = state.enabled ? 'false' : 'true';
    }

    function updateButtonColor() {
        const button = document.getElementById('tm-ub-toggle');

        if (!button) {
            return;
        }

        button.style.background = toRgba(state.color, state.alpha);
        button.dataset.active = String(state.enabled);
    }

    function findDeepestTextNode(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let deepest = null;
        let deepestDepth = -1;

        while (walker.nextNode()) {
            if (!walker.currentNode.textContent.trim()) {
                continue;
            }

            const parent = walker.currentNode.parentElement;

            if (!parent) {
                continue;
            }

            let depth = 0;
            for (let node = parent; node; node = node.parentElement) {
                depth += 1;
            }

            if (depth > deepestDepth) {
                deepest = parent;
                deepestDepth = depth;
            }
        }

        return deepest;
    }

    function resolveBubble(turn) {
        if (!(turn instanceof Element)) {
            return null;
        }

        for (const selector of FALLBACK_CONTENT_SELECTORS) {
            const found = turn.querySelector(selector);

            if (found) {
                return found;
            }
        }

        return findDeepestTextNode(turn) || turn;
    }

    function getUserTurns() {
        return new Set([
            ...document.querySelectorAll('[data-message-author-role="user"]'),
            ...document.querySelectorAll('[data-turn="user"]'),
            ...document.querySelectorAll('.user-message-bubble-color')
        ]);
    }

    function syncBubbles() {
        if (document.querySelector(BUBBLE_SELECTOR) === null) {
            for (const turn of getUserTurns()) {
                const bubble = resolveBubble(turn);

                if (!bubble) {
                    continue;
                }

                bubble.classList.add(ACTIVE_CLASS);
            }

            return;
        }

        document
            .querySelectorAll(`.${ACTIVE_CLASS}`)
            .forEach(element => element.classList.remove(ACTIVE_CLASS));
    }

    function createElement(tag, attributes = {}) {
        const element = document.createElement(tag);

        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'className') {
                element.className = value;
            } else if (key in element) {
                element[key] = value;
            } else {
                element.setAttribute(key, value);
            }
        }

        return element;
    }

    function setStatus(message) {
        const status = document.getElementById('tm-ub-status');

        if (status) {
            status.textContent = message;
        }
    }

    function commitColor(color) {
        const normalized = normalizeHex(color);

        if (!normalized) {
            return false;
        }

        state.color = normalized;
        storageSet('color', normalized);
        applyCssVariables();
        updateButtonColor();

        const colorInput = document.getElementById('tm-ub-color');
        const hexInput = document.getElementById('tm-ub-hex');

        if (colorInput) {
            colorInput.value = normalized;
        }

        if (hexInput && document.activeElement !== hexInput) {
            hexInput.value = normalized;
        }

        return true;
    }

    function commitAlpha(value) {
        const alpha = clampAlpha(value);
        state.alpha = alpha;
        storageSet('alpha', alpha);
        applyCssVariables();
        updateButtonColor();

        const label = document.getElementById('tm-ub-alpha-value');
        const slider = document.getElementById('tm-ub-alpha');

        if (label) {
            label.textContent = `${alpha}%`;
        }

        if (slider && Number.parseInt(slider.value, 10) !== alpha) {
            slider.value = String(alpha);
        }
    }

    function commitEnabled(enabled) {
        state.enabled = enabled;
        storageSet('enabled', enabled);
        applyCssVariables();
        updateButtonColor();
        syncBubbles();
        setStatus(enabled ? '사용자 말풍선 색상 적용 중' : '기본 색상으로 비활성화됨');
    }

    function resetAll() {
        state = { ...DEFAULTS, color: normalizeHex(DEFAULTS.color) };
        storageSet('color', state.color);
        storageSet('alpha', state.alpha);
        storageSet('enabled', state.enabled);
        applyCssVariables();
        updateButtonColor();
        syncBubbles();

        const colorInput = document.getElementById('tm-ub-color');
        const hexInput = document.getElementById('tm-ub-hex');
        const slider = document.getElementById('tm-ub-alpha');
        const label = document.getElementById('tm-ub-alpha-value');

        if (colorInput) {
            colorInput.value = state.color;
        }

        if (hexInput) {
            hexInput.value = state.color;
        }

        if (slider) {
            slider.value = String(state.alpha);
        }

        if (label) {
            label.textContent = `${state.alpha}%`;
        }

        setStatus('기본값으로 초기화됨');
    }

    function loadPosition() {
        const container = document.getElementById(UI_ID);
        const right = storageGet('right', null);
        const bottom = storageGet('bottom', null);

        if (!container) {
            return;
        }

        if (Number.isFinite(right)) {
            container.style.right = `${right}px`;
        }

        if (Number.isFinite(bottom)) {
            container.style.bottom = `${bottom}px`;
        }
    }

    function makeDraggable(button) {
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        button.addEventListener('pointerdown', event => {
            const rect = button.getBoundingClientRect();
            dragging = true;
            offsetX = event.clientX - rect.left;
            offsetY = event.clientY - rect.top;
            button.setPointerCapture?.(event.pointerId);
        });

        button.addEventListener('pointermove', event => {
            if (!dragging) {
                return;
            }

            const width = button.offsetWidth;
            const height = button.offsetHeight;
            const left = Math.min(
                Math.max(event.clientX - offsetX, 4),
                window.innerWidth - width - 4
            );
            const top = Math.min(
                Math.max(event.clientY - offsetY, 4),
                window.innerHeight - height - 4
            );

            const container = document.getElementById(UI_ID);
            container.style.left = `${left}px`;
            container.style.top = `${top}px`;
            container.style.right = 'auto';
            container.style.bottom = 'auto';
        });

        const endDrag = event => {
            if (!dragging) {
                return;
            }

            dragging = false;
            button.releasePointerCapture?.(event.pointerId);

            const rect = button.getBoundingClientRect();
            storageSet('right', Math.round(window.innerWidth - rect.right));
            storageSet('bottom', Math.round(window.innerHeight - rect.bottom));
        };

        button.addEventListener('pointerup', endDrag);
        button.addEventListener('pointercancel', endDrag);
    }

    function togglePanel(force) {
        const panel = document.getElementById('tm-ub-panel');
        const button = document.getElementById('tm-ub-toggle');

        if (!panel || !button) {
            return;
        }

        const shouldOpen =
            typeof force === 'boolean' ? force : !panel.classList.contains('open');

        panel.classList.toggle('open', shouldOpen);
        button.setAttribute('aria-expanded', String(shouldOpen));

        if (shouldOpen) {
            const rect = button.getBoundingClientRect();
            const flipBelow = rect.top < 260;
            panel.style.bottom = flipBelow ? 'auto' : '52px';
            panel.style.top = flipBelow ? '52px' : 'auto';
        }
    }

    function closePanel() {
        togglePanel(false);
    }

    function buildUi() {
        if (!document.body || document.getElementById(UI_ID)) {
            return;
        }

        suppressObserver = true;

        const container = createElement('div', { id: UI_ID });

        const panel = createElement('div', {
            id: 'tm-ub-panel',
            role: 'dialog',
            ariaLabel: '사용자 말풍선 색상 설정'
        });

        const title = createElement('div', { id: 'tm-ub-title' });
        title.append(
            createElement('span', { textContent: '사용자 말풍선 색상' }),
            createElement('span', {
                id: 'tm-ub-version',
                textContent: `v${VERSION}`
            })
        );

        const row = createElement('div', { id: 'tm-ub-row' });

        const colorInput = createElement('input', {
            id: 'tm-ub-color',
            type: 'color',
            value: state.color,
            ariaLabel: '말풍선 색상 선택'
        });

        const hexInput = createElement('input', {
            id: 'tm-ub-hex',
            type: 'text',
            value: state.color,
            maxLength: 7,
            spellcheck: false,
            ariaLabel: 'HEX 색상 입력'
        });

        row.append(colorInput, hexInput);

        const alphaRow = createElement('div', { id: 'tm-ub-alpha-row' });
        alphaRow.append(
            createElement('span', { textContent: '투명도' }),
            createElement('span', {
                id: 'tm-ub-alpha-value',
                textContent: `${state.alpha}%`
            })
        );

        const alphaSlider = createElement('input', {
            id: 'tm-ub-alpha',
            type: 'range',
            min: '0',
            max: '100',
            step: '1',
            value: String(state.alpha),
            ariaLabel: '투명도 조절'
        });

        const presets = createElement('div', { id: 'tm-ub-presets' });

        for (const preset of PRESETS) {
            presets.appendChild(
                createElement('button', {
                    type: 'button',
                    className: 'tm-ub-swatch',
                    style: `background:${preset}`,
                    title: preset,
                    ariaLabel: `색상 ${preset}`,
                    onclick: () => {
                        if (commitColor(preset)) {
                            setStatus(`${preset} 적용됨`);
                        }
                    }
                })
            );
        }

        const actions = createElement('div', { id: 'tm-ub-actions' });

        const enableButton = createElement('button', {
            type: 'button',
            textContent: state.enabled ? '비활성화' : '활성화'
        });

        const resetButton = createElement('button', {
            type: 'button',
            textContent: '초기화'
        });

        actions.append(enableButton, resetButton);

        const status = createElement('div', {
            id: 'tm-ub-status',
            textContent: state.enabled ? '색상을 선택하면 즉시 적용됩니다.' : '비활성화 상태입니다.'
        });

        const hint = createElement('div', {
            id: 'tm-ub-hint',
            textContent: '버튼을 드래그해 위치를 바꿀 수 있습니다. Alt+Shift+C로 패널 토글.'
        });

        const toggle = createElement('button', {
            id: 'tm-ub-toggle',
            type: 'button',
            title: '말풍선 색상 설정',
            ariaLabel: '말풍선 색상 설정',
            ariaExpanded: 'false',
            textContent: '🎨'
        });

        panel.append(title, row, alphaRow, alphaSlider, presets, actions, status, hint);
        container.append(panel, toggle);
        document.body.appendChild(container);

        toggle.addEventListener('click', event => {
            event.stopPropagation();
            togglePanel();
        });

        panel.addEventListener('click', event => event.stopPropagation());

        colorInput.addEventListener('input', () => {
            if (commitColor(colorInput.value)) {
                setStatus(`${state.color} 적용됨`);
            }
        });

        hexInput.addEventListener('input', () => {
            const normalized = normalizeHex(hexInput.value);

            if (normalized) {
                commitColor(normalized);
                setStatus(`${normalized} 적용됨`);
            } else {
                setStatus('HEX 색상을 입력하세요. 예: #2B2D42');
            }
        });

        hexInput.addEventListener('keydown', event => {
            if (event.key !== 'Enter') {
                return;
            }

            if (commitColor(hexInput.value)) {
                hexInput.value = state.color;
                setStatus(`${state.color} 적용됨`);
            }
        });

        alphaSlider.addEventListener('input', () => {
            commitAlpha(alphaSlider.value);
            setStatus(`투명도 ${state.alpha}%`);
        });

        enableButton.addEventListener('click', () => {
            commitEnabled(!state.enabled);
            enableButton.textContent = state.enabled ? '비활성화' : '활성화';
        });

        resetButton.addEventListener('click', resetAll);

        document.addEventListener('click', closePanel);

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                closePanel();
                return;
            }

            if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'c') {
                event.preventDefault();
                togglePanel();
            }
        });

        makeDraggable(toggle);
        loadPosition();
        updateButtonColor();

        suppressObserver = false;
    }

    function scheduleRefresh() {
        if (observerScheduled || suppressObserver) {
            return;
        }

        observerScheduled = true;

        requestAnimationFrame(() => {
            observerScheduled = false;
            injectStyle();
            buildUi();
            syncBubbles();
        });
    }

    function isOwnMutation(mutation) {
        const container = document.getElementById(UI_ID);
        const target = mutation.target instanceof Node ? mutation.target : null;

        if (container && target && container.contains(target)) {
            return true;
        }

        return [...mutation.addedNodes, ...mutation.removedNodes].some(
            node => node instanceof Element && (node.id === UI_ID || node.closest?.(`#${UI_ID}`))
        );
    }

    function init() {
        injectStyle();
        applyCssVariables();
        buildUi();
        syncBubbles();

        const observer = new MutationObserver(mutations => {
            if (mutations.every(isOwnMutation)) {
                return;
            }

            scheduleRefresh();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        window.addEventListener('resize', () => scheduleRefresh());

        if (typeof GM_registerMenuCommand === 'function') {
            try {
                GM_registerMenuCommand('말풍선 색상 패널 열기', () => togglePanel(true));
                GM_registerMenuCommand('설정 초기화', resetAll);
            } catch {
                // Menu commands are optional.
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
