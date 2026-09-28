# ChatGPT User Bubble Color 🎨

> Customize the color of your own ChatGPT message bubbles.

ChatGPT에서 **내가 보낸 메시지 말풍선 색상**을 원하는 색으로 바꿔주는 Tampermonkey userscript입니다.

## ✨ Features

- 🎨 원하는 색상으로 사용자 말풍선 변경
- 🌈 컬러 피커 + HEX(`#RRGGBB` / `#RGB`) 직접 입력
- 🔁 투명도(0–100%) 슬라이더
- 🎛️ 프리셋 색상 12종 원클릭 적용
- 🔘 한 번에 켜기/끄기
- 🖱️ 설정 버튼 드래그로 위치 이동 (위치 자동 저장)
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

ChatGPT 화면에 **🎨 버튼**이 나타납니다. 드래그로 원하는 위치로 옮길 수 있습니다.

버튼을 누르면 설정 패널이 열립니다.

```text
사용자 말풍선 색상          v2.0.1

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
변경, 드래그 위치 저장·복원, 폴백 선택자까지 확인합니다.

## ⚠️ Notes

- ChatGPT의 DOM 구조는 공식 API가 아니며 언제든 바뀔 수 있습니다.
- ChatGPT가 말풍선 역할을 완전히 없애면 폴백 탐색이 필요합니다. 그럴 경우 Issue로
  알려주시면 선택자를 갱신하겠습니다.
- 설정은 Tampermonkey 저장소(`GM_setValue`)에 보관되므로 브라우저를 지우면 초기화됩니다.

## 📝 Changelog

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
