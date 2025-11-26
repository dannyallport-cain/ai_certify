# AI Certifi - Safety Certificate Management System

A comprehensive Next.js application for managing fire safety certificates and inspections, built for fire safety professionals and compliance managers.

**Live Demo**: [Coming Soon]

## 🔥 Features

### Certificate Management
- **BS5839-1**: Fire detection and alarm systems (commercial)
- **BS5839-6**: Fire detection and alarm systems (domestic)
- **BS5266**: Emergency lighting systems
- **Fire Extinguisher**: Portable fire fighting equipment
- **Dry Riser**: Dry riser system testing and maintenance

### Key Capabilities
- ✅ **Multi-page Forms**: British Standards-compliant certificate forms
- ✅ **Customer Management**: Company and contact information tracking
- ✅ **Dashboard Overview**: Certificate status, expiration tracking, and statistics
- ✅ **Type Safety**: Full TypeScript implementation with Drizzle ORM
- ✅ **Modern UI**: Responsive design with shadcn/ui components
- ✅ **Database Integration**: PostgreSQL with automated migrations

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI + Tailwind CSS)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- PostgreSQL database (local or cloud)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-certify.git
   cd ai-certify
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the following variables in `.env`:
   ```env
   # Database
   DATABASE_URL=your_postgresql_connection_string
   
   # Authentication
   AUTH_SECRET=your_secret_key
   
   # Stripe (optional)
   STRIPE_SECRET_KEY=your_stripe_secret
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   ```

4. **Set up the database**

   ```bash
   pnpm db:push
   pnpm db:seed
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login
- **Email**: test@test.com
- **Password**: admin123

## 📋 Certificate Types

### BS5839-1 (Commercial Fire Alarms)
- System categories and equipment counts
- Zone configuration and control panel details
- Comprehensive test results and compliance checks
- Defects tracking and recommendations

### BS5839-6 (Domestic Fire Alarms)
- Property type classification (house, flat, HMO)
- System grades (A, B, C, D, F)
- Detector counts and interconnection methods
- Functional and audibility testing

### BS5266 (Emergency Lighting)
- Building type and occupancy assessment
- System types (maintained, non-maintained, sustained)
- Duration requirements and illumination levels
- Equipment inventory and test results

### Fire Extinguisher Certificates
- Risk category assessment
- Complete extinguisher inventory by class
- Service type tracking (routine, basic, extended, overhaul)
- Coverage adequacy and positioning checks

### Dry Riser Certificates
- Building specifications and system details
- Pressure and flow test results
- Visual inspection and accessibility assessment
- Compliance with BS9990 standards

## 📁 Project Structure

```
app/
├── (dashboard)/              # Main application pages
│   ├── certificates/         # Certificate management
│   │   └── new/             # Certificate creation forms
│   │       ├── bs5839-1/    # BS5839-1 form
│   │       ├── bs5839-6/    # BS5839-6 form
│   │       ├── bs5266/      # BS5266 form
│   │       ├── fire-extinguisher/ # Fire extinguisher form
│   │       └── dry-riser/   # Dry riser form
│   ├── customers/           # Customer management
│   └── actions.ts           # Server actions
├── api/                     # API routes
└── (login)/                 # Authentication pages

lib/
├── db/                      # Database configuration
│   ├── schema.ts           # Database schema
│   ├── queries.ts          # Database queries
│   └── migrations/         # Database migrations
└── auth/                   # Authentication configuration
```

## 🗃 Database Schema

### Core Tables
- `users` - System users and authentication
- `customers` - Client companies and contact information
- `certificates` - Fire safety certificates with metadata
- `certificateItems` - Individual inspection items and results

### Certificate Types Enum
- `BS5839_1` - Commercial fire alarm systems
- `BS5839_6` - Domestic fire alarm systems  
- `BS5266` - Emergency lighting systems
- `FIRE_EXTINGUISHER` - Portable fire extinguishers
- `DRY_RISER` - Dry riser systems

## 🔄 Development Workflow

### Database Operations
```bash
# Generate migrations
pnpm db:generate

# Push schema changes
pnpm db:push

# Run migrations
pnpm db:migrate

# Seed development data
pnpm db:seed
```

### Development Commands
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## 🚧 Roadmap

### Phase 1 - Core Features ✅
- [x] Certificate form implementation
- [x] Customer management
- [x] Basic dashboard
- [x] Database schema

### Phase 2 - Advanced Features 🚧
- [ ] Certificate detail views and editing
- [ ] PDF generation for certificates
- [ ] Digital signature capture
- [ ] Certificate status workflow (draft → completed → issued)

### Phase 3 - Enhanced Functionality 📋
- [ ] Expiration tracking and alerts
- [ ] Advanced search and filtering
- [ ] Reporting and analytics dashboard
- [ ] Bulk certificate operations
- [ ] Mobile-responsive certificate forms

### Phase 4 - Enterprise Features 📈
- [ ] Multi-tenant support
- [ ] Role-based permissions
- [ ] API for integrations
- [ ] Automated reminder system
- [ ] Compliance reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review existing issues and discussions

---

**AI Certifi** - Streamlining fire safety compliance, one certificate at a time. 🔥🛡️
3. Follow the Vercel deployment process, which will guide you through setting up your project.

### Add environment variables

In your Vercel project settings (or during deployment), add all the necessary environment variables. Make sure to update the values for the production environment, including:

1. `BASE_URL`: Set this to your production domain.
2. `STRIPE_SECRET_KEY`: Use your Stripe secret key for the production environment.
3. `STRIPE_WEBHOOK_SECRET`: Use the webhook secret from the production webhook you created in step 1.
4. `POSTGRES_URL`: Set this to your production database URL.
5. `AUTH_SECRET`: Set this to a random string. `openssl rand -base64 32` will generate one.

