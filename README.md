backend (Node.js + Express + MySQL) that will handle:

Authentication (Admin + Normal User)

Form CRUD (create, update, delete, list)

Questions inside forms (text, textarea, select, checkbox, file upload, etc.)

Responses (Normal User submits, Admin can view/export)

File uploads (using Multer, stored locally or in cloud later)


🛠 Step 1: Create Backend Project
```bash
# create backend project
mkdir google-form-backend
cd google-form-backend

# initialize node project
npm init -y

# install dependencies
npm install express mysql2 sequelize dotenv bcryptjs jsonwebtoken cors multer

# dev dependencies (nodemon for auto-restart)
npm install --save-dev nodemon
```

## 🛠 Step 2: Project Structure
```pgsql
google-form-backend/
 ├─ node_modules/
 ├─ config/
 │   └─ db.js             # MySQL connection
 ├─ models/
 │   ├─ index.js
 │   ├─ User.js
 │   ├─ Form.js
 │   ├─ Question.js
 │   └─ Response.js
 ├─ routes/
 │   ├─ authRoutes.js
 │   ├─ formRoutes.js
 │   └─ responseRoutes.js
 ├─ middleware/
 │   ├─ authMiddleware.js
 ├─ uploads/              # for file uploads
 ├─ .env
 ├─ server.js
 └─ package.json

```

## 🛠 Step 3: MySQL Database Setup
In MySQL, create a database:
```sql
CREATE DATABASE google_form_clone;

```
## 🛠 Step 4: Configure Database Connection

Environment Variables.
```ini
DB_PORT=5000
DB_HOST=localhost
DB_USERNAME=root
DB_PASSWORD=yourpassword
DB_DATABASE=google_form_clone
JWT_SECRET=supersecretkey

```

/api/auth/register → Register user

/api/auth/login → Login user (returns JWT)

/api/forms → CRUD forms (Admin only)

/api/responses/:formId → Submit responses (User) or view (Admin)