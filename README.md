# ChatGPT User Bubble Color 🎨

> Customize the color of your own ChatGPT message bubbles.

ChatGPT에서 **내가 보낸 메시지 말풍선 색상**을 원하는 색으로 바꿔주는 Tampermonkey userscript입니다.

## ✨ Features

- 🎨 원하는 색상으로 사용자 말풍선 변경
- 🌈 컬러 피커 + HEX(`#RRGGBB` / `#RGB`) 직접 입력
- 🔁 투명도(0–100%) 슬라이더
- 🎛️ 프리셋 색상 12종 원클릭 적용
- 🔘 한 번에 켜기/끄기
- 🖱️ 설정 버튼 드래그로 위치 이동 (위치 자동 저장, 화면 밖으로 못 나가게 제한)
- 📐 설정 패널은 버튼 위치에 맞춰 자동으로 위/아래·좌/우를 결정하고 항상 화면 안에 표시
- ⌨️ `Alt+Shift+C` 단축키로 패널 토글
- 📋 Tampermonkey 메뉴에서도 열기 / 초기화
- 💾 색상·투명도·상태 자동 저장, 새로고침해도 유지
- 🌓 밝은 색에도 어두운 색에도 자동 대비 텍스트 적용 (WCAG 대비 계산)

## 📦 Installation

