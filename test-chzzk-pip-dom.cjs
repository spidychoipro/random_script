const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const SCRIPT = fs.readFileSync('chzzk-auto-pip.user.js', 'utf8');

const CHZZK = 'https://chzzk.naver.com';
const OTHER = 'https://example.com/page';

// 실제로 치지직이 넘기는 라이브/다시보기 video 마크업.
const LIVE_VIDEO = '<video class="webplayer-internal-video" playsinline="" controlslist="nodownload" ' +
    'x-webkit-airplay="" webkit-playsinline="" width="100%" height="100%" ' +
    'src="blob:https://chzzk.naver.com/6a0e543e-686d-4138-a528-951b68245bf0"></video>';

const VOD_VIDEO = '<video class="webplayer-internal-video" playsinline="" controlslist="nodownload" ' +
    'x-webkit-airplay="" webkit-playsinline="" width="100%" height="100%" ' +
    'poster="https://video-phinf.pstatic.net/20260930_116/1790711335946Kjo4j_JPEG/U460o5XEG7_07.jpg" ' +
    'src="blob:https://chzzk.naver.com/a5e926c8-aa8d-41e1-bd13-64edb03ce8e1"></video>';

const NO_CLASS_VIDEO = '<video src="blob:https://chzzk.naver.com/abc" muted></video>';

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
    if (condition) {
        passed += 1;
        console.log('ok  ', name);
    } else {
        failed += 1;
        console.log('FAIL', name, detail === undefined ? '' : detail);
    }
}

function waitForLoad(window) {
    return new Promise(resolve => {
        if (window.document.readyState === 'complete') {
            resolve();
            return;
        }

        window.addEventListener('load', () => resolve(), { once: true });
    });
}

function page(body, url = `${CHZZK}/live/abc`) {
    return `<!doctype html><html><head></head><body>${body}</body></html>`;
}

function externalLink(href = OTHER) {
    return `<a id="ext" href="${href}">다른 사이트</a>`;
}

function internalLink(href = `${CHZZK}/live/other`) {
    return `<a id="int" href="${href}">다른 방송</a>`;
}

// jsdom 은 media 재생과 PiP 를 구현하지 않으므로 필요한 부분만 흉내낸다.
function stubVideo(window, video, options = {}) {
    Object.defineProperty(video, 'paused', { value: options.paused ?? false, configurable: true });
    Object.defineProperty(video, 'ended', { value: options.ended ?? false, configurable: true });
    Object.defineProperty(video, 'readyState', { value: options.readyState ?? 4, configurable: true });
    Object.defineProperty(video, 'videoWidth', { value: options.width ?? 1920, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: options.height ?? 1080, configurable: true });

    const calls = { pip: 0, reject: false, opened: [] };
    video.requestPictureInPicture = () => {
        calls.pip += 1;

        if (calls.reject) {
            const err = new Error('gesture required');
            err.name = 'NotAllowedError';

            return Promise.reject(err);
        }

        window.document.pictureInPictureElement = video;

        return Promise.resolve({});
    };

    return calls;
}

function click(window, element) {
    element.dispatchEvent(new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0
    }));
}

async function scenario(name, html, prepare, assert) {
    const store = new Map();
    // preventDefault 하지 않는 케이스에서 jsdom 이 실제 탐색을 시도하며
    // "Not implemented: navigation" 을 찍는다. 의도된 동작이라 숨긴다.
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', () => {});

    const dom = new JSDOM(html, {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        url: CHZZK,
        virtualConsole
    });

    const { window } = dom;
    const doc = window.document;

    window.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
    window.GM_setValue = (key, value) => store.set(key, value);
    window.GM_registerMenuCommand = () => {};
    window.document.exitPictureInPicture = () => Promise.resolve();

    const opened = [];
    window.open = (url) => {
        opened.push(url);

        return { closed: false };
    };

    await waitForLoad(window);
    window.eval(SCRIPT);

    const ctx = prepare({ window, doc, opened });
    await new Promise(resolve => setTimeout(resolve, 30));

    // assert 는 async 일 수 있다 (PiP 진입/이탈 확인). 끝까지 기다려야
    // 요약 출력 뒤에 결과가 뒤섞이지 않는다.
    await assert({ window, doc, opened, calls: ctx });
}

