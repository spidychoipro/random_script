# ChatGPT User Bubble Color 🎨

> Customize the color of your own ChatGPT message bubbles.

ChatGPT에서 **내가 보낸 메시지 말풍선 색상**을 원하는 색으로 바꿔주는 Tampermonkey userscript입니다.

## ✨ Features

- 🎨 원하는 색상으로 사용자 말풍선 변경
- 🌈 컬러 피커 지원
- `#RRGGBB` HEX 색상 직접 입력
- 💾 선택한 색상 자동 저장
- 🔄 페이지를 새로고침해도 설정 유지
- ♻️ 기본 색상으로 원클릭 초기화
- 💬 ChatGPT의 사용자 메시지만 변경

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

ChatGPT 화면 오른쪽 아래에 **🎨 버튼**이 나타납니다.

버튼을 누르면 색상 설정 패널이 열립니다.

```text
사용자 말풍선 색상

[ 🎨 ] [ #2B2D42 ]

[ 기본값으로 초기화 ]
```

컬러 피커를 사용하거나 HEX 값을 직접 입력하면 즉시 적용됩니다.

## 🖥️ Supported

- ChatGPT Web
- `chatgpt.com`
- `chat.openai.com`
- Tampermonkey

## 🔧 How It Works

ChatGPT의 사용자 메시지에 사용되는 다음 클래스를 대상으로 색상을 변경합니다.

```html
user-message-bubble-color
```

따라서 Assistant 메시지나 다른 UI 요소의 색상에는 영향을 주지 않습니다.

## 📁 Project Structure

```text
.
└── chatgpt-user-bubble-color.user.js
```

## ⚠️ Notes

ChatGPT의 UI 구조나 클래스 이름이 변경되면 스크립트가 정상적으로 작동하지 않을 수 있습니다.

문제가 발생하면 Issue를 등록해주세요.

---

Made for customizing your own ChatGPT UI. 🎨
