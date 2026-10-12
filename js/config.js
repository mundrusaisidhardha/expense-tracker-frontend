// API_URL: local development uses http://localhost:8080/api.
// When deployed (Netlify), it uses your Render backend - replace the URL below with yours.
window.APP_CONFIG = {
  API_URL: (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://" + location.hostname + ":8080/api"
    : "https://expense-tracker-backend-53zf.onrender.com/api",
  CURRENCY: "₹",
  LOCALE: "en-IN",
  CATEGORIES: ["Food", "Groceries", "Transport", "Shopping", "Bills", "Rent", "Health", "Education", "Entertainment", "Travel", "Other"],
  PAYMENT_METHODS: ["Cash", "UPI", "Credit Card", "Debit Card", "Net Banking", "Wallet", "Other"]
};
