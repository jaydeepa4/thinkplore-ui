# Thinkplore UI

React + Vite frontend for Thinkplore Learning. Use the sibling `thinkplore-backend` project to run the Django REST API. The UI keeps the prototype’s navigation, activity discovery, detail pages, and printable weekly plan.

## Run locally

With Node.js 22 or newer and the backend running on port 8000:

```sh
npm ci
npm run dev
```

Open [Thinkplore](http://127.0.0.1:5175/). Browse the catalog as a visitor, or choose **Sign in** → **Create account** to save activities and manage a weekly plan. Use the account you created when returning to the app. The backend stores this data in its local database.

Vite proxies same-origin `/api` requests to Django. Use the Vite URL in your browser for sign-in, so the session cookie and CSRF token travel through the same origin. To target another local API port, set `THINKPLORE_API_TARGET` when starting Vite.

## Check the build

```sh
npm run build
npm run preview
```

The preview server runs on port 4175 and also proxies the API. The `dist/` output is static frontend content. When serving it elsewhere, route `/api` to Django on the same origin.

Catalog activities and developmental tags are sample data. Communities, Habits, Parenting Programs, and Shop remain placeholders. The original `thinkplore-proto` project retains the mock persona tool for design experiments.
