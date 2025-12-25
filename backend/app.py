"""
Main Application File - Handles app initialization, authentication and main routes
"""

from flask import Flask, request, redirect, render_template, url_for, session, jsonify
from flask_cors import CORS
try:
    from dotenv import load_dotenv
    load_dotenv()  # loads .env locally; harmless on Render
except Exception:
    pass
from db_connect import client
import os
import threading
import time
import requests
from datetime import datetime
from werkzeug.security import check_password_hash
from inventory import inventory_bp
from patient_form import patient_bp
from payments import payments_bp
from pharmacy import pharmacy_bp
from reports import reports_bp
from auth import generate_token, verify_token, token_required

USE_SQLITE = os.getenv("USE_SQLITE", "0") == "1"

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "supersecretkey")  # Needed for sessions

# Configure CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
CORS(app, 
     resources={
         r"/api/*": {"origins": CORS_ORIGINS},
         r"/pharmacy/api/*": {"origins": CORS_ORIGINS},
         r"/inventory/api/*": {"origins": CORS_ORIGINS},
         r"/patient/api/*": {"origins": CORS_ORIGINS},
         r"/payments/api/*": {"origins": CORS_ORIGINS},
         r"/reports/api/*": {"origins": CORS_ORIGINS},
     },
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Keep-alive configuration``
KEEP_ALIVE_ENABLED = os.getenv("KEEP_ALIVE_ENABLED", "1") == "1"
KEEP_ALIVE_INTERVAL = int(os.getenv("KEEP_ALIVE_INTERVAL", "840"))  # 14 minutes
# Leave empty by default; set explicitly in environments that need it
APP_URL = os.getenv("APP_URL", "")

# Register Blueprints
app.register_blueprint(inventory_bp, url_prefix='/inventory')
app.register_blueprint(patient_bp, url_prefix='/patient')
app.register_blueprint(payments_bp, url_prefix='/payments')
app.register_blueprint(pharmacy_bp, url_prefix='/pharmacy')
app.register_blueprint(reports_bp, url_prefix='/reports')

# --- Authentication Routes ---

@app.route("/", methods=["GET", "POST"])
def login():
    """Handle user login"""
    error = None
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        res = client.execute("SELECT password_hash FROM Users WHERE username = ?1", [username])
        if not res.rows:
            error = "Invalid username or password."
        else:
            stored_hash = res.rows[0][0]
            if check_password_hash(stored_hash, password):
                session["username"] = username
                return redirect(url_for("patient.patient_form"))
            else:
                error = "Invalid username or password."
    return render_template("login.html", error=error)

@app.route("/logout")
def logout():
    """Handle user logout"""
    session.pop("username", None)
    return redirect(url_for("login"))

# --- API Authentication Routes ---

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    """API endpoint for login - returns JWT token"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400
        
        username = data.get("username", "")
        password = data.get("password", "")
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        
        # Check user credentials
        res = client.execute("SELECT password_hash FROM Users WHERE username = ?1", [username])
        
        if not res.rows:
            return jsonify({"error": "Invalid username or password"}), 401
        
        stored_hash = res.rows[0][0]
        
        if check_password_hash(stored_hash, password):
            # Generate JWT token
            token = generate_token(username)
            return jsonify({
                "token": token,
                "username": username,
                "message": "Login successful"
            }), 200
        else:
            return jsonify({"error": "Invalid username or password"}), 401
    
    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500

@app.route("/api/auth/verify", methods=["GET"])
@token_required
def api_verify_token(current_user):
    """Verify if the provided token is valid"""
    return jsonify({
        "valid": True,
        "username": current_user
    }), 200

@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    """API endpoint for logout - client should delete token"""
    return jsonify({"message": "Logout successful"}), 200

# --- Keep-Alive Routes ---

@app.route("/health")
def health_check():
    """Health check endpoint for keep-alive pings"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "message": "IMS System is running"
    })

@app.route("/keep-alive")
def keep_alive():
    """Simple keep-alive endpoint"""
    return jsonify({
        "status": "alive",
        "timestamp": datetime.now().isoformat()
    })

# --- Main Navigation Routes ---

@app.route("/pharmacy")
def pharmacy():
    """Redirect to pharmacy blueprint so data loads correctly in the blueprint route"""
    if "username" not in session:
        return redirect(url_for("login"))
    return redirect(url_for("pharmacy.pharmacy")) # Because the data is loaded in the blueprint route

@app.route("/view-sales")
def view_sales():
    """View sales page"""
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("view_sales.html", active_page="view_sales")

@app.route("/returns")
def returns():
    """Returns management page"""
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("returns.html", active_page="returns")

@app.route("/price-update")
def price_update():
    """Price update page"""
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("price_update.html", active_page="price_update")

# --- Keep-Alive Background Service ---

def keep_alive_service():
    """Background service to ping the app and prevent sleeping"""
    if not KEEP_ALIVE_ENABLED or not APP_URL:
        return
    
    def ping_app():
        while True:
            try:
                time.sleep(KEEP_ALIVE_INTERVAL)  # Wait before first ping
                # Ensure URL has a scheme
                base = APP_URL.strip()
                if base and not base.startswith(("http://", "https://")):
                    base = "https://" + base
                response = requests.get(f"{base}/health", timeout=30)
                if response.status_code == 200:
                    print(f"[{datetime.now().isoformat()}] Keep-alive ping successful")
                else:
                    print(f"[{datetime.now().isoformat()}] Keep-alive ping failed: {response.status_code}")
            except Exception as e:
                print(f"[{datetime.now().isoformat()}] Keep-alive ping error: {str(e)}")
    
    # Start the ping thread
    ping_thread = threading.Thread(target=ping_app, daemon=True)
    ping_thread.start()
    print(f"[{datetime.now().isoformat()}] Keep-alive service started (interval: {KEEP_ALIVE_INTERVAL}s)")

