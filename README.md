## Getting Started

First, install all packages:

```bash
npm i
```

If you dont have typescript setup globally, you might want to install that first

Add your .env file
```bash
PORT
NODE_ENV
DB_NAME
DB_HOST
DB_USER
DB_PASS
REDIS_ENDPOINT
REDIS_PASSWORD
REDIS_TLS=FALSE
```

If its a new database, run the migrations
```bash
npm run db-migration
```

To start the development server:

```bash
npm run dev
```
