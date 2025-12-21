"""
Patient Form Blueprint - Handles patient registration and search functionality
"""

from flask import Blueprint, request, redirect, render_template, url_for, jsonify, session
from db_connect import client
from datetime import datetime, date
from auth import token_required

# Create Blueprint
patient_bp = Blueprint('patient', __name__)

def today_iso() -> str:
    """Return today's date in ISO format (YYYY-MM-DD)"""
    return date.today().strftime("%Y-%m-%d")

def fetch_today_entries():
    """Combine today's OP and Procedure rows into one list of dicts."""
    today = today_iso()
    res = client.execute(
        """
        SELECT * from vw_getOPdetails
        WHERE substr(Date, 1, 10) = ?1
        ORDER BY Date DESC
        """,
        [today]
    )
    cols = ["UHId","PName","PhoneNo","Age","Gender","VisitType","Date","PaymentMode","AmountPaid","ProcedureName"]
    return [dict(zip(cols, row)) for row in res.rows]

def generate_client_id(current_name: str) -> str:
    """
    Generate UHId = YYMM + Initial + 3-digit sequence (e.g., 2508S001)
    """
    current_name = (current_name or "").strip()
    if not current_name:
        raise ValueError("Name required for UHId generation")

    initial = current_name[0].upper()
    yymm = date.today().strftime("%y%m")
    query = f"SELECT last_id FROM vw_Name_Counter WHERE starting_letter = '{initial}'"
    
    # Find the highest sequence for this month+initial
    rows = client.execute(query).rows
    last_seq = int(rows[0][0]) if rows and rows[0][0] is not None else 0
    return f"{yymm}{initial}{(last_seq + 1):03d}"

def fetch_search_entries(field: str, term: str):
    """
    Search across Outpatients + Procedures joined with Patients.
    field: name | phoneno | uhid | date
    term:  for name/phoneno: free text; uhid: exact; date: YYYY-MM-DD
    """
    field = (field or "").lower().strip()
    term = (term or "").upper().strip()
    if not field or not term:
        return []

    where_op = ""
    params_op = []

    if field == "name":
        like = f"%{term}%"
        where_op = "WHERE PName LIKE ?1 AND substr(OPDate,1,10) = substr(OPDate,1,10)"
        params_op = [like]

    elif field == "phoneno":
        like = f"%{term}%"
        where_op = "WHERE PhoneNo LIKE ?1"
        params_op = [like]

    elif field == "uhid":
        where_op = "WHERE UHId = ?1"
        params_op = [term]

    elif field == "date":
        # Expect YYYY-MM-DD from <input type="date">
        where_op = "WHERE substr(Date, 1, 10) = ?1"
        params_op = [term]

    else:
        return []

    sql = f"""
        SELECT UHId,PName,PhoneNo,Age,Gender,OPProc,Date,PaymentMode,AmountPaid,ProcName from vw_getOPdetails {where_op}
    """

    res = client.execute(sql, params_op)
    cols = ["UHId","PName","PhoneNo","Age","Gender","VisitType","Date","PaymentMode","AmountPaid","ProcedureName"]
    return [dict(zip(cols, row)) for row in res.rows]


# --- API Routes ---

@patient_bp.route("/api/generate_id", methods=["GET"])
def api_generate_id():
    """API endpoint for UHId generation (AJAX from HTML)"""
    name = (request.args.get("name") or "").strip()
    if not name:
        return jsonify(error="name is required"), 400
    try:
        return jsonify(client_id=generate_client_id(name))
    except Exception as e:
        return jsonify(error=str(e)), 500


# --- Page Routes ---

@patient_bp.route("/op_form")
def patient_form():
    """Display patient form with today's entries"""
    if "username" not in session:
        return redirect(url_for("login"))
    
    rows = fetch_today_entries()
    return render_template(
        "patient_form.html",
        message=request.args.get("message"),
        error=request.args.get("error"),
        today=today_iso(),
        rows=rows,
        table_title=f"Today's Entries ({today_iso()})",
        search_field=None,
        search_term=None,
        search_active=False,
        active_page="op"
    )

@patient_bp.route("/search", methods=["GET"])
def search():
    """Handle patient search functionality"""
    if "username" not in session:
        return redirect(url_for("login"))
    
    field = request.args.get("field", "").strip().lower()
    term = (request.args.get("term") or "").strip()
    if field == "date":
        term = (request.args.get("date") or "").strip()

    rows = fetch_search_entries(field, term)
    return render_template(
        "patient_form.html",
        message=None,
        error=None,
        today=today_iso(),
        rows=rows,
        table_title=f"Search Results ({len(rows)})",
        search_field=field,
        search_term=term,
        search_active=True,
        active_page="op"
    )

