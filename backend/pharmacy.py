from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from datetime import datetime
from db_connect import client
import logging
from auth import token_required


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

pharmacy_bp = Blueprint('pharmacy', __name__)

def _safe_execute(sql: str, args=None, context: str = ""):
    """
    Execute a SQL statement safely and log detailed errors.
    Returns the result on success, or None on failure.
    """
    try:
        return client.execute(sql, args or [])
    except Exception as e:
        ctx = f" [{context}]" if context else ""
        logger.error(f"SQL execute failed{ctx}: {e}. SQL: {sql} | ARGS: {args}", exc_info=True)
        return None

def _get_table_columns(table_name: str) -> list[str]:
    """Return the column names for the given table (best-effort), preserving casing."""
    try:
        res = client.execute(f"PRAGMA table_info({table_name})")
        cols = []
        if hasattr(res, 'rows') and res.rows:
            for row in res.rows:
                # PRAGMA table_info: cid, name, type, notnull, dflt_value, pk
                if len(row) > 1:
                    colname = str(row[1])
                    cols.append(colname)
        logger.info(f"[Schema] {table_name} columns detected: {cols}")
        return cols
    except Exception as e:
        logger.warning(f"[Schema] Could not read columns for {table_name}: {e}")
        return []

def _match_column(columns: list[str], *candidates: str) -> str | None:
    """
    Find the first column whose normalized name matches any candidate.
    Normalization strips whitespace and lowercases for comparison but returns the original name.
    """
    cand_norm = [c.strip().lower() for c in candidates]
    for col in columns:
        norm = col.strip().lower()
        if norm in cand_norm:
            return col
    return None

def _extract_starting_letter(patient_name: str) -> str:
    """Return the first alphabetic letter of the name in uppercase, default 'A'."""
    if not patient_name:
        return 'A'
    for ch in patient_name.strip():
        if ch.isalpha():
            return ch.upper()
    return 'A'

def generate_uhid_from_name(patient_name: str) -> str:
    """
    Generate UHId based on the new protocol:
    YYMM + <FirstLetterOfName> + ###(MonthcountOfStartingLetter from vw_Name_counter)
    """
    try:
        year_month = datetime.now().strftime('%y%m')  # YYMM
        letter = _extract_starting_letter(patient_name)

        # Read monthly count for this starting letter from the view
        # If the view has no row, treat as 0
        next_seq = 1
        try:
            cnt_result = client.execute("""
                SELECT name_cou 
                FROM vw_Name_counter 
                WHERE TRIM(starting) = TRIM(?) COLLATE NOCASE
                LIMIT 1
            """, [letter])
            if hasattr(cnt_result, 'rows') and cnt_result.rows:
                # name_cou is current count for the month; next id is +1
                current_count = int(cnt_result.rows[0][0] or 0)
                next_seq = current_count + 1
        except Exception as inner_err:
            logger.warning(f"[UHId] Could not read vw_Name_counter for '{letter}': {inner_err}")

        uhid = f"{year_month}{letter}{next_seq:03d}"
        logger.info(f"[UHId] Generated UHId '{uhid}' for name '{patient_name}'")
        return uhid
    except Exception as e:
        logger.error(f"[UHId] Fallback UHId due to error: {e}", exc_info=True)
        return f"{datetime.now().strftime('%y%m')}A001"

def generate_invoice_id_for_today() -> str:
    """
    Generate InvoiceId in the format:
      PM + YY + DDD + SS
    - YY: last two digits of year (e.g., 25)
    - DDD: day-of-year, 001..366
    - SS: daily sequence, 01, 02, ...
    """
    now = datetime.now()
    yy = now.strftime('%y')
    day_of_year = f"{now.timetuple().tm_yday:03d}"
    # Count existing invoices for today to determine next sequence
    try:
        today_date = now.strftime('%Y-%m-%d')
        count_result = client.execute("""
            SELECT COUNT(*) 
            FROM MedicineInvoices
            WHERE substr(TRIM(InvoiceDate), 1, 10) = ?
        """, [today_date])
        existing_count = 0
        if hasattr(count_result, 'rows') and count_result.rows:
            existing_count = int(count_result.rows[0][0] or 0)
        seq_num = existing_count + 1
        sequence = f"{seq_num:02d}"
    except Exception as e:
        logger.warning(f"[InvoiceId] Could not compute daily count, defaulting seq to 01: {e}")
        sequence = "01"
    return f"PM{yy}{day_of_year}{sequence}"

