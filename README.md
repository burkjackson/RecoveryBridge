# RecoveryBridge

**Connection is the antidote to addiction and we do not heal in isolation.**

RecoveryBridge is a safe, confidential peer support platform for people in addiction recovery. Our platform provides a judgment-free space where individuals can connect with others who truly understand their recovery journey.

## 🌟 Features

- **Private & Confidential**: End-to-end encrypted conversations
- **Peer Support**: Connect with others in recovery
- **Dual Modes**: Switch between Seeker (seeking support) and Listener (offering support)
- **Community Guidelines**: Built on compassion, trust, and mutual respect
- **Crisis Resources**: Integrated access to 988, Crisis Text Line, and emergency services
- **Mobile-First**: Optimized for mobile devices with WCAG AA accessibility

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd RecoveryBridge
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📦 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Deployment**: Vercel

## 🗄️ Database Setup

The app requires the following Supabase tables:

### `profiles`
- `id` (uuid, primary key, references auth.users)
- `display_name` (text)
- `bio` (text)
- `user_role` (text): 'person_in_recovery', 'professional', or 'ally'
- `is_available` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### `chat_sessions`
- `id` (uuid, primary key)
- `seeker_id` (uuid, references profiles)
- `listener_id` (uuid, references profiles)
- `status` (text): 'active' or 'ended'
- `created_at` (timestamp)
- `ended_at` (timestamp, nullable)

### `messages`
- `id` (uuid, primary key)
- `session_id` (uuid, references chat_sessions)
- `sender_id` (uuid, references profiles)
- `content` (text)
- `created_at` (timestamp)

## 🌐 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your RecoveryBridge repository
5. Add environment variables in Vercel settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Deploy!

## 👥 User Roles

- **People in Recovery**: On their recovery journey, may seek or offer support
- **Allies in Long-Term Recovery**: Giving back by offering support to others
- **Recovery Support**: Supporting the recovery community with empathy

## 🛡️ Community Guidelines

1. 💙 Lead with Compassion
2. 🔒 Honor Sacred Trust
3. 🌟 Celebrate Every Step
4. 🆘 You Are Worth Saving
5. ✨ Practice Self-Care
6. 🙌 Share Your Wins
7. 🛡️ Protect Our Community

## 📄 License

This project is intended for recovery support purposes. Please use responsibly.

## ⚠️ Important Notice

**RecoveryBridge is NOT a substitute for professional therapy or crisis services.**

If you're in crisis:
- **988** - Suicide & Crisis Lifeline
- **911** - Emergency services
- **Crisis Text Line** - Text HOME to 741741

## 🤝 Contributing

This is a community-focused project. Contributions that align with our mission of providing safe, compassionate support are welcome.

---

Built with ❤️ for the recovery community