# def ddmmyyyy_to_yyyymmdd(date_str):
#     try:
#         d, m, y = date_str.split("-")
#         return f"{y}-{m}-{d}"
#     except:
#         return date_str
    
@app.route("/api/view-sales", methods=["GET", "POST"])
@token_required
def view_sales_api(current_user):
    # if "username" not in session:
    #     return jsonify({"error": "Unauthorized"}), 401

    from db_connect import client

    # -----------------------------
    # DEFAULT DATE
    # -----------------------------
    today = datetime.now().strftime("%Y-%m-%d")

    # -----------------------------
    # GET FILTERS (POST or GET)
    # -----------------------------
    if request.method == "POST":
        data = request.get_json(silent=True) or {}

        selected_date = data.get("date", today)
        pname = data.get("pname", "").strip()
        uhid = data.get("uhid", "").strip()
        invoice_id = data.get("invoiceid", "").strip()
        phone = data.get("phonenum", "").strip()
        page = int(data.get("page", 1))
    else:
        selected_date = request.args.get("date", today)
        pname = request.args.get("pname", "").strip()
        uhid = request.args.get("uhid", "").strip()
        invoice_id = request.args.get("invoiceid", "").strip()
        phone = request.args.get("phonenum", "").strip()
        page = int(request.args.get("page", 1))


    # selected_date = ddmmyyyy_to_yyyymmdd(selected_date)
    # -----------------------------
    # BASE QUERY
    # -----------------------------
    query = "SELECT * FROM vw_dailyPharmacyDetailsDemo WHERE 1=1"
    params = []

    if selected_date:
        query += " AND substr(timestamp, 1, 10) = ?"
        params.append(selected_date)

    if pname:
        query += " AND PName LIKE ?"
        params.append(f"%{pname}%")

    if uhid:
        query += " AND UHId LIKE ?"
        params.append(f"%{uhid}%")

    if invoice_id:
        query += " AND InvoiceId LIKE ?"
        params.append(f"%{invoice_id}%")

    if phone:
        query += " AND PhoneNo LIKE ?"
        params.append(f"%{phone}%")

    query += " ORDER BY timestamp DESC, InvoiceId"

    # -----------------------------
    # FETCH DATA
    # -----------------------------
    try:
        result = client.execute(query, params)
        sales_data = result.rows
    except Exception as e:
        print("❌ Sales fetch error:", e)
        sales_data = []

    # -----------------------------
    # GROUP BY INVOICE
    # -----------------------------
    grouped_invoices = {}
    total_btotal = 0.0

    for row in sales_data:
        inv_id = row[11]

        grouped_invoices.setdefault(inv_id, []).append(list(row))

        if row[8]:
            try:
                total_btotal += float(row[8])
            except:
                pass

    # -----------------------------
    # PAGINATION
    # -----------------------------
    items_per_page = 10
    all_items = list(grouped_invoices.items())

    total_items = len(all_items)
    total_pages = max((total_items + items_per_page - 1) // items_per_page, 1)

    page = max(1, min(page, total_pages))

    start = (page - 1) * items_per_page
    end = start + items_per_page

    paginated_invoices = dict(all_items[start:end])

    pagination = {
        "page": page,
        "pages": total_pages,
        "total": total_items,
        "has_prev": page > 1,
        "has_next": page < total_pages
    }

    # -----------------------------
    # SUMMARY
    # -----------------------------
    summary_query = """
        SELECT 
            COUNT(DISTINCT InvoiceId),
            SUM(CASE WHEN PaymentMode = 'Cash' THEN TotalAmount ELSE 0 END),
            SUM(CASE WHEN PaymentMode = 'UPI' THEN TotalAmount ELSE 0 END)
        FROM MedicineInvoices
        WHERE DATE(InvoiceDate) = ?
    """

    try:
        s = client.execute(summary_query, [selected_date]).rows[0]
        summary = {
            "total_invoices": s[0] or 0,
            "cash_total": s[1] or 0,
            "upi_total": s[2] or 0,
            "total_btotal": round(total_btotal, 2)
        }
    except:
        summary = {
            "total_invoices": 0,
            "cash_total": 0,
            "upi_total": 0,
            "total_btotal": round(total_btotal, 2)
        }

    # -----------------------------
    # LABEL
    # -----------------------------
    label = f"Showing data for {selected_date}"

    if pname:
        label = f"Showing data for patient name - {pname}"
    elif uhid:
        label = f"Showing data for UHID - {uhid}"
    elif invoice_id:
        label = f"Showing data for Invoice ID - {invoice_id}"
    elif phone:
        label = f"Showing data for Phone - {phone}"

    # -----------------------------
    # FINAL RESPONSE
    # -----------------------------
    return jsonify({
        "grouped_invoices": paginated_invoices,
        "summary": summary,
        "pagination": pagination,
        "filters": {
            "date": selected_date,
            "pname": pname,
            "uhid": uhid,
            "invoiceid": invoice_id,
            "phonenum": phone
        },
        "label": label
    })

# --- Application Entry Point ---

if __name__ == "__main__" and USE_SQLITE == 1:
    if KEEP_ALIVE_ENABLED:
        keep_alive_service()
    app.run(debug=True, use_reloader=False)
elif __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 10000))
    if KEEP_ALIVE_ENABLED:
        keep_alive_service()
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)