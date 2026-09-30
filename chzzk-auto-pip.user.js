// ==UserScript==
// @name         Chzzk Auto PiP
// @namespace    https://github.com/spidychoipro/random_script
// @version      1.0.0
// @description  치지직에서 영상 보고 다른 사이트로 이동할 때 자동으로 PiP를 띄워줍니다.
// @author       spidychoipro
// @match        https://chzzk.naver.com/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/spidychoipro/random_script/main/chzzk-auto-pip.user.js
// @downloadURL  https://raw.githubusercontent.com/spidychoipro/random_script/main/chzzk-auto-pip.user.js
// ==/UserScript==

(() => {
    'use strict';

    const STORAGE_KEY = 'chzzk-auto-pip';
    const TOAST_ID = 'czp-toast';

    // 라이브/다시보기 모두 이 클래스를 쓴다. class 에 webplayer 가 들어가지
    // 않으면 아래 폴백으로 가장 큰 video 를 고른다.
    const VIDEO_SELECTOR = 'video.webplayer-internal-video';

    const DEFAULTS = {
        enabled: true,
        openInNewTab: true,
        autoPipOnTabSwitch: true
    };

    let toastTimer = null;
    let gestureHintShown = false;

    function readSettings() {
        const stored = GM_getValue(STORAGE_KEY, {}) || {};

        return {
            enabled: stored.enabled !== false,
            openInNewTab: stored.openInNewTab !== false,
            autoPipOnTabSwitch: stored.autoPipOnTabSwitch !== false
        };
    }

    function writeSettings(patch) {
        const next = { ...readSettings(), ...patch };
        GM_setValue(STORAGE_KEY, next);

        return next;
    }

    // 재생 중이고 프레임이 실제로 나오는 상태인지.
    function isActive(video) {
        if (!video) {
            return false;
        }

        return !video.paused && !video.ended && video.readyState >= 2;
    }

    // 폴백용: 지금 재생 중인 video 중 해상도가 가장 큰 것.
    function pickLargestPlaying(doc) {
        const videos = Array.from(doc.querySelectorAll('video'));
        let best = null;
        let bestArea = 0;

        for (const video of videos) {
            if (!isActive(video)) {
                continue;
            }

            const area = (video.videoWidth || 0) * (video.videoHeight || 0);

            if (area > bestArea) {
                best = video;
                bestArea = area;
            }
        }

        return best;
    }

    function findVideo(doc) {
        const direct = doc.querySelector(VIDEO_SELECTOR);

        if (direct) {
            return direct;
        }

        return pickLargestPlaying(doc);
    }

    // 치지직 안에서의 이동은 SPA 라서 페이지가 버려지지 않는다. 영상은 그대로
    // 살아 있으므로 건드릴 이유가 없다. 다른 사이트로 나갈 때만 가로챈다.
    function resolveExternalUrl(anchor, base) {
        const href = anchor && anchor.getAttribute ? anchor.getAttribute('href') : null;

        if (!href) {
            return null;
        }

        // 같은 문서 안 이동, mailto:, javascript: 등
        if (href.startsWith('#')) {
            return null;
        }

        if (/^(mailto|tel|javascript|data|blob):/i.test(href)) {
            return null;
        }

        let url;

        try {
            url = new URL(anchor.href, base);
        } catch {
            return null;
        }

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }

        if (url.origin === new URL(base).origin) {
            return null;
        }

        return url.href;
    }

    function shouldHijack(anchor, video, opts) {
        const settings = opts.settings;
        const base = opts.base;

        if (!settings.enabled || !settings.openInNewTab) {
            return false;
        }

        if (!isActive(video)) {
            return false;
        }

        // 이미 새 창으로 뜨는 링크는 브라우저가 알아서 한다.
        if (anchor.target && anchor.target !== '_self') {
            return false;
        }

        if (anchor.hasAttribute && anchor.hasAttribute('download')) {
            return false;
        }

        if (anchor.relList && anchor.relList.contains('external')) {
            return false;
        }

        return resolveExternalUrl(anchor, base) !== null;
    }

    function showToast(message, duration) {
        const host = document.body;

        if (!host) {
            return;
        }

        let toast = document.getElementById(TOAST_ID);

        if (!toast) {
            toast = document.createElement('div');
            toast.id = TOAST_ID;
            toast.style.cssText = [
                'position:fixed',
                'left:50%',
                'bottom:32px',
                'transform:translateX(-50%)',
                'z-index:2147483647',
                'padding:10px 16px',
                'border-radius:10px',
                'background:rgba(20,20,22,.94)',
                'color:#FFFFFF',
                'font:13px/1.4 system-ui,-apple-system,sans-serif',
                'box-shadow:0 8px 24px rgba(0,0,0,.4)',
                'pointer-events:none',
                'opacity:0',
                'transition:opacity .2s ease',
                'max-width:80vw',
                'text-align:center'
            ].join(';');
            host.appendChild(toast);
        }

        toast.textContent = message;
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
        });

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 250);
        }, duration || 3500);
    }

    function isInPip(video) {
        return Boolean(document.pictureInPictureElement) &&
            (!video || document.pictureInPictureElement === video);
    }

    // 사용자 제스처가 있어야 브라우저가 허락한다. 실패하면 사유를 돌려주고
    // 호출하는 쪽이 토스트로 알려준다.
    async function enterPip(video) {
        if (!video || typeof video.requestPictureInPicture !== 'function') {
            return { ok: false, reason: 'unsupported' };
        }

        if (isInPip(video)) {
            return { ok: true, already: true };
        }

        if (document.pictureInPictureEnabled === false) {
            return { ok: false, reason: 'disabled' };
        }

        try {
            await video.requestPictureInPicture();

            return { ok: true };
        } catch (err) {
            return { ok: false, reason: err && err.name ? err.name : 'unknown' };
        }
    }

    async function exitPip() {
        if (document.pictureInPictureElement && document.exitPictureInPicture) {
            try {
                await document.exitPictureInPicture();
            } catch {
                // 이미 닫혔으면 무시
            }
        }
    }

    function hintGesture() {
        if (gestureHintShown) {
            return;
        }

        gestureHintShown = true;
        showToast('PiP 를 열려면 Alt+Shift+P 를 누르세요.', 4500);
    }

    async function togglePip() {
        const video = findVideo(document);

        if (!video) {
            showToast('재생 중인 영상이 없습니다.', 2500);

            return;
        }

        if (isInPip(video)) {
            await exitPip();

            return;
        }

        const result = await enterPip(video);

        if (!result.ok && result.reason === 'unsupported') {
            showToast('이 브라우저는 PiP 를 지원하지 않습니다.', 3500);
        }
    }

    async function onDocumentClick(event) {
        if (event.defaultPrevented) {
            return;
        }

        // 중간 클릭, ctrl/cmd/shift, 우클릭은 브라우저에 맡긴다.
        if (event.button !== 0) {
            return;
        }

        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
            return;
        }

        const target = event.target;

        if (!target || typeof target.closest !== 'function') {
            return;
        }

        const anchor = target.closest('a[href]');

        if (!anchor) {
            return;
        }

        const video = findVideo(document);
        const settings = readSettings();

        if (!shouldHijack(anchor, video, { settings, base: location.origin })) {
            return;
        }

        event.preventDefault();

        // 제스처가 살아있는 동안에 둘 다 시도한다. 순서가 중요함.
        const pipPromise = enterPip(video);
        const opened = window.open(anchor.href, '_blank', 'noopener');
        const pip = await pipPromise;

        if (pip.ok) {
            showToast('영상은 PiP 로 옮겼습니다. 새 탭에서 계속 보세요.', 3500);

            return;
        }

        if (opened) {
            showToast('PiP 는 열지 못했습니다. 영상은 새 탭에 남아 있습니다.', 4500);

            return;
        }

        showToast('팝업이 막혀서 새 탭을 못 열었습니다.', 4500);
    }

    function onKeyDown(event) {
        if (event.altKey && event.shiftKey && (event.code === 'KeyP' || event.key === 'p' || event.key === 'P')) {
            event.preventDefault();
            togglePip();
        }
    }

    // 탭을 백그라운드로 보낼 때 치지직이 스스로 일시정지하는 경우가 있어서
    // 되살린다. 그래야 PiP 에서 소리가 끊기지 않는다.
    function onVisibilityChange() {
        if (document.visibilityState !== 'hidden') {
            return;
        }

        const video = findVideo(document);
        const settings = readSettings();

        if (!settings.enabled || !isActive(video)) {
            return;
        }

        if (settings.autoPipOnTabSwitch && !isInPip(video)) {
            enterPip(video).then(result => {
                if (!result.ok && !isInPip(video)) {
                    hintGesture();
                }
            });
        }
    }

    function registerMenu() {
        if (typeof GM_registerMenuCommand !== 'function') {
            return;
        }

        GM_registerMenuCommand('PiP 열기 / 닫기 (Alt+Shift+P)', togglePip);

        GM_registerMenuCommand('다른 사이트로 갈 때 자동 PiP', () => {
            const next = writeSettings({ enabled: !readSettings().enabled });
            showToast(`자동 PiP ${next.enabled ? '켜짐' : '꺼짐'}`, 2000);
        });

        GM_registerMenuCommand('새 탭으로 열기', () => {
            const next = writeSettings({ openInNewTab: !readSettings().openInNewTab });
            showToast(`새 탭으로 열기 ${next.openInNewTab ? '켜짐' : '꺼짐'}`, 2000);
        });

        GM_registerMenuCommand('탭 전환 시 자동 PiP', () => {
            const next = writeSettings({ autoPipOnTabSwitch: !readSettings().autoPipOnTabSwitch });
            showToast(`탭 전환 시 자동 PiP ${next.autoPipOnTabSwitch ? '켜짐' : '꺼짐'}`, 2000);
        });

        GM_registerMenuCommand('기본값으로 되돌리기', () => {
            GM_setValue(STORAGE_KEY, { ...DEFAULTS });
            showToast('기본값으로 되돌렸습니다.', 2000);
        });
    }

    function start() {
        document.addEventListener('click', onDocumentClick, true);
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('visibilitychange', onVisibilityChange, true);
        registerMenu();
    }

    start();
})();
