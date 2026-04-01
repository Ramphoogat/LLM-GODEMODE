# Contributing to G0DM0DƎ

Thanks for your interest in contributing to the next generation of G0DM0DƎ! This project has been migrated to a modern, modular **Next.js 14** stack.

## Getting Started

1. **Fork the repo**
2. **Clone your fork**: `git clone https://github.com/<you>/LLM-GODEMODE.git`
3. **Install dependencies**: `npm install`
4. **Environment Setup**: Copy `.env.example` to `.env`. The app now automatically loads `NEXT_PUBLIC_OPENROUTER_API_KEY` and `NEXT_PUBLIC_AGENTROUTER_API_KEY` if present.
5. **Start Dev Server**: `npm run dev` (Access at `http://localhost:3000`)

## Development Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State Management**: Zustand with Persistence
- **Styling**: Tailwind CSS + Framer Motion
- **Core Logic**: `src/lib/` (Orchestrators, Classification, Parseltongue)
- **UI Components**: `src/components/` (ThinkingUI, ChatInput, etc.)

## Pull Requests

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes and test locally
3. Commit with clear messages (e.g. `fix: resolve CORS on /chat endpoint`)
4. Push and open a PR against `main`

## Guidelines

- Keep PRs focused — one feature or fix per PR
- Don't commit API keys, secrets, or credentials
- Test your changes before opening a PR
- Be respectful in discussions

## Reporting Issues

Open a GitHub issue with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS info if relevant

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license.
