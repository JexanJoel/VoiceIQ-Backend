<div align="center">

# 🎙️ VoiceIQ - Backend API

**AI-powered call center compliance engine for Indian call centers**

<br/>

<div align="center">
<table>
  <tr>
    <td align="center"><a href="https://voiceiq-backend-8f4q.onrender.com"><img src="https://img.shields.io/badge/API-Live-16A34A?style=for-the-badge"/></a></td>
    <td align="center"><a href="https://voice-iq-ai.vercel.app/"><img src="https://img.shields.io/badge/🚀_Frontend-4F46E5?style=for-the-badge"/></a></td>
    <td align="center"><a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-D22128?style=for-the-badge&logo=apache&logoColor=white"/></a></td>
    <td align="center"><a href="https://github.com/JexanJoel/VoiceIQ-Backend"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"/></a></td>
  </tr>
</table>
</div>

</div>

---

## 📌 Description

VoiceIQ Backend is a Node.js/Express REST API that powers AI-driven call center compliance analysis. It accepts MP3 audio recordings of Indian call center conversations (Hinglish / Tanglish), transcribes them using Groq Whisper, and runs multi-stage NLP analysis using Llama 3.3 70B to produce structured compliance reports.

Built for **HCL GUVI Intern Hiring Hackathon 2026 - Track 3: Call Center Compliance.**

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|:---:|:---:|
| **Runtime** | Node.js (ESM) |
| **Framework** | Express.js |
| **STT** | Groq Whisper large-v3 |
| **LLM** | Groq Llama 3.3 70B Versatile |
| **Database** | Supabase (PostgreSQL + Storage) |
| **Auth** | Supabase JWT + x-api-key header |
| **Deploy** | Render |

</div>

---

## 🚀 API Endpoint (Hackathon Evaluation)

### `POST /api/call-analytics`

Accepts a Base64-encoded MP3 audio file and returns a full compliance analysis.

**Authentication:** `x-api-key` header required.

**Request:**
```bash
curl -X POST https://voiceiq-backend-8f4q.onrender.com/api/call-analytics \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "language": "Tamil",
    "audioFormat": "mp3",
    "audioBase64": "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAA..."
  }'
```
<div align="center">

**Request Body:**

| Field | Type | Description |
|---|---|---|
| `language` | string | `Tamil` or `Hindi` |
| `audioFormat` | string | Always `mp3` |
| `audioBase64` | string | Base64-encoded MP3 audio |

</div>

**Response:**
```json
{
  "status": "success",
  "language": "Tamil",
  "transcript": "Agent: Vanakkam, ungaloda outstanding EMI amount 5000 iruku...",
  "summary": "Agent discussed outstanding EMI of ₹5000. Customer requested partial payment due to budget constraints.",
  "sop_validation": {
    "greeting": true,
    "identification": false,
    "problemStatement": true,
    "solutionOffering": true,
    "closing": true,
    "complianceScore": 0.8,
    "adherenceStatus": "NOT_FOLLOWED",
    "explanation": "The agent did not verify customer identity. All other SOP stages were followed correctly."
  },
  "analytics": {
    "paymentPreference": "PARTIAL_PAYMENT",
    "rejectionReason": "BUDGET_CONSTRAINTS",
    "sentiment": "Neutral"
  },
  "keywords": [
    "outstanding EMI", "partial payment", "budget", "5000", "today",
    "payment plan", "due amount", "installment", "settlement", "callback"
  ]
}
```

---

## ⚙️ How It Works

```
POST /api/call-analytics  (Base64 MP3 + language)
        ↓
x-api-key authentication check
        ↓
Base64 decoded → written to temp file
        ↓
Groq Whisper large-v3 transcribes audio
→ auto-detects Hinglish / Tanglish
→ generates timestamped segments [M:SS–M:SS]
        ↓
Timestamped transcript passed to Llama 3.3 70B
→ SOP validation (greeting / identification / problemStatement / solutionOffering / closing)
→ Payment preference classification (EMI / FULL_PAYMENT / PARTIAL_PAYMENT / DOWN_PAYMENT)
→ Rejection reason extraction (HIGH_INTEREST / BUDGET_CONSTRAINTS / ALREADY_PAID / NOT_INTERESTED / NONE)
→ Sentiment analysis (Positive / Neutral / Negative)
→ Keyword extraction (top 10 domain-specific terms)
        ↓
Enum validation + complianceScore recalculation from booleans
        ↓
Structured JSON response returned
        ↓
Temp file deleted
```