먼저 [Tampermonkey](https://www.tampermonkey.net/)를 설치하세요.

### One-click Install

**[🎨 Install Script](https://raw.githubusercontent.com/spidychoipro/random_script/main/chatgpt-user-bubble-color.user.js)**

링크를 클릭하면 Tampermonkey의 설치 화면이 열립니다.

### Manual Installation

1. `chatgpt-user-bubble-color.user.js` 파일을 엽니다.
2. 파일 내용을 복사합니다.
3. Tampermonkey → **Create a new script**
4. 기존 내용을 삭제합니다.
5. 복사한 코드를 붙여넣습니다.
6. 저장합니다.

## 🎨 Usage

ChatGPT 화면에 **🎨 버튼**이 나타납니다. 드래그로 원하는 위치로 옮길 수 있고,
버튼이 화면 가장자리 밖으로 나가지 않습니다.

버튼을 누르면 설정 패널이 열립니다. 패널은 버튼 위치에 맞춰 자동으로 방향을 결정하고
항상 화면 안에 완전히 들어오게 표시됩니다. 화면이 좁아서 패널이 들어가지 않으면
패널 내부만 스크롤됩니다.

```text
사용자 말풍선 색상          v2.1.0

[ 🎨 ] [ #2B2D42 ]

투명도              100%
[ ==================== ]

[■][■][■][■][■][■]
[■][■][■][■][■][■]

[  비활성화  ] [  초기화  ]

색상을 선택하면 즉시 적용됩니다.
버튼을 드래그해 위치를 바꿀 수 있습니다.
```

컬러 피커, 프리셋, HEX 입력, 투명도 슬라이더 어디서든 변경하면 즉시 모든 대화의
사용자 말풍선에 적용됩니다.

## 🖥️ Supported

- ChatGPT Web
- `chatgpt.com`
- `chat.openai.com`
- Tampermonkey

## 🔧 How It Works

사용자 말풍선은 ChatGPT가 직접 스타일링하는 요소이므로, **배경색과 텍스트 색만**
덮어씁니다. `padding`·`border-radius`·`max-width`는 ChatGPT가 소유하는 값이라 건드리지
않습니다.

```html
<div class="corner-superellipse/0.98 relative min-w-0 overflow-hidden
            rounded-[22px] px-4 py-2.5 leading-6
            user-message-bubble-color max-w-(--user-chat-width,70%)">
  <div class="max-w-full min-w-0 [overflow-wrap:anywhere] whitespace-pre-wrap">…</div>
</div>
```

위 마크업에서 색을 칠할 대상은 바깥 `div`이고, `whitespace-pre-wrap`은 **텍스트 컨테이너**입니다.

| 순서 | 대상 | 처리 |
| --- | --- | --- |
| 1순위 | `.user-message-bubble-color` | 배경·텍스트 색만 변경 |
| 2순위 | `[data-message-author-role="user"]` / `[data-turn="user"]` 안의 콘텐츠 노드 | 말풍선이 없을 때만 말풍선 모양까지 생성 |
| 폴백 | 위를 모두 못 찾으면 텍스트 노드 최상위 부모를 탐색 | JS가 `tm-user-bubble-active` 부여 |

2순위 선택자는 `:not(.user-message-bubble-color *)`로 실제 말풍선 내부를 제외합니다.
이게 없으면 말풍선 안에 말풍선이 또 생깁니다.

`user-message-bubble-color`가 DOM에 있으면 CSS만으로 처리하고, 없을 때만 JS가
클래스를 붙입니다. 색상은 CSS 변수로 주입되므로(`--tm-ub-bg`, `--tm-ub-fg`) 스타일
시트를 다시 만들 필요가 없습니다. 비활성화 상태에서는 `revert`로 ChatGPT 기본값을
그대로 복원합니다.

## 📁 Project Structure

```text
.
├── chatgpt-user-bubble-color.user.js
├── test-helpers.cjs        # 색상/투명도/대비 계산 단위 테스트
├── test-dom.cjs            # jsdom 기반 DOM 동작 테스트
├── package.json
└── README.md
```

## 🧪 Development

```bash
npm install
npm test
```

`test-helpers.cjs`는 순수 함수(HEX 정규화, rgba 변환, WCAG 대비 텍스트 색)를 검증하고,
`test-dom.cjs`는 jsdom에서 실제 스크립트를 실행해 스타일 주입, 패널 토글, 색상/투명도
변경, 드래그 위치 저장·복원, 패널의 화면 내 배치(모서리·낮은 높이·창 크기 변경),
폴백 선택자까지 확인합니다.

## ⚠️ Notes

- ChatGPT의 DOM 구조는 공식 API가 아니며 언제든 바뀔 수 있습니다.
- ChatGPT가 말풍선 역할을 완전히 없애면 폴백 탐색이 필요합니다. 그럴 경우 Issue로
  알려주시면 선택자를 갱신하겠습니다.
- 설정은 Tampermonkey 저장소(`GM_setValue`)에 보관되므로 브라우저를 지우면 초기화됩니다.

## 📝 Changelog

- **2.1.0** — [#1](https://github.com/spidychoipro/random_script/issues/1) 패널이 버튼 위치와
  무관하게 고정 위치에 열려서 화면 밖으로 나가는 문제 수정. 패널을 `position: fixed`로 바꾸고
  버튼 실제 좌표·패널 실제 크기를 잰 뒤 위/아래·좌/우 후보 중 화면 안에 들어가는 쪽으로
  자동 배치하도록 변경. 하드코딩된 260px 뒤집기 기준 제거. 버튼 위치 저장 방식을
  `left/top`으로 바꾸고 창 크기가 바뀌거나 화면 밖으로 밀려났을 때 화면 안으로 당기는
  클램프 추가. 드래그 직후 패널이 자동으로 열리던 동작도 제거
- **2.0.1** — 실제 라이브 DOM 확인 결과 `user-message-bubble-color`가 말풍선 요소에
  그대로 남아 있음을 확인. 말풍선이 아닐 때만 fallback 선택자가stylish히 적용되도록
  `:not(.user-message-bubble-color *)` 가드를 추가하고, 실제 말풍선의
  `padding`/`border-radius` 오버라이드를 제거
- **2.0.0** — 현재 ChatGPT DOM(`data-message-author-role` / `data-turn`) 기준으로
  선택자 전면 개편, 투명도·프리셋·토글·드래그gable 버튼·단축키·메뉴 명령 추가
- **1.1.0** — 컬러 피커, HEX 입력, 자동 저장
- **1.0.0** — 최초 공개

---

Made for customizing your own ChatGPT UI. 🎨

---

# 📺 Chzzk Auto PiP

> Keep the Chzzk stream in Picture-in-Picture when you leave for another site.

치지직에서 영상 보다가 다른 사이트로 이동하면 PiP 창도 같이 꺼집니다.
영상 따라가는 걸 귀찮아서 만든 Tampermonkey userscript입니다.

## ✨ Features

- 📺 영상만 켜면 자동으로 PiP가 붙습니다. 단축키를 누를 필요가 없습니다
- 🔗 다른 사이트 링크를 클릭하면 목적지를 새 탭으로 엽니다
- 📡 라이브 방송, 다시보기 영상 모두 지원
- ⌨️ `Alt+Shift+P`로 PiP 수동 토글
- 🖥️ 다른 탭으로 전환하면 자동으로 PiP를 띄웁니다
- 📐 PiP 창이 플레이어 레이아웃 크기를 따르지 않고 영상 고유 크기로 열립니다
- 📋 Tampermonkey 메뉴에서 기능별 on/off
- 💭 PiP가 브라우저에 막히면 `Alt+Shift+P`를 누르라고 안내합니다
- 💾 설정 자동 저장

## 📦 Installation

먼저 [Tampermonkey](https://www.tampermonkey.net/)를 설치하세요.

### One-click Install

**[📺 Install Script](https://raw.githubusercontent.com/spidychoipro/random_script/main/chzzk-auto-pip.user.js)**

링크를 클릭하면 Tampermonkey의 설치 화면이 열립니다.

### Manual Installation

1. `chzzk-auto-pip.user.js` 파일을 엽니다.
2. 파일 내용을 복사합니다.
3. Tampermonkey → **Create a new script**
4. 기존 내용을 삭제합니다.
5. 복사한 코드를 붙여넣습니다.
6. 저장합니다.

## 📺 Usage

영상만 켜면 곧바로 PiP가 붙습니다. 단축키를 누르거나 링크를 클릭할 필요가 없습니다.
그 뒤로 다른 사이트로 가는 링크를 누르면 그 링크만 **새 탭**으로 열리고,
영상은 PiP로 계속 떠 있습니다. PiP 제목을 클릭하면 닫히고, `Alt+Shift+P`로 다시 열 수 있습니다.

## 🔧 PiP 창 크기

PiP 창 크기는 보통 영상의 고유 크기(`videoWidth`/`videoHeight`)를 따라갑니다.
그런데 치지직 webplayer가 video 엘리먼트에 `width`/`height`를 붙여버려서, 그대로 두면
PiP 창이 플레이어가 잡아둔 레이아웃 크기를 따라가게 됩니다. 그래서 평소 PiP 창보다
크거나 비율이 이상해 보입니다.

이 스크립트는 PiP에 들어가는 순간 엘리먼트를 고유 크기로 고정하고
(`object-fit: contain`), 플레이어가 거는 데코를 걷어냅니다. PiP에서 나오면
원래대로 복원됩니다. 이 동작은 Tampermonkey 메뉴의 `PiP 모양 보정`으로 끌 수 있습니다.

## 🖥️ Supported

- 치지직 라이브 · 다시보기
- `chzzk.naver.com`
- Tampermonkey

## 🔧 How It Works

영상이 MSE(`blob:`)로 재생되고 있어서, 치지직 탭이 사라지면 PiP 창도 함께
꺼집니다. 그래서 링크 이동을 막고 PiP를 먼저 띄운 뒤, 목적지를 새 탭으로
열어서 치지직 탭을 남겨 둡니다. 치지직 탭이 살아 있으면 PiP도 살아 있습니다.

라이브와 다시보기는 모두 `video.webplayer-internal-video`를 쓰고 있어서 하나의
선택자로 잡힙니다. 혹시 바뀔까봐 폴백으로 재생 중인 video 중 해상도가 가장 큰
것을 고르는 로직도 있습니다.

아래는 **건드리지 않고** 브라우저에 그대로 맡깁니다.

- 치지직 안에서의 이동 (SPA 이동이라 영상은 그대로 살아 있음)
- `target="_blank"` 링크, `ctrl`/`cmd`/`shift` + 클릭, 우클릭
- 일시정지 상태의 영상
- `mailto:`·`tel:`·`javascript:` 같은 링크, `download` 속성 링크

## ⚠️ Notes

- **주소창에 직접 url 을 치거나 브라우저 뒤로가기로 나갈 땐 PiP 가 남지 않습니다.**
  탭이 닫히는 걸 유저스크립트로는 막을 수 없어서, 링크 클릭만 가로챕니다.
- 링크를 누르면 같은 탭이 아니라 **새 탭**이 열립니다. 탐색 방식이 달라지는
  점에 주의하세요.
- 치지직 DOM은 공식 API가 아니라 언제든 바뀔 수 있습니다. 영상 인식이 안 되면
  Issue로 알려주시면 선택자를 갱신하겠습니다.
- PiP는 브라우저 정책상 사용자 동작(클릭 등)이 있어야 붙습니다. 영상 재생 시작
  시점에는 이 제스처가 남아 있을 때가 많지만, 브라우저가 막으면 그때는
  `Alt+Shift+P`가 필요하고 토스트로 안내합니다.
- 설정은 Tampermonkey 저장소(`GM_setValue`)에 보관되므로 브라우저를 지우면
  초기화됩니다.

## 📝 Changelog

- **1.1.0** — [#7](https://github.com/spidychoipro/random_script/issues/7) 영상 재생 시작만으로
  PiP가 자동으로 붙게 변경. `Alt+Shift+P`를 누를 필요가 없어짐. PiP 창이 플레이어
  레이아웃 크기를 따라가던 문제도 고쳐서 영상 고유 크기로 열리게 함
- **1.0.0** — 최초 공개
