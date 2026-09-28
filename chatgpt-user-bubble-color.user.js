// ==UserScript==
// @name         ChatGPT User Bubble Color Customizer
// @namespace    https://github.com/spidychoipro/random_script
// @version      1.1.0
// @description  Customize the color of your ChatGPT user message bubbles.
// @author       spidychoipro
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/spidychoipro/random_script/main/chatgpt-user-bubble-color.user.js
// @downloadURL  https://raw.githubusercontent.com/spidychoipro/random_script/main/chatgpt-user-bubble-color.user.js
// ==/UserScript==

(() => {
    'use strict';

    const STORAGE_KEY = 'chatgpt-user-bubble-color';
    const STYLE_ID = 'tm-user-bubble-style';
    const UI_ID = 'tm-bubble-customizer';
    const ACTIVE_CLASS = 'tm-user-bubble-active';

    const DEFAULT_BUTTON_COLOR = '#666666';

    function normalizeHex(value) {
        if (typeof value !== 'string') {
            return null;
        }

        let hex = value.trim();

        if (!hex.startsWith('#')) {
            hex = `#${hex}`;
        }

        if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
            hex = '#' + [...hex.slice(1)]
                .map(char => char + char)
                .join('');
        }

        if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
            return null;
        }

        return hex.toUpperCase();
    }

    function getStoredColor() {
        try {
            const value = GM_getValue(STORAGE_KEY, '');
            return normalizeHex(value);
        } catch {
            return null;
        }
    }

    function saveColor(color) {
        try {
            if (color) {
                GM_setValue(STORAGE_KEY, color);
            } else {
                GM_setValue(STORAGE_KEY, '');
            }
        } catch {
            // Storage failure should not break the UI.
        }
    }

    function getTextColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const convert = value =>
            value <= 0.03928
                ? value / 12.92
                : Math.pow((value + 0.055) / 1.055, 2.4);

        const luminance =
            0.2126 * convert(r) +
            0.7152 * convert(g) +
            0.0722 * convert(b);

        const blackContrast =
            (luminance + 0.05) / 0.05;

        const whiteContrast =
            1.05 / (luminance + 0.05);

        return whiteContrast > blackContrast
            ? '#FFFFFF'
            : '#000000';
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;

        style.textContent = `
            /*
             * Primary selector:
             * ChatGPT currently uses .user-message-bubble-color
             *
             * Fallback:
             * We add .tm-user-bubble-active to a detected user bubble.
             */

            .user-message-bubble-color.${ACTIVE_CLASS},
            .${ACTIVE_CLASS} {
                background-color: var(--tm-user-bubble-color) !important;
                color: var(--tm-user-bubble-text) !important;
            }

            .user-message-bubble-color.${ACTIVE_CLASS} *,
            .${ACTIVE_CLASS} * {
                color: inherit !important;
            }

            #${UI_ID} {
                position: fixed;
                right: 18px;
                bottom: 72px;
                z-index: 999999;
                font-family:
                    system-ui,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;
            }

            #tm-bubble-toggle {
                width: 42px;
                height: 42px;
                padding: 0;
                border: 1px solid rgba(255, 255, 255, .25);
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 19px;
                color: #FFFFFF;
                box-shadow: 0 4px 14px rgba(0, 0, 0, .25);
                transition:
                    transform .15s ease,
                    box-shadow .15s ease;
            }

            #tm-bubble-toggle:hover {
                transform: scale(1.08);
                box-shadow: 0 6px 18px rgba(0, 0, 0, .3);
            }

            #tm-bubble-toggle:focus-visible {
                outline: 2px solid #FFFFFF;
                outline-offset: 2px;
            }

            #tm-bubble-panel {
                position: absolute;
                right: 0;
                bottom: 52px;
                width: 250px;
                padding: 14px;
                box-sizing: border-box;
                border: 1px solid rgba(255, 255, 255, .12);
                border-radius: 14px;
                background: rgba(30, 30, 30, .97);
                color: #FFFFFF;
                box-shadow: 0 8px 30px rgba(0, 0, 0, .35);
                display: none;
            }

            #tm-bubble-panel.open {
                display: block;
            }

            #tm-bubble-title {
                margin-bottom: 12px;
                font-size: 14px;
                font-weight: 600;
            }

            #tm-bubble-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            #tm-bubble-color {
                width: 44px;
                height: 36px;
                padding: 2px;
                border: 1px solid rgba(255, 255, 255, .2);
                border-radius: 8px;
                cursor: pointer;
                background: transparent;
            }

            #tm-bubble-hex {
                flex: 1;
                min-width: 0;
                box-sizing: border-box;
                padding: 8px 9px;
                border: 1px solid rgba(255, 255, 255, .2);
                border-radius: 8px;
                outline: none;
                background: rgba(255, 255, 255, .08);
                color: #FFFFFF;
                font-size: 13px;
            }

            #tm-bubble-hex:focus {
                border-color: rgba(255, 255, 255, .45);
            }

            #tm-bubble-status {
                min-height: 18px;
                margin-top: 8px;
                font-size: 11px;
                color: rgba(255, 255, 255, .65);
            }

            #tm-bubble-reset {
                width: 100%;
                margin-top: 4px;
                padding: 8px;
                border: 0;
                border-radius: 8px;
                cursor: pointer;
                background: rgba(255, 255, 255, .1);
                color: #FFFFFF;
                font-size: 13px;
            }

            #tm-bubble-reset:hover {
                background: rgba(255, 255, 255, .16);
            }
        `;

        document.head.appendChild(style);
    }

    function findBubble(turn) {
        if (!(turn instanceof Element)) {
            return null;
        }

        // Primary: exact class from current ChatGPT DOM.
        const exact = turn.querySelector('.user-message-bubble-color');

        if (exact) {
            return exact;
        }

        // Fallback: try to identify the rounded message bubble.
        const candidates = turn.querySelectorAll('div[class]');

        for (const element of candidates) {
            const className =
                typeof element.className === 'string'
                    ? element.className
                    : '';

            if (
                className.includes('rounded-') &&
                className.includes('px-4') &&
                className.includes('py-2')
            ) {
                return element;
            }
        }

        return null;
    }

    function getUserBubbles() {
        const bubbles = new Set();

        // Current DOM selector.
        document
            .querySelectorAll('.user-message-bubble-color')
            .forEach(element => bubbles.add(element));

        // Fallback for DOM changes.
        document
            .querySelectorAll('[data-message-author-role="user"]')
            .forEach(turn => {
                const bubble = findBubble(turn);

                if (bubble) {
                    bubbles.add(bubble);
                }
            });

        return [...bubbles];
    }

    function applyToMessages() {
        const color = getStoredColor();

        for (const bubble of getUserBubbles()) {
            if (color) {
                bubble.classList.add(ACTIVE_CLASS);
            } else {
                bubble.classList.remove(ACTIVE_CLASS);
            }
        }
    }

    function updateCssVariables(color) {
        if (!color) {
            document.documentElement.style.removeProperty(
                '--tm-user-bubble-color'
            );

            document.documentElement.style.removeProperty(
                '--tm-user-bubble-text'
            );

            return;
        }

        document.documentElement.style.setProperty(
            '--tm-user-bubble-color',
            color
        );

        document.documentElement.style.setProperty(
            '--tm-user-bubble-text',
            getTextColor(color)
        );
    }

    function updateButtonColor(color) {
        const button = document.getElementById('tm-bubble-toggle');

        if (!button) {
            return;
        }

        button.style.background =
            color || DEFAULT_BUTTON_COLOR;
    }

    function applyColor(color, persist = true) {
        const normalized = normalizeHex(color);

        if (normalized) {
            updateCssVariables(normalized);

            if (persist) {
                saveColor(normalized);
            }
        } else {
            updateCssVariables(null);

            if (persist) {
                saveColor(null);
            }
        }

        updateButtonColor(normalized);
        applyToMessages();

        const colorInput =
            document.getElementById('tm-bubble-color');

        const hexInput =
            document.getElementById('tm-bubble-hex');

        if (colorInput && normalized) {
            colorInput.value = normalized;
        }

        if (hexInput) {
            hexInput.value = normalized || '';
        }
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

    function createCustomizer() {
        if (
            !document.body ||
            document.getElementById(UI_ID)
        ) {
            return;
        }

        const container = createElement('div', {
            id: UI_ID
        });

        const panel = createElement('div', {
            id: 'tm-bubble-panel'
        });

        const title = createElement('div', {
            id: 'tm-bubble-title',
            textContent: '사용자 말풍선 색상'
        });

        const row = createElement('div', {
            id: 'tm-bubble-row'
        });

        const colorInput = createElement('input', {
            id: 'tm-bubble-color',
            type: 'color',
            value: getStoredColor() || '#666666',
            ariaLabel: '말풍선 색상 선택'
        });

        const hexInput = createElement('input', {
            id: 'tm-bubble-hex',
            type: 'text',
            value: getStoredColor() || '',
            maxLength: 7,
            spellcheck: false,
            ariaLabel: 'HEX 색상 입력'
        });

        const status = createElement('div', {
            id: 'tm-bubble-status',
            textContent: '색상을 선택하면 즉시 적용됩니다.'
        });

        const resetButton = createElement('button', {
            id: 'tm-bubble-reset',
            type: 'button',
            textContent: '기본값으로 초기화'
        });

        const toggle = createElement('button', {
            id: 'tm-bubble-toggle',
            type: 'button',
            title: '말풍선 색상 설정',
            ariaLabel: '말풍선 색상 설정',
            ariaExpanded: 'false',
            textContent: '🎨'
        });

        row.append(colorInput, hexInput);
        panel.append(title, row, status, resetButton);
        container.append(panel, toggle);
        document.body.appendChild(container);

        toggle.addEventListener('click', event => {
            event.stopPropagation();

            const open = panel.classList.toggle('open');

            toggle.setAttribute(
                'aria-expanded',
                String(open)
            );
        });

        panel.addEventListener('click', event => {
            event.stopPropagation();
        });

        colorInput.addEventListener('input', () => {
            const color = normalizeHex(colorInput.value);

            if (!color) {
                return;
            }

            status.textContent =
                `${color} 적용됨`;

            applyColor(color);
        });

        hexInput.addEventListener('input', () => {
            const value = hexInput.value.trim();
            const color = normalizeHex(value);

            if (color) {
                status.textContent =
                    `${color} 적용됨`;

                applyColor(color);
            } else {
                status.textContent =
                    'HEX 색상을 입력하세요. 예: #2B2D42';
            }
        });

        hexInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                const color = normalizeHex(hexInput.value);

                if (color) {
                    applyColor(color);
                    status.textContent =
                        `${color} 적용됨`;
                }
            }
        });

        resetButton.addEventListener('click', () => {
            applyColor(null);

            status.textContent =
                '기본 ChatGPT 색상으로 복원됨';
        });

        document.addEventListener('click', () => {
            panel.classList.remove('open');

            toggle.setAttribute(
                'aria-expanded',
                'false'
            );
        });

        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') {
                return;
            }

            panel.classList.remove('open');

            toggle.setAttribute(
                'aria-expanded',
                'false'
            );
        });

        const savedColor = getStoredColor();

        updateCssVariables(savedColor);
        updateButtonColor(savedColor);
        applyToMessages();
    }

    let observerScheduled = false;

    function scheduleRefresh() {
        if (observerScheduled) {
            return;
        }

        observerScheduled = true;

        requestAnimationFrame(() => {
            observerScheduled = false;

            injectStyle();
            createCustomizer();
            applyToMessages();
        });
    }

    function init() {
        injectStyle();
        createCustomizer();
        applyToMessages();

        const observer = new MutationObserver(() => {
            scheduleRefresh();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            init,
            { once: true }
        );
    } else {
        init();
    }
})();