---

## 📁 Project Structure

```
voiceiq-backend/
├── src/
│   ├── controllers/
│   │   ├── callController.js          # Dashboard upload flow
│   │   ├── callAnalyticsController.js # Hackathon evaluation endpoint
│   │   ├── analyticsController.js     # Dashboard analytics
│   │   ├── transcriptController.js    # Transcript search
│   │   ├── agentController.js         # Agent management
│   │   └── sopController.js           # SOP rules CRUD
│   ├── routes/
│   │   ├── callAnalyticsRoute.js      # POST /api/call-analytics (x-api-key auth)
│   │   ├── callRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── transcriptRoutes.js
│   │   ├── agentRoutes.js
│   │   └── sopRoutes.js
│   ├── services/
│   │   ├── groqService.js             # Whisper + Llama 3.3 70B analysis
│   │   ├── whisperService.js          # Audio transcription
│   │   └── supabaseService.js         # DB + Storage client
│   ├── middleware/
│   │   ├── authMiddleware.js          # Supabase JWT verification
│   │   └── uploadMiddleware.js        # Multer file upload
│   └── utils/
│       └── responseHelper.js          # success/error response helpers
├── .env.example
├── package.json
└── server.js
```

---

## 🔧 Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/JexanJoel/VoiceIQ-backend.git
cd VoiceIQ-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set environment variables
```bash
cp .env.example .env
```
Fill in your `.env`:
```env
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
HACKATHON_API_KEY=your_chosen_api_key
PORT=5000
```

### 4. Run the server
```bash
# Development
npm run dev

# Production
npm start
```

Server starts at `http://localhost:5000`

---

## 🌐 Deployed URL

```
https://voiceiq-backend-8f4q.onrender.com
```

Hackathon evaluation endpoint:
```
POST https://your-render-url.onrender.com/api/call-analytics
```

---

## 🗃️ Database Schema (Supabase)

```
calls       — recordings, transcripts, compliance results, sentiment, agent assignment
agents      — agent profiles per user account
sop_rules   — custom SOP rules per user (max 10, with categories)
```

All tables have Row Level Security (RLS) enabled.

---

## 📊 SOP Validation Logic

The API evaluates 5 stages of a standard call center script:

<div align="center">

| Stage | Description |
|---|---|
| `greeting` | Agent opened with Hello / Vanakkam / Namaste |
| `identification` | Agent verified customer name or account |
| `problemStatement` | Agent clearly stated call purpose/issue |
| `solutionOffering` | Agent offered a solution or product |
| `closing` | Agent ended with a closing statement |

</div>

`complianceScore` = number of true steps / 5 (recalculated from booleans, not LLM-generated)

`adherenceStatus` = `FOLLOWED` only if all 5 are true, otherwise `NOT_FOLLOWED`

---

## 💳 Payment & Rejection Classification

<div align="center">

**Payment Preference:**
| Value | Meaning |
|---|---|
| `EMI` | Customer wants installment payments |
| `FULL_PAYMENT` | Customer will pay full amount at once |
| `PARTIAL_PAYMENT` | Customer will pay part now, rest later |
| `DOWN_PAYMENT` | Customer will pay initial deposit |
| `NONE` | No payment discussed |

**Rejection Reason:**
| Value | Meaning |
|---|---|
| `HIGH_INTEREST` | Customer complained about interest/rate |
| `BUDGET_CONSTRAINTS` | Customer cited lack of funds |
| `ALREADY_PAID` | Customer claims prior payment |
| `NOT_INTERESTED` | Customer declined product/service |
| `NONE` | No rejection - payment agreed or N/A |

</div>

---

## ⚠️ Known Limitations

- Audio files above ~25MB may hit Whisper API limits
- Very noisy or low-quality recordings reduce transcription accuracy
- Rejection reason detection works best when customer explicitly states their reason
- Whisper language detection is automatic - `language` field in request is used for LLM context, not to force STT language

---

## 📄 License

<div align="center">

[![License](https://img.shields.io/badge/License-Apache_2.0-D22128?style=for-the-badge&logo=apache&logoColor=white)](./LICENSE)

</div>

---

<div align="center">

Built with ❤️ for **HCL GUVI Intern Hiring Hackathon 2026** - Track 3: Call Center Compliance

[![Report Bug](https://img.shields.io/badge/🐛_Report_Bug-D22128?style=for-the-badge)](https://github.com/JexanJoel/VoiceIQ-backend/issues)

</div>