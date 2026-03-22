# Installation Guide

### Requirements

Make sure you have:

- Node.js
- npm
- Git (all commands provided below are used in Git-bash)

Here's if you need to check:
```bash
node -v
npm -v
git -v
```

### Step 1) Cloning and environment file

Open Git Bash and run:


```bash
git clone https://github.com/Ian-Keilman/sorter.ly.git
cd sorter.ly
```

Install dependencies

```bash
npm install
```

In the project root, create a file named .env,
& Put this inside it:

```
DATABASE_URL=./data/sorterly.db
```

### Step 2) Set up the database

Run this in bash to create the SQLite database:

```bash
npx drizzle-kit generate --config=drizzle.config.ts
npx drizzle-kit migrate --config=drizzle.config.ts
```

To start the app, run:

```bash
npm run dev
```

Go to:
```
http://localhost:3000
```

### Using sorter.ly

I feel like figuring out how to use the app should be relatively intuitive,
especially for anybody able to make it this far, but check HOWTOUSE.md