def get_medicine_details_impl(medicine_name):
    """Internal implementation to fetch medicine details by name - MRP, MType from MedicineList, BatchNo from StockDeliveries"""
    try:
        logger.info(f"🔍 [API] Fetching details for medicine: '{medicine_name}'")
        
        # Get MRP and MType from MedicineList
        medicine_data = {
            'MRP': None,
            'MType': None,
            'BatchNo': None
        }
        
        try:
            # Query MedicineList for MRP and MType
            medicine_query = """
                SELECT MRP, MType
                FROM MedicineList 
                WHERE TRIM(MName) = TRIM(?) COLLATE NOCASE
                LIMIT 1
            """
            logger.info(f"📊 [API] Querying MedicineList with MName = '{medicine_name}'")
            medicine_result = client.execute(medicine_query, [medicine_name])
            
            if hasattr(medicine_result, 'rows') and medicine_result.rows:
                logger.info(f"✓ [API] Found {len(medicine_result.rows)} row(s) in MedicineList")
                row = medicine_result.rows[0]
                medicine_data['MRP'] = row[0]
                medicine_data['MType'] = row[1]
                logger.info(f"✓ [API] MRP: {medicine_data['MRP']}, MType: {medicine_data['MType']}")
            else:
                logger.warning(f"⚠ [API] No matching medicine found in MedicineList for '{medicine_name}'")
                return jsonify({
                    'success': False,
                    'message': f'Medicine "{medicine_name}" not found in database'
                }), 404
                
        except Exception as med_error:
            logger.error(f"❌ [API] Error querying MedicineList: {str(med_error)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': f'Database error: {str(med_error)}'
            }), 500
        
        # Get latest BatchNo from StockDeliveries (fallback to OldDeliveries)
        try:
            batch_query = """
                SELECT BatchNo
                FROM StockDeliveries 
                WHERE TRIM(MName) = TRIM(?) COLLATE NOCASE
                ORDER BY DeliveryDate DESC
                LIMIT 1
            """
            logger.info(f"📦 [API] Querying StockDeliveries for BatchNo with MName = '{medicine_name}'")
            batch_result = client.execute(batch_query, [medicine_name])
            
            if hasattr(batch_result, 'rows') and batch_result.rows and len(batch_result.rows) > 0:
                batch_no = batch_result.rows[0][0]
                if batch_no:  # Only set if not NULL
                    medicine_data['BatchNo'] = batch_no
                    logger.info(f"✓ [API] Found BatchNo in StockDeliveries: {medicine_data['BatchNo']}")
                else:
                    logger.info(f"⚠ [API] BatchNo is NULL in StockDeliveries")
            else:
                logger.info(f"⚠ [API] No batch records found in StockDeliveries for '{medicine_name}', checking OldDeliveries…")
                # Fallback: OldDeliveries may not have DeliveryDate; use rowid DESC as latest heuristic
                old_deliveries_query = """
                    SELECT BatchNo
                    FROM OldDeliveries
                    WHERE TRIM(MName) = TRIM(?) COLLATE NOCASE
                      AND BatchNo IS NOT NULL AND TRIM(BatchNo) <> ''
                    ORDER BY rowid DESC
                    LIMIT 1
                """
                old_result = client.execute(old_deliveries_query, [medicine_name])
                if hasattr(old_result, 'rows') and old_result.rows and len(old_result.rows) > 0:
                    old_batch = old_result.rows[0][0]
                    medicine_data['BatchNo'] = old_batch
                    logger.info(f"✓ [API] Found BatchNo in OldDeliveries: {old_batch}")
                else:
                    logger.info(f"⚠ [API] No BatchNo found in OldDeliveries either")
                
        except Exception as batch_error:
            logger.warning(f"⚠ [API] Error querying StockDeliveries (non-critical): {str(batch_error)}")
            
        
        # Step 3: Return the data
        logger.info(f"✅ [API] Final payload: MRP={medicine_data['MRP']}, MType={medicine_data['MType']}, BatchNo={medicine_data['BatchNo']}")
        return jsonify({
            'success': True,
            'data': medicine_data
        })
            
    except Exception as e:
        logger.error(f"❌ [API] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Unexpected error: {str(e)}'
        }), 500

@pharmacy_bp.route('/api/medicine-details/<medicine_name>', methods=['GET'])
@token_required
def get_medicine_details(current_user, medicine_name):
    """API endpoint to fetch medicine details by name (path parameter version)"""
    return get_medicine_details_impl(medicine_name)

