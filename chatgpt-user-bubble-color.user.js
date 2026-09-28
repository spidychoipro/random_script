// ==UserScript==
// @name         ChatGPT User Bubble Color Customizer
// @namespace    https://chatgpt.com/
// @version      1.0.0
// @description  ChatGPT 사용자 메시지 말풍선 색상 커스터마이징
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const STORAGE_KEY = 'chatgpt-user-bubble-color';
    const DEFAULT_COLOR = '#2B2D42';

    function getColor() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_COLOR;
    }

    function applyColor(color) {
        document.documentElement.style.setProperty(
            '--tm-user-bubble-color',
            color
        );

        localStorage.setItem(STORAGE_KEY, color);

        const colorInput = document.getElementById('tm-bubble-color');
        const hexInput = document.getElementById('tm-bubble-hex');
        const toggle = document.getElementById('tm-bubble-toggle');

        if (colorInput) colorInput.value = color;
        if (hexInput) hexInput.value = color;
        if (toggle) toggle.style.background = color;
    }

    function createCustomizer() {
        if (document.getElementById('tm-bubble-customizer')) return;

        const container = document.createElement('div');
        container.id = 'tm-bubble-customizer';

        container.innerHTML = `
            <div id="tm-bubble-panel">
                <div id="tm-bubble-title">사용자 말풍선 색상</div>

                <div id="tm-bubble-row">
                    <input
                        type="color"
                        id="tm-bubble-color"
                        value="${getColor()}"
                    >

                    <input
                        type="text"
                        id="tm-bubble-hex"
                        value="${getColor()}"
                        maxlength="7"
                        spellcheck="false"
                        aria-label="HEX 색상"
                    >
                </div>

                <button id="tm-bubble-reset" type="button">
                    기본값으로 초기화
                </button>
            </div>

            <button id="tm-bubble-toggle" type="button" title="말풍선 색상 설정">
                🎨
            </button>
        `;

        document.body.appendChild(container);

        const toggle = document.getElementById('tm-bubble-toggle');
        const panel = document.getElementById('tm-bubble-panel');
        const colorInput = document.getElementById('tm-bubble-color');
        const hexInput = document.getElementById('tm-bubble-hex');
        const resetButton = document.getElementById('tm-bubble-reset');

        toggle.addEventListener('click', () => {
            panel.classList.toggle('open');
        });

        colorInput.addEventListener('input', () => {
            applyColor(colorInput.value.toUpperCase());
        });

        hexInput.addEventListener('change', () => {
            let color = hexInput.value.trim();

            if (!color.startsWith('#')) {
                color = `#${color}`;
            }

            if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                applyColor(color.toUpperCase());
            } else {
                hexInput.value = getColor();
            }
        });

        resetButton.addEventListener('click', () => {
            applyColor(DEFAULT_COLOR);
        });

        applyColor(getColor());
    }

    function injectStyle() {
        if (document.getElementById('tm-bubble-style')) return;

        const style = document.createElement('style');
        style.id = 'tm-bubble-style';

        style.textContent = `
            .user-message-bubble-color {
                background-color: var(--tm-user-bubble-color) !important;
            }

            #tm-bubble-customizer {
                position: fixed;
                right: 18px;
                bottom: 18px;
                z-index: 999999;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            #tm-bubble-toggle {
                width: 42px;
                height: 42px;
                border: 0;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                box-shadow: 0 4px 14px rgba(0, 0, 0, .25);
                transition: transform .15s ease;
            }

            #tm-bubble-toggle:hover {
                transform: scale(1.08);
            }

            #tm-bubble-panel {
                position: absolute;
                right: 0;
                bottom: 52px;
                width: 230px;
                padding: 14px;
                border-radius: 14px;
                background: rgba(30, 30, 30, .96);
                color: white;
                box-shadow: 0 8px 30px rgba(0, 0, 0, .35);
                display: none;
                box-sizing: border-box;
            }

            #tm-bubble-panel.open {
                display: block;
            }

            #tm-bubble-title {
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 12px;
            }

            #tm-bubble-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            #tm-bubble-color {
                width: 44px;
                height: 36px;
                padding: 0;
                border: 1px solid rgba(255, 255, 255, .2);
                border-radius: 8px;
                cursor: pointer;
                background: transparent;
            }

            #tm-bubble-hex {
                flex: 1;
                min-width: 0;
                padding: 8px 9px;
                border: 1px solid rgba(255, 255, 255, .2);
                border-radius: 8px;
                outline: none;
                background: rgba(255, 255, 255, .08);
                color: white;
                font-size: 13px;
            }

            #tm-bubble-reset {
                width: 100%;
                margin-top: 10px;
                padding: 8px;
                border: 0;
                border-radius: 8px;
                cursor: pointer;
                background: rgba(255, 255, 255, .1);
                color: white;
                font-size: 13px;
            }

            #tm-bubble-reset:hover {
                background: rgba(255, 255, 255, .16);
            }
        `;

        document.head.appendChild(style);
    }

    function init() {
        if (!document.body || !document.head) return;

        injectStyle();
        createCustomizer();
        applyColor(getColor());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
