<div align="center">

# 💬 Arixo Web

**A modern, production-grade WhatsApp Web clone built with Next.js 16, React 19, TypeScript, Tailwind CSS, and WebRTC.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![E2EE](https://img.shields.io/badge/Security-AES--GCM%20256-emerald?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)

<br />

<img src="./public/banner.jpg" alt="Arixo Web UI Preview" width="100%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.25);" />

<br />
<br />

**Arixo Web** brings the familiar, refined WhatsApp Web experience to modern web architectures — complete with real-time Server-Sent Events, WebRTC voice/video calling, end-to-end encryption, group collaboration, status stories, voice notes, and AI assistance.

</div>

---

## 🌟 Highlights & Key Features

### 🔒 End-to-End Encryption (E2EE)
- **AES-GCM 256-Bit Cryptography**: Uses the browser's native Web Crypto API (`crypto.subtle`) for client-side encryption.
- **Deterministic Key Derivation**: AES keys are derived per conversation using PBKDF2/SHA-256, ensuring messages remain unreadable to eavesdroppers and servers alike.
- **Secure Group Encryption**: Conversation members share key derivation logic without storing raw plaintexts in databases.

### ⚡ Real-Time Messaging & Deduplication
- **SSE Stream + Fallback Sync**: High-efficiency Server-Sent Events (`connectChatStream`) deliver instantaneous message updates with zero latency.
- **Optimistic UI Updates**: Immediate message appearance with client-generated IDs that seamlessly reconcile with server broadcasts without duplicates or screen flashes.
- **WhatsApp Quoted Replies**: Reply directly to specific messages with preview cards in both direct and group conversations.
- **Read Receipts & Ticks**: Real-time delivered and read ticks (double blue checkmarks) with formatted timestamps.

### 🗑️ "Delete for Me" & "Delete for Everyone"
- **Interactive WhatsApp Confirmation Modal**: Prompts users to choose between local deletion or global revocation.
- **Delete for Everyone**:
  - Sender: Displays an authentic revoked indicator: *"You deleted this message"* with 🚫 icon.
  - Recipient: Instant real-time update displaying *"This message was deleted"*.
  - Automatically wipes attached media, reactions, and stars.
- **Delete for Me**:
  - Hides the message solely for the requesting user across sessions while keeping it visible to others.
  - Available on both sent and received messages.

### ⭐ Starred Messages & Drawer
- **Quick Star Action**: Hover chevron dropdown and right-click context menu to star or unstar important messages.
- **Dedicated Starred Messages Drawer**:
  - Instant toggle between "This Chat" and "All Chats".
  - Full client-side decryption for encrypted starred messages.
  - Rich media thumbnails, voice note audio players, and document metadata.
  - One-click "Jump to chat" navigation.

### 👥 Group Conversations & Management
- **Full Group Chat Support**: Create multi-user groups with custom group avatars and descriptions.
- **Participant Badges**: Distinctive "You" and "Group Admin" badges in participant rosters.
- **Group Info Drawer**:
  - Real-time inline group name editing.
  - Participant management: add new contacts or remove existing members.
  - Shared media and starred messages overview.
  - Safe "Exit Group" functionality.
- **Colored Sender Tags**: WhatsApp-style colored display names for participants inside group message bubbles.

### 📎 Unlimited Multimedia Sharing
- **High-Res Photos & Lightbox**: Send and receive photos with inline preview and high-resolution lightbox views.
- **Video Playback**: Built-in HTML5 video streaming and playback.
- **Voice Notes**:
  - Interactive audio recording with live mic visualizer.
  - Playback waveform animation with speed controls (1x, 1.5x, 2x).
- **Documents & Files**: Seamless document transmission with format icons, file size counters, and one-click download.

### 📞 WebRTC Voice & Video Calling
- **Peer-to-Peer Streaming**: High-quality real-time voice and video calls powered by WebRTC.
- **Call State Signaling**: Instant incoming call ringers, call accept/reject modals, mic muting, camera switching, and duration timer.

### 📸 Stories / 24-Hour Status Updates
- **WhatsApp Status Clone**: Post temporary text or photo stories that automatically expire after 24 hours.
- **Interactive Story Viewer**: Fullscreen story carousel with playback progress bars and direct reply to story as a chat message.

### 🤖 Built-in Meta AI Assistant
- Integrated AI conversation partner for answering queries, summarizing discussions, generating ideas, and providing quick assistance directly inside the chat view.

### 🎨 Design & Visual Polish
- **WhatsApp Theme Precision**:
  - Custom WhatsApp wallpaper overlay pattern.
  - Curated emerald green palette (`#00a884`, `#25d366`, `#128c7e`).
  - Dark mode (`#111b21`, `#202c33`, `#0b141a`) and light mode (`#efeae2`, `#f0f2f5`).
- **Resilient Architecture**: Self-healing auth proxy and local storage token management that permanently prevents cookie header bloat (`HTTP 431` / `ERR_RESPONSE_HEADERS_TOO_BIG`).

---

## 🏗️ Architecture & Tech Stack

```
arixo-web/
├── app/                        # Next.js 16 App Router
│   ├── api/chat/               # REST & SSE endpoints
│   │   ├── avatar/             # Binary profile photo delivery
│   │   ├── calls/              # Call session state
│   │   ├── conversations/      # Group & direct chat management
│   │   ├── messages/           # CRUD, reactions, stars, deletion
│   │   ├── signaling/          # WebRTC SDP/ICE signaling
│   │   ├── stories/            # 24-hour status stories
│   │   └── sync/               # Real-time SSE event stream
│   ├── auth/                   # Supabase authentication pages
│   └── chat/                   # Main chat page and layout
├── components/                 # React UI components
│   ├── chat/                   # WhatsApp interface components
│   │   ├── chat-layout.tsx     # Sidebar, navigation, call overlays
│   │   ├── chat-window.tsx     # Message viewport, input, actions
│   │   ├── message-bubble.tsx  # Bubbles, context menu, media, E2EE
│   │   ├── group-info-drawer.tsx # Group members, info, management
│   │   ├── starred-messages-drawer.tsx # Starred message browser
│   │   └── stories-view.tsx    # Status updates and story carousel
│   └── ui/                     # Radix UI primitives & buttons
├── lib/                        # Core utilities & services
│   ├── chat-api.ts             # Client API bindings & SSE stream
│   ├── encryption.ts           # Web Crypto AES-GCM 256 E2EE
│   ├── server-store.ts         # Persistent data store & event bus
│   └── supabase/               # Client and SSR authentication
└── proxy.ts                    # Edge cookie sanitizer & proxy
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.18.0` or higher
- **Package Manager**: `npm`, `pnpm`, or `yarn`

### 1. Clone the Repository
```bash
git clone https://github.com/Arijdev/U-chat.git
cd U-chat
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://<your-project-id>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-supabase-anon-key>"

# Optional AI Assistance
GEMINI_API_KEY="<your-google-gemini-api-key>"
```

*(If Supabase credentials are not provided, Arixo Web gracefully falls back to local storage authentication mode for instant local testing).*

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to experience Arixo Web.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🔐 Security & Privacy Architecture

| Feature | Implementation | Benefit |
| :--- | :--- | :--- |
| **End-to-End Encryption** | Web Crypto API AES-GCM 256-bit | Plaintext messages never transit the network unencrypted |
| **Token Sanitization** | Edge proxy & `window.localStorage` | Eliminates cookie bloat and mitigates `HTTP 431` vulnerabilities |
| **Zero-Knowledge Media** | Detached binary storage (`.uchat_data/`) | Eliminates Base64 JWT pollution while preserving photos/attachments |
| **Granular Deletion** | Dual-track `is_deleted_for_everyone` & `deleted_for[]` | Sender has revocation authority; user retains local clearing control |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Arijdev/U-chat/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <sub>Built with ❤️ by Arijit Chowdhury and the open-source community.</sub>
</div>
