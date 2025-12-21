# PharmaFlow IMS - Backend

A Flask-based REST API backend for the PharmaFlow Inventory Management System. This backend handles patient registration, pharmacy operations, inventory management, payments, and reporting.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** (Python 3.10+ recommended)
- **pip** (Python package manager)
- **Git** (for cloning the repository)
- **SQLite** (included with Python) or **Turso Database** (for cloud database)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd IMS-Fretboard-v1/backend
```

### 2. Create a Virtual Environment

```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Database Configuration
USE_SQLITE=1                    # Set to "1" for SQLite, "0" for Turso
SQLITE_PATH=database/MedicalStore.db

# For Turso Database (if USE_SQLITE=0)
# TURSO_URL=your-turso-database-url
# TURSO_AUTH_TOKEN=your-turso-auth-token

# Application Security
SECRET_KEY=your-secret-key-here-change-in-production

# CORS Configuration (comma-separated URLs)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Keep-Alive Configuration (for Render.com or similar)
KEEP_ALIVE_ENABLED=1
KEEP_ALIVE_INTERVAL=840
APP_URL=
```

**Important:**

- Change `SECRET_KEY` to a secure random string in production
- Update `CORS_ORIGINS` to match your frontend URL(s)
- The database file will be created automatically if it doesn't exist

### 5. Initialize Database

The database will be automatically initialized when you first run the application. If you need to create an initial admin user, use the `add_user.py` script:

```bash
python add_user.py
```

This will create a user with:

- Username: `amodh`
- Password: `devP@ssword1`

**⚠️ Change these credentials immediately in production!**

### 6. Run the Application

```bash
# Development mode
python app.py

# Or using Flask's development server
flask run --host=0.0.0.0 --port=10000
```

The API will be available at `http://localhost:10000`

## 📁 Project Structure

```
backend/
├── app.py                 # Main Flask application and routes
├── auth.py                # JWT authentication utilities
├── db_connect.py          # Database connection handler
├── patient_form.py        # Patient/OP registration endpoints
├── pharmacy.py            # Pharmacy operations endpoints
├── inventory.py           # Inventory management endpoints
├── payments.py            # Payment processing endpoints
├── reports.py             # Reports and analytics endpoints
├── add_user.py            # Script to add initial users
├── requirements.txt       # Python dependencies
├── database/              # SQLite database directory
│   └── MedicalStore.db   # SQLite database file
├── static/                # Static files (CSS, images)
└── templates/             # HTML templates (legacy)
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Patient Management

- `GET /patient/api/today` - Get today's patient entries
- `POST /patient/api/register` - Register new patient
- `GET /patient/api/search` - Search patients
- `GET /patient/api/generate-uhid` - Generate UHID

### Pharmacy

- `GET /pharmacy/api/today-patients` - Get today's patients
- `GET /pharmacy/api/medicines` - List all medicines
- `GET /pharmacy/api/medicine-details` - Get medicine details
- `POST /pharmacy/api/invoice` - Create pharmacy invoice
- `GET /pharmacy/api/last-invoice` - Get last invoice

### Inventory

- `GET /inventory/api/agencies` - List agencies/suppliers
- `GET /inventory/api/medicines` - List medicines
- `GET /inventory/api/medicine/{name}` - Get medicine details
- `POST /inventory/api/bill` - Save purchase bill
- `POST /inventory/api/add-medicine` - Add new medicine
- `POST /inventory/update-price` - Update medicine price
- `GET /inventory/api/medicine-types` - Get medicine types

### Payments

- `GET /payments/api/agencies` - List agencies
- `GET /payments/api/bills` - Get supplier bills
- `POST /payments/api/mark-paid/{bill_id}` - Mark bill as paid

### Reports

- `GET /reports/api/stock` - Get stock data
- `GET /reports/api/statistics` - Get stock statistics
- `GET /reports/api/filters` - Get filter options

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🗄️ Database

### SQLite (Default)

The application uses SQLite by default for local development. The database file is stored in `database/MedicalStore.db`.

### Turso (Cloud Database)

To use Turso database:

1. Set `USE_SQLITE=0` in `.env`
2. Provide `TURSO_URL` and `TURSO_AUTH_TOKEN` in `.env`

## 🛠️ Development

### Running in Development Mode

```bash
# Enable Flask debug mode
export FLASK_ENV=development
export FLASK_DEBUG=1
python app.py
```

### Testing API Endpoints

You can test the API using tools like:

- **Postman**
- **curl**
- **httpie**

Example:

```bash
curl -X POST http://localhost:10000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"amodh","password":"devP@ssword1"}'
```

## 📦 Dependencies

- **Flask** - Web framework
- **flask-cors** - CORS support
- **pyjwt** - JWT token handling
- **werkzeug** - Password hashing and utilities
- **libsql-client** - Turso database client
- **pandas** - Data manipulation
- **python-dotenv** - Environment variable management

## 🚢 Deployment

### Render.com

The project includes a `render.yaml` file for easy deployment to Render.com. Ensure all environment variables are set in the Render dashboard.

### Other Platforms

1. Set all environment variables
2. Install dependencies: `pip install -r requirements.txt`
3. Run: `python app.py` or use a WSGI server like Gunicorn

## ⚠️ Security Notes

- **Never commit** `.env` files to version control
- Change default credentials before production deployment
- Use strong `SECRET_KEY` values
- Configure CORS properly for your domain
- Use HTTPS in production
- Keep dependencies updated

## 🐛 Troubleshooting

### Database Connection Issues

- Ensure `database/` directory exists
- Check file permissions for SQLite database
- Verify Turso credentials if using cloud database

### CORS Errors

- Add your frontend URL to `CORS_ORIGINS` in `.env`
- Ensure frontend is running on the specified port

### Port Already in Use

- Change the port in `app.py` or use: `flask run --port=10001`
