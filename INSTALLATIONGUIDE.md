# Installation Guide

### Requirements

Make sure you have:

- Node.js 20.9 or newer
- npm
- Git (all commands below are for Git Bash)

Here's how to check:

```bash
node -v
npm -v
git -v
```

If those commands print version numbers instead of acting confused, continue.

### Step 1) Clone sorter.ly

Open Git Bash and run:

```bash
git clone https://github.com/Ian-Keilman/sorter.ly.git
cd sorter.ly
npm install
```

In the project root, create a file named `.env` and put this inside it:

```text
DATABASE_URL=./data/sorterly.db
```

The database file contains your collections. It is ignored by Git and stays on your computer.

### Step 2) Set up the database

Run the committed database migrations:

```bash
npm run db:migrate
```

Do not run `drizzle-kit generate` during installation. That command is for developers making a new migration, not for users installing migrations that already exist. Generating surprise SQL is not part of the setup experience.

The migration command also checks database integrity and foreign keys before declaring victory.

### Step 3) Start sorter.ly

```bash
npm run dev
```

Go to:

```text
http://localhost:3000
```

The normal command only listens on your computer. sorter.ly does not have accounts yet, so this is safer than casually offering your database to the rest of the Wi-Fi network.

### Updating an existing installation

Before an update with database changes, make a backup:

```bash
cp data/sorterly.db data/sorterly-before-update.db
```

Then update the code, dependencies, and database:

```bash
git pull
npm install
npm run db:migrate
```

v0.1.2 tests its migration with a v0.1.1-shaped database, but having a backup is still a good habit. Databases are famously bad at accepting apologies.

### Optional checks

To run the automated tests:

```bash
npm test
```

To check the code style:

```bash
npm run lint
```

### Using sorter.ly

I feel like figuring out how to use the app should be relatively intuitive, especially for anybody able to make it this far, but check `HOWTOUSE.md` if needed.