# API to preview the next UHId for a given name
@pharmacy_bp.route('/api/next-uhid', methods=['GET'])
@token_required
def api_next_uhid(current_user):
    try:
        name = (request.args.get('name') or '').strip()
        if not name:
            return jsonify({'success': False, 'message': 'name is required'}), 400
        uhid = generate_uhid_from_name(name)
        return jsonify({'success': True, 'uhid': uhid})
    except Exception as e:
        logger.error(f"❌ [API] next-uhid error: {e}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500

# Alternate endpoint that accepts query param (more robust routing)
@pharmacy_bp.route('/api/medicine-details', methods=['GET'])
@token_required
def api_medicine_details_query(current_user):
    name = request.args.get('name', '').strip()
    if not name:
        return jsonify({'success': False, 'message': 'name is required'}), 400
    return get_medicine_details_impl(name)

def generate_uhid():
    """Generate a new UHId based on date and existing records"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        year_month = datetime.now().strftime('%y%m')  # YYMM format
        
        # Get today's patients to find the next available letter+number combo
        result = client.execute("""
            SELECT UHId FROM Patients 
            WHERE substr(Date, 1, 10) = ?
            ORDER BY UHId DESC
            LIMIT 1
        """, [today])
        
        if hasattr(result, 'rows') and result.rows:
            last_uhid = result.rows[0][0]
            # Extract the numeric part (last 3 digits)
            if last_uhid and len(last_uhid) >= 7:
                try:
                    last_num = int(last_uhid[-3:])
                    next_num = last_num + 1
                    # Use letters in rotation: A, B, C, ... Z
                    letter = chr(65 + (next_num // 100) % 26)  # A=65
                    return f"{year_month}{letter}{next_num:03d}"
                except:
                    pass
        
        # Default: start with A001
        return f"{year_month}A001"
    except Exception as e:
        logger.error(f"Error generating UHId: {str(e)}")
        return f"{datetime.now().strftime('%y%m')}A001"

@pharmacy_bp.route('/', methods=['GET', 'POST'])
def pharmacy():
    try:
        if request.method == 'POST':
            # Process prescription submission
            patient_name = request.form.get('patient_name', '').strip()
            phone_no = request.form.get('phone_no', '').strip()
            uhid = request.form.get('uhid', '').strip()
            age = request.form.get('age', '').strip()
            gender = request.form.get('gender', '').strip()
            payment_mode = (request.form.get('payment_mode', '') or '').strip()
            cash_amount_raw = (request.form.get('cash_amount', '') or '').strip()
            upi_amount_raw = (request.form.get('upi_amount', '') or '').strip()
            
            # Validate required fields
            if not patient_name:
                flash('Patient name is required', 'error')
                return redirect(url_for('pharmacy.pharmacy'))
            
            # Check if this is a new patient by verifying if UHId exists in database
            is_new_patient = False
            if uhid:
                # Check if UHId exists in Patients table
                try:
                    check_result = client.execute("""
                        SELECT COUNT(*) FROM Patients WHERE UHId = ?
                    """, [uhid])
                    exists = check_result.rows[0][0] if check_result.rows else 0
                    is_new_patient = (exists == 0)
                except Exception as check_error:
                    logger.warning(f"Could not verify UHId existence: {check_error}")
                    is_new_patient = True
            else:
                # No UHId provided, definitely a new patient
                is_new_patient = True
            
            if is_new_patient:
                logger.info(f"🆕 New patient detected: {patient_name}")

                # Only add to Patients table if phone number is provided
                if phone_no:
                    try:
                        # Generate new UHId if not already provided
                        if not uhid:
                            uhid = generate_uhid_from_name(patient_name)
                        
                        today_date = datetime.now().strftime('%Y-%m-%d')

                        # Insert new patient record
                        client.execute("""
                            INSERT INTO Patients (UHId, Date, PName, PhoneNo, Age, Gender)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, [uhid, today_date, patient_name, phone_no, age if age else None, gender if gender else None])

                        logger.info(f"✓ New patient added to database: {patient_name} (UHId: {uhid})")
                        flash(f'New patient registered with UHId: {uhid}', 'info')
                    except Exception as patient_error:
                        logger.error(f"❌ Error adding new patient: {str(patient_error)}", exc_info=True)
                        flash('Could not register patient in database', 'warning')
                        if not uhid:
                            uhid = f"TEMP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
                else:
                    # No phone provided; do not add to Patients table
                    logger.info(f"ℹ New patient '{patient_name}' without phone number - skipping Patients table insert")
                    if not uhid:
                        uhid = f"TEMP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Get medicines data
            medicines = []
            i = 1
            while f'medicine_{i}' in request.form:
                medicine = {
                    'name': request.form.get(f'medicine_{i}'),
                    'quantity': int(request.form.get(f'quantity_{i}')),
                    'price': float(request.form.get(f'price_{i}')),
                    'dosage': request.form.get(f'dosage_{i}'),
                    'duration': request.form.get(f'duration_{i}'),
                    'total': float(request.form.get(f'total_{i}'))
                }
                medicines.append(medicine)
                i += 1
            
            if not medicines:
                flash('Please add at least one medicine', 'error')
                return redirect(url_for('pharmacy.pharmacy'))
            
            # Calculate totals
            gross_total = sum(med['total'] for med in medicines)
            # Optional discount and comments
            discount_raw = (request.form.get('discount_amount', '') or '').strip()
            comments = (request.form.get('payment_comments', '') or '').strip()
            try:
                discount_amount = float(discount_raw or 0)
                # Allow negative discounts (they add to total, e.g., -21 adds ₹21)
            except Exception:
                discount_amount = 0.0
            # Payable after discount: negative discount adds to total, positive subtracts
            # Example: gross=100, discount=-21 → total=121; discount=21 → total=79
            total_amount = max(gross_total - discount_amount, 0.0)

            # Normalize payment inputs
            def _to_float(value: str) -> float:
                try:
                    return float(value)
                except Exception:
                    return 0.0

            cash_amount = _to_float(cash_amount_raw)
            upi_amount = _to_float(upi_amount_raw)

            if payment_mode == 'Cash':
                cash_amount = total_amount
                upi_amount = 0.0
            elif payment_mode == 'UPI':
                upi_amount = total_amount
                cash_amount = 0.0
            elif payment_mode == 'Both':
                # If client sent mismatched values, cap to total and adjust
                if cash_amount < 0:
                    cash_amount = 0.0
                if upi_amount < 0:
                    upi_amount = 0.0
                s = cash_amount + upi_amount
                if abs(s - total_amount) > 0.01:
                    logger.warning(f"[Pharmacy] Payment split mismatch: cash={cash_amount}, upi={upi_amount}, total={total_amount}. Adjusting upi part.")
                    upi_amount = max(0.0, total_amount - cash_amount)
            else:
                # Default fallback to Cash if not provided
                payment_mode = 'Cash'
                cash_amount = total_amount
                upi_amount = 0.0
            
            # Generate prescription ID for reference
            prescription_id = f"RX-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Create MedicineInvoices entry
            try:
                invoice_id = generate_invoice_id_for_today()
                # InvoiceDate must follow "YYYY-MM-DD HH:MM"
                invoice_date = datetime.now().strftime('%Y-%m-%d %H:%M')
                cols = _get_table_columns('MedicineInvoices')
                invoice_date_col = _match_column(cols, 'InvoiceDate')
                invoice_id_col = _match_column(cols, 'InvoiceId')
                uhid_col = _match_column(cols, 'UHId')
                total_col = _match_column(cols, 'TotalAmc', 'TotalAmo', 'TotalAmount', 'TotalAmt')
                discount_col = _match_column(cols, 'Discount', 'DiscountAmount', 'DiscountAmt')
                payment_col = _match_column(cols, 'PaymentMode', 'Payment_Mode')
                pname_col = _match_column(cols, 'PName', 'PatientName')
                phone_col = _match_column(cols, 'PhoneNo', 'Phone')
                comment_col = _match_column(cols, 'Comments', 'Remark', 'Notes')
                cash_col = _match_column(cols, 'Cash_Amo', 'Cash_Amount', 'CashAmt', 'CashAmount')
                upi_col = _match_column(cols, 'UPI_Amo', 'UPI_Amount', 'UPIAmt', 'UPIAmount')

                required_cols = {
                    'InvoiceDate': invoice_date_col,
                    'InvoiceId': invoice_id_col,
                    'UHId': uhid_col,
                    'PaymentMode': payment_col,
                    'PName': pname_col,
                }
                missing_required = [name for name, col in required_cols.items() if col is None]
                if missing_required:
                    raise RuntimeError(f"MedicineInvoices missing required columns: {missing_required}")

                column_value_pairs = [
                    (invoice_date_col, invoice_date),
                    (invoice_id_col, invoice_id),
                    (uhid_col, uhid),
                    (payment_col, payment_mode),
                    (pname_col, patient_name),
                ]
                if discount_col:
                    column_value_pairs.append((discount_col, discount_amount))
                if total_col:
                    column_value_pairs.append((total_col, total_amount))
                if comment_col:
                    column_value_pairs.append((comment_col, comments))
                if phone_col:
                    column_value_pairs.append((phone_col, phone_no))
                if cash_col:
                    column_value_pairs.append((cash_col, cash_amount if payment_mode in ('Cash', 'Both') else 0.0))
                if upi_col:
                    column_value_pairs.append((upi_col, upi_amount if payment_mode in ('UPI', 'Both') else 0.0))

                insert_cols = [col for col, _ in column_value_pairs]
                insert_vals = [val for _, val in column_value_pairs]
                placeholders = ", ".join(["?"] * len(insert_cols))
                # Quote identifiers to handle names with spaces/trailing spaces
                def quote_ident(ident: str) -> str:
                    return '"' + ident.replace('"', '""') + '"'
                col_list = ", ".join([quote_ident(c) for c in insert_cols])
                sql = f"INSERT INTO MedicineInvoices ({col_list}) VALUES ({placeholders})"
                logger.info(f"[Invoice] Inserting invoice with columns: {insert_cols}")
                inv_res = _safe_execute(sql, insert_vals, context="Insert MedicineInvoices (dynamic)")
                if inv_res is None:
                    raise RuntimeError("MedicineInvoices insert failed")
            except Exception as inv_err:
                logger.error(f"❌ Error inserting MedicineInvoices: {inv_err}", exc_info=True)
            
            # Insert individual medicine line items into Pharmacy table
            try:
                logger.info(f"[Pharmacy] Inserting {len(medicines)} medicine line items into Pharmacy table")
                
                # Get Pharmacy table columns dynamically (same approach as MedicineInvoices)
                pharmacy_cols = _get_table_columns('Pharmacy')
                sale_id_col = _match_column(pharmacy_cols, 'SaleId', 'SaleID', 'Sale_Id')
                mid_col = _match_column(pharmacy_cols, 'MId', 'MID', 'MedicineId', 'Medicine_Id')
                invoice_id_col_pharm = _match_column(pharmacy_cols, 'InvoiceId', 'InvoiceID', 'Invoice_Id')
                mstock_col = _match_column(pharmacy_cols, 'Mstock', 'MStock', 'Stock', 'Quantity', 'Qty')
                mtotal_col = _match_column(pharmacy_cols, 'MTotal', 'Mtotal', 'ItemTotal', 'Item_Total')
                btotal_col = _match_column(pharmacy_cols, 'BTotal', 'Btotal', 'RunningTotal', 'Running_Total')
                pname_col_pharm = _match_column(pharmacy_cols, 'PName', 'PatientName', 'Patient_Name')
                
                # Check required columns exist
                required_pharmacy_cols = {
                    'SaleId': sale_id_col,
                    'InvoiceId': invoice_id_col_pharm,
                }
                missing_pharmacy = [name for name, col in required_pharmacy_cols.items() if col is None]
                if missing_pharmacy:
                    raise RuntimeError(f"Pharmacy table missing required columns: {missing_pharmacy}")
                
                running_total = 0.0
                
                for idx, med in enumerate(medicines, start=1):
                    # Generate SaleId: InvoiceId + item counter (01, 02, 03...)
                    sale_id = f"{invoice_id}{idx:02d}"
                    
                    # Get Medicine ID (MId) from MedicineList
                    mid_result = client.execute("""
                        SELECT MId FROM MedicineList 
                        WHERE TRIM(MName) = TRIM(?) COLLATE NOCASE
                        LIMIT 1
                    """, [med['name']])
                    
                    medicine_id = None
                    if hasattr(mid_result, 'rows') and mid_result.rows:
                        medicine_id = mid_result.rows[0][0]
                    
                    # Calculate item total (Mstock * MRP)
                    item_total = med['quantity'] * med['price']
                    running_total += item_total
                    
                    # Build dynamic insert for Pharmacy table
                    pharmacy_pairs = [
                        (sale_id_col, sale_id),
                        (invoice_id_col_pharm, invoice_id),
                    ]
                    if mid_col and medicine_id:
                        pharmacy_pairs.append((mid_col, medicine_id))
                    if mstock_col:
                        pharmacy_pairs.append((mstock_col, med['quantity']))
                    if mtotal_col:
                        pharmacy_pairs.append((mtotal_col, item_total))
                    if btotal_col:
                        pharmacy_pairs.append((btotal_col, running_total))
                    if pname_col_pharm:
                        pharmacy_pairs.append((pname_col_pharm, patient_name))
                    
                    pharm_cols = [col for col, _ in pharmacy_pairs]
                    pharm_vals = [val for _, val in pharmacy_pairs]
                    pharm_placeholders = ", ".join(["?"] * len(pharm_cols))
                    
                    def quote_ident(ident: str) -> str:
                        return '"' + ident.replace('"', '""') + '"'
                    
                    pharm_col_list = ", ".join([quote_ident(c) for c in pharm_cols])
                    pharm_sql = f"INSERT INTO Pharmacy ({pharm_col_list}) VALUES ({pharm_placeholders})"
                    
                    logger.info(f"[Pharmacy] Inserting with columns: {pharm_cols}")
                    pharm_res = _safe_execute(pharm_sql, pharm_vals, context=f"Insert Pharmacy line {idx}")
                    if pharm_res is None:
                        logger.error(f"[Pharmacy] Failed to insert line item {idx}")
                    else:
                        logger.info(f"[Pharmacy] ✓ Inserted SaleId={sale_id}, MId={medicine_id}, Qty={med['quantity']}, MTotal={item_total:.2f}, BTotal={running_total:.2f}")
                
                logger.info(f"[Pharmacy] ✓ Successfully inserted {len(medicines)} line items into Pharmacy table")
                
            except Exception as pharmacy_err:
                logger.error(f"❌ Error inserting into Pharmacy table: {pharmacy_err}", exc_info=True)
                flash('Warning: Invoice created but pharmacy records may be incomplete', 'warning')
            
            extra = f" | Discount ₹{discount_amount:.2f}" if discount_amount > 0 else ""
            if comments:
                extra += f" | Note: {comments}"
            flash(f'Prescription {prescription_id} created successfully! Invoice {invoice_id}. Total ₹{gross_total:.2f}{extra}. Payable ₹{total_amount:.2f}. Payment: {payment_mode} (Cash ₹{cash_amount:.2f}, UPI ₹{upi_amount:.2f})', 'success')
            return redirect(url_for('pharmacy.pharmacy'))
        
        # GET request - display form
        # Get today's registered patients strictly by Date
        today = datetime.now().strftime('%Y-%m-%d')
        try:
            # Debug: Check what Date values actually exist in the database
            debug_result = client.execute("""
                SELECT DISTINCT substr(TRIM(Date), 1, 10) as DateShort, Date as DateFull, COUNT(*) as cnt
                FROM Patients 
                GROUP BY DateShort
                ORDER BY DateShort DESC
                LIMIT 5
            """)
            logger.info(f"[Pharmacy] DEBUG: Sample Date values in database:")
            if hasattr(debug_result, 'rows') and debug_result.rows:
                for row in debug_result.rows[:5]:
                    logger.info(f"  DateShort: '{row[0]}', DateFull: '{row[1]}', Count: {row[2]}")
            else:
                logger.warning("[Pharmacy] DEBUG: No rows returned from debug query")
            
            logger.info(f"[Pharmacy] DEBUG: Looking for patients with Date matching: '{today}'")
            
            # TEST: Try fetching 2025-10-23 (which we know exists) to verify query works
            test_date = "2025-10-23"
            test_result = client.execute("""
                SELECT DISTINCT PName, PhoneNo, UHId 
                FROM Patients 
                WHERE Date = ?
                ORDER BY PName
            """, [test_date])
            test_count = len(getattr(test_result, 'rows', []) or [])
            logger.info(f"[Pharmacy] TEST: Query for {test_date} returned {test_count} patient(s)")
            if test_count > 0:
                logger.info(f"[Pharmacy] TEST: Sample rows from {test_date}: {test_result.rows[:2]}")
            
            # Try multiple query formats for today
            patients_result = client.execute("""
                SELECT DISTINCT PName, PhoneNo, UHId 
                FROM Patients 
                WHERE Date = ?
                ORDER BY PName
            """, [today])
            
            row_count = len(getattr(patients_result, 'rows', []) or [])
            logger.info(f"[Pharmacy] Loaded {row_count} patient(s) for date {today}")
            
            # If no results, try alternative queries
            if row_count == 0:
                logger.info(f"[Pharmacy] Trying alternative query with substr: substr(TRIM(Date), 1, 10) = '{today}'")
                patients_result = client.execute("""
                    SELECT DISTINCT PName, PhoneNo, UHId 
                    FROM Patients 
                    WHERE substr(TRIM(Date), 1, 10) = ?
                    ORDER BY PName
                """, [today])
                row_count = len(getattr(patients_result, 'rows', []) or [])
                logger.info(f"[Pharmacy] Alternative query returned {row_count} patient(s)")
                
                # Also check if there's a patient with UHId 2510A0143 (from the image)
                specific_uhid = "2510A0143"
                specific_result = client.execute("""
                    SELECT PName, PhoneNo, UHId, Date
                    FROM Patients 
                    WHERE UHId = ?
                """, [specific_uhid])
                if hasattr(specific_result, 'rows') and specific_result.rows:
                    logger.info(f"[Pharmacy] Found patient with UHId {specific_uhid}: Date='{specific_result.rows[0][3]}'")

            if row_count > 0:
                logger.info(f"[Pharmacy] Sample patient rows: {patients_result.rows[:3]}")
            today_patients = [dict(zip(['PName', 'Phone', 'UHId'], row)) for row in getattr(patients_result, 'rows', [])]
        except Exception as patient_load_err:
            logger.error(f"✗ Error loading today's patients: {str(patient_load_err)}", exc_info=True)
            today_patients = []
        
        # Get available medicines from MedicineList table
        medicines = []
        try:
            logger.info("🔍 Attempting to load medicines from MedicineList table...")
            medicines_result = client.execute("""
                SELECT MId, MName, MRP, MCompany, CurrentStock, MType
                FROM MedicineList 
                WHERE MRP IS NOT NULL
                ORDER BY MName
            """)
            
            # Debug: Log the raw result
            logger.info(f"Query executed. Result type: {type(medicines_result)}")
            logger.info(f"Result has rows: {hasattr(medicines_result, 'rows')}")
            
            if hasattr(medicines_result, 'rows'):
                logger.info(f"Number of rows: {len(medicines_result.rows)}")
                medicines = [dict(zip(['MId', 'MName', 'MRP', 'MCompany', 'CurrentStock', 'MType'], row)) for row in medicines_result.rows]
                logger.info(f"✓ Successfully loaded {len(medicines)} medicines from database")
                
                # Debug: Print first 3 medicines
                if medicines:
                    logger.info(f"Sample medicines: {medicines[:3]}")
            else:
                logger.error("❌ Result doesn't have 'rows' attribute")
                medicines = []
            
            # If no medicines found, log a warning
            if not medicines:
                logger.warning("⚠ No medicines found in MedicineList table")
                flash('No medicines available in the database', 'warning')
        except Exception as med_error:
            logger.error(f"✗ Error loading medicines: {str(med_error)}", exc_info=True)
            medicines = []
            flash(f'Error loading medicines: {str(med_error)}', 'error')
        
        return render_template('pharmacy.html', 
                             today_patients=today_patients,
                             medicines=medicines,
                             today_date=today,
                             active_page='pharmacy')
        
    except Exception as e:
        logger.error(f"❌ Error in pharmacy route: {str(e)}", exc_info=True)
        flash(f'An error occurred: {str(e)}', 'error')
        return render_template('pharmacy.html', 
                             today_patients=[],
                             medicines=[],
                             today_date=datetime.now().strftime('%Y-%m-%d'),
                             active_page='pharmacy')


