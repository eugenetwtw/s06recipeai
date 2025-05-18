# Recipe AI 🍳

## Overview
Recipe AI is an intelligent web application that generates personalized recipes based on your refrigerator contents, kitchen tools, and meal history.

## Features
- Upload images of refrigerator contents
- Upload images of kitchen tools
- Track meal history
- AI-powered recipe generation
- Secure data storage with Supabase

## Setup

1. Clone the repository
2. Install dependencies
```bash
npm install
```

3. Copy `.env.example` to `.env.local` and fill in:
- Supabase URL and Service Role Key
- OpenAI API Key

4. Run database migrations
```bash
supabase migration up
```

5. Start development server
```bash
npm run dev
```

## Technologies
- Next.js 14
- TypeScript
- Supabase
- OpenAI GPT-4o
- Tailwind CSS

## Security
- Row-level security in Supabase
- Secure image uploads and analysis
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/eugenetwtw/s06recipeai?utm_source=oss&utm_medium=github&utm_campaign=eugenetwtw%2Fs06recipeai&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)