@patient_bp.route("/add_patient", methods=["POST"])
def add_patient():
    """Handle patient registration form submission"""
    if "username" not in session:
        return redirect(url_for("login"))
    
    try:
        # Read form data
        name = request.form.get("PName", "").strip()
        uhid = request.form.get("UHId", "").strip()
        
        # Server-side fallback if front-end didn't fill UHId
        if not uhid:
            uhid = generate_client_id(name)
        
        dt = request.form["Date"].strip()
        phoneno = request.form["PhoneNo"].strip()
        age = int(request.form["Age"])
        gender = request.form["Gender"].strip()

        # Upsert Patient
        client.execute(
            """
            INSERT INTO Patients (UHId, Date, PName, PhoneNo, Age, Gender)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(UHId) DO UPDATE SET
              Date=excluded.Date,
              PName=excluded.PName,
              PhoneNo=excluded.PhoneNo,
              Age=excluded.Age,
              Gender=excluded.Gender
            """,
            [uhid, dt, name, phoneno, age, gender]
        )

        # Branch OP vs Proc
        op_proc = (request.form.get("OPProc") or "").strip().lower()
        pay_mode = (request.form.get("PaymentMode") or "").strip()
        amt = request.form.get("AmountPaid", "").strip()
        amount_paid = int(amt) if amt.isdigit() else 0

        if op_proc == "op":
            client.execute(
                "INSERT INTO Outpatient (OPDate, UHId, PaymentMode, AmountPaid) VALUES (?1, ?2, ?3, ?4)",
                [dt, uhid, pay_mode, amount_paid]
            )
        elif op_proc == "procedure":  # Note: changed from "proc" to "procedure" to match HTML
            proc_name = (request.form.get("ProcedureName") or "").strip()
            client.execute(
                "INSERT INTO Procedures (ProcDate, UHId, ProcedureName, PaymentMode, AmountPaid) VALUES (?1, ?2, ?3, ?4, ?5)",
                [dt, uhid, proc_name, pay_mode, amount_paid]
            )

        return redirect(url_for("patient.patient_form", message="Patient registered successfully!"))

    except Exception as e:
        return redirect(url_for("patient.patient_form", error=f"Error: {str(e)}"))


# --- API Routes ---

@patient_bp.route("/api/today", methods=["GET"])
@token_required
def api_get_today_entries(current_user):
    """API endpoint to get today's patient entries"""
    try:
        rows = fetch_today_entries()
        return jsonify({
            "success": True,
            "data": rows,
            "count": len(rows)
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch today's entries: {str(e)}"}), 500


@patient_bp.route("/api/register", methods=["POST"])
@token_required
def api_register_patient(current_user):
    """API endpoint to register a new patient"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400
        
        # Extract and validate required fields
        name = data.get("PName", "").strip()
        if not name:
            return jsonify({"error": "Patient name is required"}), 400
        
        uhid = data.get("UHId", "").strip()
        
        # Server-side fallback if front-end didn't fill UHId
        if not uhid:
            uhid = generate_client_id(name)
        
        dt = data.get("Date", "").strip()
        if not dt:
            return jsonify({"error": "Date is required"}), 400
        
        phoneno = data.get("PhoneNo", "").strip()
        if not phoneno:
            return jsonify({"error": "Phone number is required"}), 400
        
        age = data.get("Age")
        if age is None:
            return jsonify({"error": "Age is required"}), 400
        
        gender = data.get("Gender", "").strip()
        if not gender:
            return jsonify({"error": "Gender is required"}), 400
        
        # Upsert Patient
        client.execute(
            """
            INSERT INTO Patients (UHId, Date, PName, PhoneNo, Age, Gender)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(UHId) DO UPDATE SET
              Date=excluded.Date,
              PName=excluded.PName,
              PhoneNo=excluded.PhoneNo,
              Age=excluded.Age,
              Gender=excluded.Gender
            """,
            [uhid, dt, name, phoneno, int(age), gender]
        )
        
        # Branch OP vs Procedure
        op_proc = data.get("OPProc", "").strip().lower()
        pay_mode = data.get("PaymentMode", "").strip()
        amount_paid = int(data.get("AmountPaid", 0))
        
        if op_proc == "op":
            client.execute(
                "INSERT INTO Outpatient (OPDate, UHId, PaymentMode, AmountPaid) VALUES (?1, ?2, ?3, ?4)",
                [dt, uhid, pay_mode, amount_paid]
            )
        elif op_proc == "procedure":
            proc_name = data.get("ProcedureName", "").strip()
            if not proc_name:
                return jsonify({"error": "Procedure name is required for procedure type"}), 400
            
            client.execute(
                "INSERT INTO Procedures (ProcDate, UHId, ProcedureName, PaymentMode, AmountPaid) VALUES (?1, ?2, ?3, ?4, ?5)",
                [dt, uhid, proc_name, pay_mode, amount_paid]
            )
        else:
            return jsonify({"error": "Invalid OPProc value. Must be 'op' or 'procedure'"}), 400
        
        return jsonify({
            "success": True,
            "message": "Patient registered successfully",
            "uhid": uhid
        }), 201
    
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@patient_bp.route("/api/search", methods=["GET"])
@token_required
def api_search_patients(current_user):
    """API endpoint to search patients"""
    try:
        field = request.args.get("field", "").strip().lower()
        term = request.args.get("term", "").strip()
        
        if not field or not term:
            return jsonify({"error": "Both 'field' and 'term' parameters are required"}), 400
        
        rows = fetch_search_entries(field, term)
        
        return jsonify({
            "success": True,
            "data": rows,
            "count": len(rows),
            "search_field": field,
            "search_term": term
        }), 200
    
    except Exception as e:
        return jsonify({"error": f"Search failed: {str(e)}"}), 500


@patient_bp.route("/api/generate-uhid", methods=["GET"])
@token_required
def api_generate_uhid_endpoint(current_user):
    """API endpoint for UHId generation"""
    try:
        name = request.args.get("name", "").strip()
        
        if not name:
            return jsonify({"error": "name parameter is required"}), 400
        
        uhid = generate_client_id(name)
        
        return jsonify({
            "success": True,
            "uhid": uhid
        }), 200
    
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"UHId generation failed: {str(e)}"}), 500