async function main() {
    // 라이브: 외부 링크 클릭 -> 이동 막고 새 탭 + PiP
    await scenario(
        'live',
        page(LIVE_VIDEO + externalLink()),
        ({ window, doc }) => {
            const video = doc.querySelector('video');

            return stubVideo(window, video);
        },
        ({ doc, opened, calls }) => {
            const link = doc.getElementById('ext');
            const prevented = !link.dispatchEvent(
                new doc.defaultView.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
            );

            check('live: external click prevented', prevented);
            check('live: opened new tab with the href', opened.includes(OTHER), JSON.stringify(opened));
            check('live: requested PiP', calls.pip === 1, calls.pip);
        }
    );

    // 다시보기: 같은 video 마크업이므로 동일하게 동작해야 한다
    await scenario(
        'vod',
        page(VOD_VIDEO + externalLink()),
        ({ window, doc }) => stubVideo(window, doc.querySelector('video')),
        ({ doc, opened, calls }) => {
            click(doc.defaultView, doc.getElementById('ext'));
            check('vod: opened new tab', opened.includes(OTHER), JSON.stringify(opened));
            check('vod: requested PiP', calls.pip === 1, calls.pip);
        }
    );

    // 치지직 내부 이동은 SPA 라서 가로채지 않는다
    await scenario(
        'internal',
        page(LIVE_VIDEO + internalLink()),
        ({ window, doc }) => stubVideo(window, doc.querySelector('video')),
        ({ doc, opened, calls }) => {
            const link = doc.getElementById('int');
            const notPrevented = link.dispatchEvent(
                new doc.defaultView.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
            );

            check('internal: navigation not blocked', notPrevented);
            check('internal: no new tab', opened.length === 0, JSON.stringify(opened));
            check('internal: no PiP request', calls.pip === 0, calls.pip);
        }
    );

    // 재생 중이 아니면 아무것도 안 건드린다
    await scenario(
        'paused',
        page(LIVE_VIDEO + externalLink()),
        ({ window, doc }) => stubVideo(window, doc.querySelector('video'), { paused: true }),
        ({ doc, opened, calls }) => {
            const link = doc.getElementById('ext');
            const notPrevented = link.dispatchEvent(
                new doc.defaultView.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
            );

            check('paused: navigation not blocked', notPrevented);
            check('paused: no new tab', opened.length === 0, JSON.stringify(opened));
            check('paused: no PiP request', calls.pip === 0, calls.pip);
        }
    );

    // PiP가 거부돼도 새 탭은 이미 열려 있어야 한다 (영상 손실 방지)
    await scenario(
        'pip-rejected',
        page(LIVE_VIDEO + externalLink()),
        ({ window, doc }) => {
            const calls = stubVideo(window, doc.querySelector('video'));
            calls.reject = true;

            return calls;
        },
        ({ doc, opened }) => {
            click(doc.defaultView, doc.getElementById('ext'));
            check('rejected: still opened a new tab', opened.includes(OTHER), JSON.stringify(opened));
        }
    );

    // 이미 PiP 중이면 중복 요청하지 않는다
    await scenario(
        'already-in-pip',
        page(LIVE_VIDEO + externalLink()),
        ({ window, doc }) => {
            const video = doc.querySelector('video');
            doc.pictureInPictureElement = video;

            return stubVideo(window, video);
        },
        ({ doc, opened, calls }) => {
            click(doc.defaultView, doc.getElementById('ext'));
            check('already in PiP: still opened a new tab', opened.includes(OTHER), JSON.stringify(opened));
            check('already in PiP: no duplicate request', calls.pip === 0, calls.pip);
        }
    );

    // target=_blank 링크는 브라우저에 맡긴다
    await scenario(
        'target-blank',
        page(LIVE_VIDEO + '<a id="ext" href="' + OTHER + '" target="_blank">새창</a>'),
        ({ window, doc }) => stubVideo(window, doc.querySelector('video')),
        ({ doc, opened, calls }) => {
            const link = doc.getElementById('ext');
            const notPrevented = link.dispatchEvent(
                new doc.defaultView.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
            );

            check('target blank: navigation not blocked', notPrevented);
            check('target blank: we did not open a tab', opened.length === 0, JSON.stringify(opened));
            check('target blank: no PiP request', calls.pip === 0, calls.pip);
        }
    );

    // ctrl+클릭(새 탭 열기)은 브라우저가 처리하게 둔다
    await scenario(
        'ctrl-click',
        page(LIVE_VIDEO + externalLink()),
        ({ window, doc }) => stubVideo(window, doc.querySelector('video')),
        ({ doc, opened, calls }) => {
            const link = doc.getElementById('ext');
            const notPrevented = link.dispatchEvent(new doc.defaultView.MouseEvent('click', {
                bubbles: true, cancelable: true, button: 0, ctrlKey: true
            }));

            check('ctrl+click: navigation not blocked', notPrevented);
            check('ctrl+click: no new tab from us', opened.length === 0, JSON.stringify(opened));
            check('ctrl+click: no PiP request', calls.pip === 0, calls.pip);
        }
    );

    // webplayer 클래스가 없으면 재생 중인 가장 큰 video를 고른다
    await scenario(
        'fallback-select',
        page(NO_CLASS_VIDEO + externalLink()),
        ({ window, doc }) => {
            const videos = doc.querySelectorAll('video');
            stubVideo(window, videos[0], { width: 320, height: 180 });

            return { count: videos.length };
        },
        ({ doc, opened }) => {
            click(doc.defaultView, doc.getElementById('ext'));
            check('fallback: still opened a new tab', opened.includes(OTHER), JSON.stringify(opened));
        }
    );

    // video 가 아예 없으면 아무 일도 없다
    await scenario(
        'no-video',
        page(externalLink()),
        () => ({}),
        ({ doc, opened }) => {
            const link = doc.getElementById('ext');
            const notPrevented = link.dispatchEvent(
                new doc.defaultView.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
            );

            check('no video: navigation not blocked', notPrevented);
            check('no video: no new tab', opened.length === 0, JSON.stringify(opened));
        }
    );

    // 영상 재생 시작만으로 PiP 요청이 나간다. 단축키나 링크 클릭이 없어도 된다.
    await scenario(
        'auto-on-play',
        page(LIVE_VIDEO),
        ({ window, doc }) => stubVideo(window, doc.querySelector('video')),
        ({ doc, calls }) => {
            check('auto: no PiP before playback starts', calls.pip === 0, calls.pip);

            doc.querySelector('video').dispatchEvent(new doc.defaultView.Event('play'));
            check('auto: play event requests PiP', calls.pip === 1, calls.pip);
        }
    );

    // 이미 PiP 인데 또 play 가 와도 중복 요청하지 않는다
    await scenario(
        'auto-on-play-twice',
        page(LIVE_VIDEO),
        ({ window, doc }) => stubVideo(window, doc.querySelector('video')),
        ({ doc, calls }) => {
            const video = doc.querySelector('video');
            video.dispatchEvent(new doc.defaultView.Event('play'));
            video.dispatchEvent(new doc.defaultView.Event('play'));
            check('auto: repeated play does not re-request', calls.pip === 1, calls.pip);
        }
    );

    // 재생 안 하고 멈춰있을 땐 자동 PiP 안 된다
    await scenario(
        'auto-on-play-paused',
        page(LIVE_VIDEO),
        ({ window, doc }) => stubVideo(window, doc.querySelector('video'), { paused: true }),
        ({ doc, calls }) => {
            doc.querySelector('video').dispatchEvent(new doc.defaultView.Event('play'));
            check('auto: paused video does not trigger PiP', calls.pip === 0, calls.pip);
        }
    );

    // PiP 에서는 플레이어 스타일을 걷어내고 고유 크기로 고정한다.
    // 이게 없으면 PiP 창이 플레이어 레이아웃 크기를 따라간다.
    await scenario(
        'pip-style',
        page(LIVE_VIDEO),
        ({ window, doc }) => {
            const video = doc.querySelector('video');
            const calls = stubVideo(window, video, { width: 1920, height: 1080 });

            return calls;
        },
        async ({ doc, window }) => {
            const video = doc.querySelector('video');

            // 치지직 플레이어가 거는 스타일 흉내
            video.style.transform = 'scale(1.4)';
            video.style.position = 'absolute';
            video.style.width = '760px';

            window.__czpTogglePip();
            await new Promise(resolve => setTimeout(resolve, 30));

            check('pip-style: style element injected',
                doc.getElementById('czp-pip-style') !== null);
            check('pip-style: video marked', video.hasAttribute('data-czp-pip-active'));
            check('pip-style: pinned to intrinsic width',
                video.style.getPropertyValue('--czp-pip-w') === '1920px',
                video.style.getPropertyValue('--czp-pip-w'));
            check('pip-style: pinned to intrinsic height',
                video.style.getPropertyValue('--czp-pip-h') === '1080px',
                video.style.getPropertyValue('--czp-pip-h'));
        }
    );

    // PiP 끝나면 표시했던 속성은 되돌린다
    await scenario(
        'pip-style-restore',
        page(LIVE_VIDEO),
        ({ window, doc }) => stubVideo(window, doc.querySelector('video')),
        async ({ doc, window }) => {
            const video = doc.querySelector('video');
            video.style.width = '760px';

            window.__czpTogglePip();
            await new Promise(resolve => setTimeout(resolve, 30));
            check('restore: marked while in PiP', video.hasAttribute('data-czp-pip-active'));

            window.__czpTogglePip();
            await new Promise(resolve => setTimeout(resolve, 30));
            check('restore: attribute cleared after exit',
                !video.hasAttribute('data-czp-pip-active'));
        }
    );

    // readyState 낮아서 videoWidth 가 0 이면 크기 고정을 건너뛴다
    await scenario(
        'pip-style-no-dimensions',
        page(LIVE_VIDEO),
        ({ window, doc }) => stubVideo(window, doc.querySelector('video'), { width: 0, height: 0 }),
        async ({ doc, window }) => {
            const video = doc.querySelector('video');

            window.__czpTogglePip();
            await new Promise(resolve => setTimeout(resolve, 30));

            check('no-dimensions: still marked', video.hasAttribute('data-czp-pip-active'));
            check('no-dimensions: no bogus size pinned',
                video.style.getPropertyValue('--czp-pip-w') === '',
                video.style.getPropertyValue('--czp-pip-w'));
        }
    );

    console.log('');
    console.log(`total: ${passed + failed}, passed: ${passed}, failed: ${failed}`);

    if (failed > 0) {
        process.exit(1);
    }
}

main();
