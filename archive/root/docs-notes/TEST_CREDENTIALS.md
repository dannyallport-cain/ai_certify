# 🔑 Test Credentials & Access Information

## 🌐 Application Access

- **Local Development**: [http://localhost:4000](http://localhost:4000)
- **Network Access**: `http://192.168.0.42:4000`
- **Sign In Page**: [http://localhost:4000/sign-in](http://localhost:4000/sign-in)

---

## 👥 Test User Accounts

### 🏢 Owner Account
- **Email**: `owner@test.com`
- **Password**: `admin123`
- **Role**: Owner
- **Name**: John Owner
- **Permissions**: Full system access, team management, billing

### 👨‍💼 Manager Account
- **Email**: `manager@test.com`
- **Password**: `manager123`
- **Role**: Manager
- **Name**: Sarah Manager
- **Permissions**: Team management, certificate creation, customer management

### 🔍 Inspector Account
- **Email**: `inspector@test.com`
- **Password**: `inspector123`
- **Role**: Inspector
- **Name**: Mike Inspector
- **Permissions**: Certificate creation and editing, inspections

### 👤 Member Account
- **Email**: `member@test.com`
- **Password**: `member123`
- **Role**: Member
- **Name**: Lisa Member
- **Permissions**: Basic access, view certificates

---

## 🏢 Sample Teams

### Team 1: Fire Safety Pro Ltd
- **Plan**: Plus
- **Status**: Active
- **Members**: John Owner (owner), Sarah Manager (manager), Mike Inspector (inspector)

### Team 2: Safe Buildings Co
- **Plan**: Base
- **Status**: Active
- **Members**: Sarah Manager (owner)

### Team 3: City Inspectors Group
- **Plan**: Plus
- **Status**: Trial
- **Members**: Mike Inspector (manager)

---

## 🏢 Sample Customers

### Office Tower One
- **Email**: `management@towerfirst.com`
- **Phone**: `020 7123 4567`
- **Address**: `123 Business Street, London`
- **Postcode**: `EC1A 1BB`
- **Contact**: James Wilson

### Shopping Mall Complex
- **Email**: `facilities@mallcomplex.com`
- **Phone**: `020 7234 5678`
- **Address**: `45 Retail Avenue, Manchester`
- **Postcode**: `M1 1AA`
- **Contact**: Emma Thompson

### City Hospital
- **Email**: `maintenance@cityhospital.nhs.uk`
- **Phone**: `020 7345 6789`
- **Address**: `789 Health Street, Birmingham`
- **Postcode**: `B1 1CC`
- **Contact**: Dr. Robert Brown

---

## 📋 Sample Certificates

The system includes sample certificates for:
- **BS5839-1** (Fire Detection and Alarm Systems)
- **BS5839-6** (Smoke Alarm Systems)
- **BS5266** (Emergency Lighting)
- **Fire Extinguisher** Inspections
- **Dry Riser** Testing

---

## 💳 Stripe Test Payment Details

### Test Card Numbers
- **Visa**: `4242 4242 4242 4242`
- **Visa (Debit)**: `4000 0566 5566 5556`
- **Mastercard**: `5555 5555 5555 4444`
- **American Express**: `3782 822463 10005`

### Test Details
- **Expiration**: Any future date (e.g., `12/25`)
- **CVC**: Any 3-digit number (e.g., `123`)
- **ZIP**: Any 5-digit number (e.g., `12345`)

### Subscription Plans
- **Base Plan**: $8/month with 7-day trial
- **Plus Plan**: $12/month with 7-day trial

---

## 🔧 Development Information

### Environment
- **Port**: 4000
- **Database**: Railway PostgreSQL
- **Stripe**: Test mode enabled
- **Webhook**: Active on `localhost:4000/api/stripe/webhook`

### API Endpoints
- **User API**: `/api/user`
- **Team API**: `/api/team`
- **Certificates API**: `/api/certificates`
- **Customers API**: `/api/customers`
- **Stripe Webhook**: `/api/stripe/webhook`

---

## 🚀 Quick Start Testing

1. **Visit**: [http://localhost:4000](http://localhost:4000)
2. **Sign In**: Use `owner@test.com` / `admin123` for full access
3. **Explore Features**:
   - Dashboard overview
   - Certificate management
   - Customer database
   - Team settings
   - Billing/subscriptions

---

## 📧 Pending Invitations

- **Email**: `pending@test.com` (Inspector role)
- **Email**: `accepted@test.com` (Member role)

---

## 🔍 Testing Scenarios

### Certificate Management
1. Create new certificates for different standards
2. Add inspection items and defects
3. Generate PDF reports
4. Track certificate status

### Customer Management
1. Add new customers
2. Assign certificates to customers
3. Manage customer contact information

### Team Collaboration
1. Invite new team members
2. Assign different roles and permissions
3. Track team activity

### Payment Testing
1. Subscribe to different plans
2. Test payment flows with test cards
3. Manage subscription changes

---

**🔒 Security Note**: These are test credentials for development only. Never use these in production! 