# Personal Expense Tracking System – Frontend

Plain HTML + CSS + JavaScript (no build step). Charts use Chart.js from a CDN (internet needed).

## Run
1. **Start the backend first** and wait for `Started ExpenseTrackerApplication` (http://localhost:8080/api/health must show UP).
2. In VS Code right-click `login.html` → **Open with Live Server** (or `python -m http.server 5500` in this folder).
3. Register an account, then you are taken to the dashboard.

The login/register pages show a green/red "Backend connected" line so you can see immediately whether the API is reachable.
All other pages redirect to `login.html` until you are logged in – that is intentional.

Settings (API port, currency, categories) are in `js/config.js`.
