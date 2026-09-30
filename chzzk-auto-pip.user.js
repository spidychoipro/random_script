// ==UserScript==
// @name         Chzzk Auto PiP
// @namespace    https://github.com/spidychoipro/random_script
// @version      1.1.0
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
    const PIP_STYLE_ID = 'czp-pip-style';
    const PIP_ACTIVE_ATTR = 'data-czp-pip-active';

    // PiP 창 크기는 video 엘리먼트의 고유 크기(videoWidth/videoHeight)를
    // 따라가는 게 정상인데, 치지직 webplayer 가 video 에 width/height 를
    // 붙여버려서 PiP 창이 그 레이아웃 크기를 따라간다. 그러면 보통 PiP 보다
    // 창이 크거나 비율이 이상해진다. PiP 중에 엘리먼트를 고유 크기로 고정하고
    // 플레이어 데코를 걷어내서 일반적인 PiP 모양으로 만든다.
    const PIP_RESET_CSS = `
video[${PIP_ACTIVE_ATTR}] {
    width: var(--czp-pip-w) !important;
    height: var(--czp-pip-h) !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    top: auto !important;
    right: auto !important;
    bottom: auto !important;
    left: auto !important;
    position: static !important;
    transform: none !important;
    object-fit: contain !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: 0 !important;
    filter: none !important;
    clip-path: none !important;
    aspect-ratio: auto !important;
}`.trim();

    // 라이브/다시보기 모두 이 클래스를 쓴다. class 에 webplayer 가 들어가지
    // 않으면 아래 폴백으로 가장 큰 video 를 고른다.
    const VIDEO_SELECTOR = 'video.webplayer-internal-video';

    const DEFAULTS = {
        enabled: true,
        openInNewTab: true,
        autoPipOnTabSwitch: true,
        autoPipOnPlay: true,
        neutralizePlayerStyle: true
    };

    let toastTimer = null;
    let gestureHintShown = false;
    let autoPipOnPlayShown = false;

    function readSettings() {
        const stored = GM_getValue(STORAGE_KEY, {}) || {};

        return {
            enabled: stored.enabled !== false,
            openInNewTab: stored.openInNewTab !== false,
            autoPipOnTabSwitch: stored.autoPipOnTabSwitch !== false,
            autoPipOnPlay: stored.autoPipOnPlay !== false,
            neutralizePlayerStyle: stored.neutralizePlayerStyle !== false
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

    // PiP 중에 webplayer 스타일을 무력화하고, 엘리먼트를 영상 고유 크기로
    // 고정한다. 이게 없으면 PiP 창이 플레이어가 잡아둔 레이아웃 크기를 따라가서
    // 일반적인 PiP 창 모양이 아니다. PiP 끝나면 원래대로 복원한다.
    function applyPipStyle(video) {
        if (!video || !readSettings().neutralizePlayerStyle) {
            return;
        }

        let style = document.getElementById(PIP_STYLE_ID);

        if (!style) {
            style = document.createElement('style');
            style.id = PIP_STYLE_ID;
            style.textContent = PIP_RESET_CSS;
            (document.head || document.documentElement).appendChild(style);
        }

        // PiP 창 크기가 고유 크기를 따라가려면 엘리먼트가 그 크기를 갖도록
        // 고정해야 한다. readyState 가 낮으면 videoWidth 가 0 일 수 있어서
        // 그땐 고정하지 않고 기본에 맡긴다.
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
            video.style.setProperty('--czp-pip-w', `${width}px`);
            video.style.setProperty('--czp-pip-h', `${height}px`);
        }

        video.setAttribute(PIP_ACTIVE_ATTR, '');
    }

    function removePipStyle(video) {
        if (video && video.removeAttribute) {
            video.removeAttribute(PIP_ACTIVE_ATTR);
        }
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

        // 스타일 중化和 enter 를 거의 동시에 해야 새 창에 이미 반영된 상태로
        // 뜨게 된다. 순서 뒤집으면 한 프레임은 플레이어 스타일이 묻어나간다.
        applyPipStyle(video);

        try {
            await video.requestPictureInPicture();

            return { ok: true };
        } catch (err) {
            removePipStyle(video);

            return { ok: false, reason: err && err.name ? err.name : 'unknown' };
        }
    }

    async function exitPip() {
        if (document.pictureInPictureElement && document.exitPictureInPicture) {
            try {
                await document.exitPictureInPicture();
            } catch {
                // 이미 닫혔으면 무시
            } finally {
                removePipStyle(document.pictureInPictureElement);
            }
        }
    }

    // 사용자가 PiP 창을 직접 닫는 경로. 이건 requestPictureInPicture 을 안
    // 썼으므로 위 exitPip 이 안 돈다. 여기서 복원해야 한다.
    function onLeavePip(event) {
        removePipStyle(event && event.target ? event.target : document.pictureInPictureElement);
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

    // 영상 재생이 시작되면 곧바로 PiP 를 띄운다. 단축키 누를 필요 없게.
    // media 이벤트는 안 올라오니까 캡처로 잡는다.
    function onMediaPlay(event) {
        const video = event.target;

        if (!video || video.tagName !== 'VIDEO') {
            return;
        }

        const settings = readSettings();

        if (!settings.enabled || !settings.autoPipOnPlay || !isActive(video)) {
            return;
        }

        if (isInPip(video)) {
            return;
        }

        enterPip(video).then(result => {
            if (result.ok) {
                if (!autoPipOnPlayShown) {
                    autoPipOnPlayShown = true;
                    showToast('영상 켜면 PiP 로 따라갑니다. 끄려면 Alt+Shift+P', 4000);
                }

                return;
            }

            // 제스처가 없어서 막힌 경우. 링크 클릭 경로는 사용자가 곧바로
            // 다른 곳으로 갈 수 있어서 한 번만 안내한다.
            if (result.reason === 'NotAllowedError' && !isInPip(video) && !gestureHintShown) {
                hintGesture();
            }
        });
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
        document.addEventListener('play', onMediaPlay, true);
        document.addEventListener('leavepictureinpicture', onLeavePip, true);
        registerMenu();
    }

    start();

    // jsdom 테스트에서 PiP 진입/이탈을 직접 확인할 수 있게 공개한다.
    if (typeof window !== 'undefined') {
        window.__czpTogglePip = togglePip;
    }
})();
