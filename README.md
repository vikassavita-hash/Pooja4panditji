<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3ebbceca-c406-4187-a133-e7910a7a7d36

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` or `.env` and provide your secrets:
   - `GEMINI_API_KEY`
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
3. Run the app:
   `npm run dev`

## MySQL Database Support

This project now supports MySQL via `mysql2`. The server will use the MySQL `json_store` table when `MYSQL_HOST`, `MYSQL_USER`, and `MYSQL_DATABASE` are configured. If MySQL is not available, it will still fall back to the local `db/*.json` files.

## Deploying to Hostingar

1. Make sure your Hostingar app can set environment variables and connect to a MySQL database.
2. Add these variables in Hostingar's dashboard or `.env` configuration:
   - `GEMINI_API_KEY`
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
3. Deploy using your normal Hostingar workflow.
4. The app will automatically create the `json_store` table if it does not already exist.
