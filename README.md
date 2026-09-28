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
사용자 말풍선 색상          v2.0.0

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

v2.0.0은 예전의 하드코딩된 클래스(`user-message-bubble-color`)에 의존하지 않고,
ChatGPT가 실제로 쓰는 역할 기반 속성을 1순위로 사용합니다.

| 순서 | 선택자 |
| --- | --- |
| 1순위 | `[data-message-author-role="user"] .whitespace-pre-wrap` |
| 1순위 | `[data-message-author-role="user"] .markdown` |
| 2순위 | `[data-turn="user"] .whitespace-pre-wrap` / `.markdown` |
| 3순위 | `.user-message-bubble-color` (구버전 호환) |
| 폴백 | 위를 모두 못 찾으면 역할 컨테이너에서 콘텐츠 노드를 직접 탐색 |

1순위 선택자가 DOM에 있으면 CSS만으로 처리하고, 하나도 없으면 JS가 `tm-user-bubble-active`
클래스를 직접 붙입니다. 색상은 CSS 변수로 주입되므로(`--tm-ub-bg`, `--tm-ub-fg`)
스타일 시트를 다시 만들 필요가 없습니다. 비활성화 상태에서는 `revert`로 ChatGPT 기본값을
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

- **2.0.0** — 현재 ChatGPT DOM(`data-message-author-role` / `data-turn`) 기준으로
  선택자 전면 개편, 투명도·프리셋·토글·드래그gable 버튼·단축키·메뉴 명령 추가
- **1.1.0** — 컬러 피커, HEX 입력, 자동 저장
- **1.0.0** — 최초 공개

---

Made for customizing your own ChatGPT UI. 🎨