# --- Protected API Endpoints for React Frontend ---

@pharmacy_bp.route('/api/today-patients', methods=['GET'])
@token_required
def api_get_today_patients(current_user):
    """API endpoint to get today's patients for pharmacy"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        
        patients_result = client.execute("""
            SELECT DISTINCT PName, PhoneNo, UHId
            FROM Patients
            WHERE substr(Date, 1, 10) = ?
            ORDER BY PName
        """, [today])
        
        patients = [dict(zip(['PName', 'Phone', 'UHId'], row)) for row in getattr(patients_result, 'rows', [])]
        
        return jsonify({
            "success": True,
            "data": patients,
            "count": len(patients)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching today's patients: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to fetch patients: {str(e)}"}), 500


@pharmacy_bp.route('/api/medicines', methods=['GET'])
@token_required
def api_get_medicines(current_user):
    """API endpoint to get available medicines with stock"""
    try:
        medicines_result = client.execute("""
            SELECT MId, MName, MRP, MCompany, CurrentStock, MType
            FROM MedicineList 
            WHERE MRP IS NOT NULL
            ORDER BY MName
        """)
        
        medicines = [dict(zip(['MId', 'MName', 'MRP', 'MCompany', 'CurrentStock', 'MType'], row)) 
                    for row in medicines_result.rows]
        
        return jsonify({
            "success": True,
            "data": medicines,
            "count": len(medicines)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching medicines: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to fetch medicines: {str(e)}"}), 500


@pharmacy_bp.route('/api/medicine/<int:mid>', methods=['GET'])
@token_required
def api_get_medicine_by_id(current_user, mid):
    """API endpoint to get medicine details by ID"""
    try:
        medicine_result = client.execute("""
            SELECT MId, MName, MRP, MCompany, CurrentStock, MType
            FROM MedicineList 
            WHERE MId = ?
        """, [mid])
        
        if not medicine_result.rows:
            return jsonify({"error": "Medicine not found"}), 404
        
        medicine = dict(zip(['MId', 'MName', 'MRP', 'MCompany', 'CurrentStock', 'MType'], 
                           medicine_result.rows[0]))
        
        # Get latest batch from StockDeliveries
        try:
            batch_result = client.execute("""
                SELECT BatchNo
                FROM StockDeliveries 
                WHERE TRIM(MName) = TRIM(?) COLLATE NOCASE
                ORDER BY DeliveryDate DESC
                LIMIT 1
            """, [medicine['MName']])
            
            if batch_result.rows and batch_result.rows[0][0]:
                medicine['BatchNo'] = batch_result.rows[0][0]
            else:
                medicine['BatchNo'] = None
        except:
            medicine['BatchNo'] = None
        
        return jsonify({
            "success": True,
            "data": medicine
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching medicine: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to fetch medicine: {str(e)}"}), 500


@pharmacy_bp.route('/api/invoice', methods=['POST'])
@token_required
def api_create_invoice(current_user):
    """API endpoint to create pharmacy invoice - uses same dynamic column approach as form handler"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400
        
        # Extract patient information
        patient_name = data.get('patient_name', '').strip()
        phone_no = data.get('phone_no', '').strip()
        uhid = data.get('uhid', '').strip()
        age = str(data.get('age', '') or '').strip()
        gender = str(data.get('gender', '') or '').strip()
        comments = str(data.get('comments', '') or '').strip()
        
        if not patient_name:
            return jsonify({"error": "Patient name is required"}), 400
        
        # Check if new patient
        is_new_patient = False
        if uhid:
            try:
                check_result = client.execute("SELECT COUNT(*) FROM Patients WHERE UHId = ?", [uhid])
                exists = 0
                if hasattr(check_result, 'rows') and check_result.rows:
                    exists = check_result.rows[0][0]
                is_new_patient = (exists == 0)
            except Exception as check_err:
                logger.warning(f"Could not verify UHId existence: {check_err}")
                is_new_patient = True
        else:
            is_new_patient = True
        
        # Add new patient if needed
        if is_new_patient and phone_no:
            if not uhid:
                uhid = generate_uhid_from_name(patient_name)
            
            today_date = datetime.now().strftime('%Y-%m-%d')
            try:
                client.execute("""
                    INSERT INTO Patients (UHId, Date, PName, PhoneNo, Age, Gender)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, [uhid, today_date, patient_name, phone_no, age if age else None, gender if gender else None])
                logger.info(f"✓ New patient added: {patient_name} (UHId: {uhid})")
            except Exception as patient_err:
                logger.error(f"Error adding new patient: {patient_err}")
        elif is_new_patient:
            uhid = f"TEMP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Get medicines data
        medicines = data.get('medicines', [])
        if not medicines:
            return jsonify({"error": "At least one medicine is required"}), 400
        
        # Calculate total
        total_amount = sum(float(med.get('price', 0)) * int(med.get('quantity', 1)) 
                          for med in medicines)
        
        # Apply discount (negative discount adds to total)
        discount = float(data.get('discount', 0) or 0)
        final_amount = max(total_amount - discount, 0)
        
        # Get payment information
        payment_mode = str(data.get('payment_mode', '') or '').strip()
        cash_amount = float(data.get('cash_amount', 0) or 0)
        upi_amount = float(data.get('upi_amount', 0) or 0)
        
        # Generate invoice ID
        invoice_id = generate_invoice_id_for_today()
        invoice_date = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        # Use dynamic column approach like the form POST handler
        cols = _get_table_columns('MedicineInvoices')
        invoice_date_col = _match_column(cols, 'InvoiceDate')
        invoice_id_col = _match_column(cols, 'InvoiceId')
        uhid_col = _match_column(cols, 'UHId')
        total_col = _match_column(cols, 'TotalAmc', 'TotalAmo', 'TotalAmount', 'TotalAmt')
        discount_col = _match_column(cols, 'Discount', 'DiscountAmount', 'DiscountAmt')
        payment_col = _match_column(cols, 'PaymentMode', 'Payment_Mode')
        pname_col = _match_column(cols, 'PName', 'PatientName')
        phone_col = _match_column(cols, 'PhoneNo', 'Phone', 'PatientPhone')
        comment_col = _match_column(cols, 'Comments', 'Remark', 'Notes')
        cash_col = _match_column(cols, 'Cash_Amo', 'Cash_Amount', 'CashAmt', 'CashAmount')
        upi_col = _match_column(cols, 'UPI_Amo', 'UPI_Amount', 'UPIAmt', 'UPIAmount')

        required_cols = {
            'InvoiceDate': invoice_date_col,
            'InvoiceId': invoice_id_col,
            'UHId': uhid_col,
            'PaymentMode': payment_col,
            'PName': pname_col,
        }
        missing_required = [name for name, col in required_cols.items() if col is None]
        if missing_required:
            logger.error(f"MedicineInvoices missing required columns: {missing_required}")
            return jsonify({"error": f"Database schema missing columns: {missing_required}"}), 500

        column_value_pairs = [
            (invoice_date_col, invoice_date),
            (invoice_id_col, invoice_id),
            (uhid_col, uhid),
            (payment_col, payment_mode),
            (pname_col, patient_name),
        ]
        if discount_col:
            column_value_pairs.append((discount_col, discount))
        if total_col:
            column_value_pairs.append((total_col, final_amount))
        if comment_col:
            column_value_pairs.append((comment_col, comments))
        if phone_col:
            column_value_pairs.append((phone_col, phone_no))
        if cash_col:
            column_value_pairs.append((cash_col, cash_amount if payment_mode in ('Cash', 'Both') else 0.0))
        if upi_col:
            column_value_pairs.append((upi_col, upi_amount if payment_mode in ('UPI', 'Both') else 0.0))

        insert_cols = [col for col, _ in column_value_pairs]
        insert_vals = [val for _, val in column_value_pairs]
        placeholders = ", ".join(["?"] * len(insert_cols))
        
        def quote_ident(ident: str) -> str:
            return '"' + ident.replace('"', '""') + '"'
        
        col_list = ", ".join([quote_ident(c) for c in insert_cols])
        sql = f"INSERT INTO MedicineInvoices ({col_list}) VALUES ({placeholders})"
        logger.info(f"[Invoice API] Inserting invoice with columns: {insert_cols}")
        
        inv_res = _safe_execute(sql, insert_vals, context="API Insert MedicineInvoices")
        if inv_res is None:
            return jsonify({"error": "Failed to insert invoice into database"}), 500
        
        # Insert into Pharmacy table (line items)
        try:
            pharmacy_cols = _get_table_columns('Pharmacy')
            sale_id_col = _match_column(pharmacy_cols, 'SaleId', 'SaleID', 'Sale_Id')
            mid_col = _match_column(pharmacy_cols, 'MId', 'MID', 'MedicineId', 'Medicine_Id')
            invoice_id_col_pharm = _match_column(pharmacy_cols, 'InvoiceId', 'InvoiceID', 'Invoice_Id')
            mstock_col = _match_column(pharmacy_cols, 'Mstock', 'MStock', 'Stock', 'Quantity', 'Qty')
            mtotal_col = _match_column(pharmacy_cols, 'MTotal', 'Mtotal', 'ItemTotal', 'Item_Total')
            btotal_col = _match_column(pharmacy_cols, 'BTotal', 'Btotal', 'RunningTotal', 'Running_Total')
            pname_col_pharm = _match_column(pharmacy_cols, 'PName', 'PatientName', 'Patient_Name')
            
            running_total = 0.0
            
            for idx, med in enumerate(medicines, start=1):
                medicine_name = med.get('medicine', '').strip()
                quantity = int(med.get('quantity', 1))
                price = float(med.get('price', 0))
                
                # Generate SaleId
                sale_id = f"{invoice_id}{idx:02d}"
                
                # Get Medicine ID
                medicine_id = None
                try:
                    mid_result = client.execute("""
                        SELECT MId FROM MedicineList 
                        WHERE TRIM(MName) = TRIM(?) COLLATE NOCASE
                        LIMIT 1
                    """, [medicine_name])
                    if hasattr(mid_result, 'rows') and mid_result.rows:
                        medicine_id = mid_result.rows[0][0]
                except Exception:
                    pass
                
                item_total = quantity * price
                running_total += item_total
                
                # Build dynamic insert
                pharmacy_pairs = []
                if sale_id_col:
                    pharmacy_pairs.append((sale_id_col, sale_id))
                if invoice_id_col_pharm:
                    pharmacy_pairs.append((invoice_id_col_pharm, invoice_id))
                if mid_col and medicine_id:
                    pharmacy_pairs.append((mid_col, medicine_id))
                if mstock_col:
                    pharmacy_pairs.append((mstock_col, quantity))
                if mtotal_col:
                    pharmacy_pairs.append((mtotal_col, item_total))
                if btotal_col:
                    pharmacy_pairs.append((btotal_col, running_total))
                if pname_col_pharm:
                    pharmacy_pairs.append((pname_col_pharm, patient_name))
                
                if pharmacy_pairs:
                    pharm_cols = [col for col, _ in pharmacy_pairs]
                    pharm_vals = [val for _, val in pharmacy_pairs]
                    pharm_placeholders = ", ".join(["?"] * len(pharm_cols))
                    pharm_col_list = ", ".join([quote_ident(c) for c in pharm_cols])
                    pharm_sql = f"INSERT INTO Pharmacy ({pharm_col_list}) VALUES ({pharm_placeholders})"
                    _safe_execute(pharm_sql, pharm_vals, context=f"API Insert Pharmacy line {idx}")
                
                # Update stock
                try:
                    client.execute("""
                        UPDATE MedicineList
                        SET CurrentStock = CurrentStock - ?
                        WHERE TRIM(MName) = TRIM(?) COLLATE NOCASE
                    """, [quantity, medicine_name])
                except Exception as stock_err:
                    logger.warning(f"Could not update stock for {medicine_name}: {stock_err}")
                    
        except Exception as pharm_err:
            logger.warning(f"Could not insert into Pharmacy table: {pharm_err}")
        
        return jsonify({
            "success": True,
            "message": "Invoice created successfully",
            "invoice_id": invoice_id,
            "uhid": uhid,
            "total_amount": total_amount,
            "final_amount": final_amount
        }), 201
    
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to create invoice: {str(e)}"}), 500


@pharmacy_bp.route('/api/last-invoice', methods=['GET'])
@token_required
def api_get_last_invoice(current_user):
    """API endpoint to get last invoice for printing"""
    try:
        # Get last invoice
        invoice_result = client.execute("""
            SELECT InvoiceId, InvoiceDate, PatientName, PatientPhone, UHId, 
                   TotalAmount, Discount, FinalAmount, PaymentMode, CashAmount, UPIAmount
            FROM MedicineInvoices
            ORDER BY InvoiceDate DESC, InvoiceId DESC
            LIMIT 1
        """)
        
        if not invoice_result.rows:
            return jsonify({"error": "No invoices found"}), 404
        
        invoice = dict(zip(['InvoiceId', 'InvoiceDate', 'PatientName', 'PatientPhone', 'UHId', 
                           'TotalAmount', 'Discount', 'FinalAmount', 'PaymentMode', 'CashAmount', 'UPIAmount'],
                          invoice_result.rows[0]))
        
        # Get invoice items
        items_result = client.execute("""
            SELECT MedicineName, BatchNo, Quantity, Price, Duration
            FROM InvoiceItems
            WHERE InvoiceId = ?
        """, [invoice['InvoiceId']])
        
        items = [dict(zip(['MedicineName', 'BatchNo', 'Quantity', 'Price', 'Duration'], row))
                for row in items_result.rows]
        
        invoice['items'] = items
        
        return jsonify({
            "success": True,
            "data": invoice
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching last invoice: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to fetch invoice: {str(e)}"}), 500