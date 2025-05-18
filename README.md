# Recipe AI 🍳

## Overview
Recipe AI is an intelligent web application that generates personalized recipes based on your refrigerator contents, kitchen tools, and meal history. The application provides comprehensive management systems for both kitchen tools and meal history, allowing users to view, add, edit, and delete their data.

## Features

### Core Features
- Upload images of refrigerator contents
- Upload images of kitchen tools
- Track meal history
- AI-powered recipe generation
- Secure data storage with Supabase

### Kitchen Tools Management
- Dedicated page for managing kitchen tools
- View, add, edit, and delete kitchen tools
- Search and filter tools by name and category
- Mark favorite tools for recipe prioritization
- Track tool condition and maintenance dates

### Meal History Management
- Dedicated page for managing meal history
- View, add, edit, and delete meal records
- Search and filter meals by name, restaurant, and cuisine
- Mark favorite meals for future reference
- Organize dishes by cuisine type

### Recipe Generation
- Generate recipes based on available ingredients
- Consider kitchen tools in recipe suggestions
- Incorporate meal history preferences
- Tool-recipe mapping system for appropriate cooking techniques

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

## Database Schema

### Main Tables
- `refrigerator_contents`: Stores user's refrigerator contents
- `kitchen_tools`: Stores user's kitchen tools
- `meal_history`: Stores user's meal history
- `generated_recipes`: Stores recipes generated for users

### Metadata Tables
- `user_kitchen_tool_metadata`: Stores additional metadata for kitchen tools
  - Tool categories, conditions, maintenance dates, favorites
- `user_meal_history_metadata`: Stores additional metadata for meal history
  - Meal names, restaurants, cuisines, dishes, favorites

## Technologies
- Next.js 14
- TypeScript
- Supabase
- OpenAI GPT-4o
- Tailwind CSS

## Security
- Row-level security in Supabase
- Secure image uploads and analysis
- Authentication for all API endpoints

## Pages
- `/`: Home page with data overview
- `/recipe-generator`: Custom recipe generation page
- `/my-kitchen-tools`: Kitchen tools management page
- `/my-meal-history`: Meal history management page
- `/sign-in` and `/sign-up`: Authentication pages

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/eugenetwtw/s06recipeai?utm_source=oss&utm_medium=github&utm_campaign=eugenetwtw%2Fs06recipeai&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
