# 🦷 Dental Clinic Management System

A comprehensive, modern dental clinic management system built with Electron, React, and TypeScript. This system provides 100% functional implementation of all essential clinic operations including patient management, appointment scheduling, payment tracking, and automated backup systems.

## ✨ Features

### 🏥 **Core Functionality**
- **Patient Management**: Complete patient records with medical history, allergies, and contact information
- **Appointment Scheduling**: Interactive calendar with drag-and-drop functionality using React Big Calendar
- **Payment System**: Multi-method payment tracking (cash, card, bank transfer, insurance, installments)
- **Treatment Management**: Configurable treatment catalog with pricing and duration
- **Inventory Management**: Stock tracking with low-stock alerts
- **Reports & Analytics**: Comprehensive reporting with PDF/Excel export capabilities

### 🔒 **Security & Backup**
- **Automated Backups**: Hourly, daily, or weekly encrypted backups
- **Auto-save**: Configurable auto-save intervals (default: 5 minutes)
- **Data Encryption**: AES encryption for backup files
- **Integrity Verification**: Checksum validation for backup integrity

### 🎨 **User Experience**
- **Modern UI**: Clean, responsive design with dark/light mode support
- **Real-time Search**: Fuzzy search across patients, appointments, and payments
- **Interactive Dashboard**: Visual analytics with charts and statistics
- **Multi-language Support**: Configurable language settings
- **Accessibility**: Full keyboard navigation and screen reader support

## 🛠 Technology Stack

### **Frontend**
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - High-quality UI components
- **React Big Calendar** - Interactive calendar component
- **Recharts** - Data visualization and charts
- **Zustand** - Lightweight state management

### **Backend & Desktop**
- **Electron** - Cross-platform desktop application
- **SQLite** - Local database with better-sqlite3
- **Node.js** - Runtime environment

### **Additional Libraries**
- **jsPDF** - PDF generation
- **ExcelJS** - Excel file export
- **Fuse.js** - Fuzzy search functionality
- **crypto-js** - Encryption and security
- **archiver** - Backup compression
- **React Hook Form** - Form management

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dental-clinic-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Development mode**
   ```bash
   npm run electron:dev
   ```

4. **Build for production**
   ```bash
   npm run electron:build
   ```

## 🚀 Usage

### **First Launch**
1. The application will create a local SQLite database automatically
2. Default clinic settings will be initialized
3. Sample treatment types will be pre-loaded

### **Patient Management**
- Add new patients with comprehensive information
- Search and filter patients by name, phone, or email
- View detailed patient profiles with medical history
- Track patient appointments and payment history

### **Appointment Scheduling**
- Interactive calendar with multiple view modes (month, week, day, agenda)
- Drag-and-drop appointment rescheduling
- Color-coded appointment statuses
- Automatic conflict detection

### **Payment Tracking**
- Record payments with multiple methods
- Track installment payments
- Generate payment receipts
- Monitor outstanding balances

### **Backup & Security**
- Automatic encrypted backups
- Manual backup creation
- Backup restoration with integrity verification
- Configurable backup schedules

## 📊 Database Schema

The system uses SQLite with the following main tables:
- `patients` - Patient information and medical records
- `appointments` - Appointment scheduling and status
- `payments` - Payment transactions and methods
- `treatments` - Available treatments and pricing
- `inventory` - Stock management
- `settings` - Clinic configuration

## 🔧 Configuration

### **Clinic Settings**
- Clinic name, address, and contact information
- Working hours and days
- Currency and language preferences
- Backup frequency and auto-save intervals

### **Environment Variables**
- `IS_DEV` - Development mode flag
- Database path is automatically configured in user data directory

## 📈 Development Phases

### ✅ **Phase 1: Infrastructure (Completed)**
- Database setup and schema
- Electron main/renderer communication (IPC)
- State management with Zustand
- Basic UI components and layout

### ✅ **Phase 2: Patient Management (Completed)**
- Patient CRUD operations
- Search and filtering
- Patient detail views
- Add patient dialog

### ✅ **Phase 3: Appointment System (Completed)**
- Interactive calendar integration
- Appointment scheduling
- Status management
- Calendar views and navigation

### 🔄 **Phase 4: Payment System (In Progress)**
- Payment recording and tracking
- Multiple payment methods
- Installment management
- Payment analytics

### 📋 **Phase 5: Treatments & Inventory (Planned)**
- Treatment catalog management
- Inventory tracking
- Stock alerts
- Usage reporting

### 📊 **Phase 6: Reports & Analytics (Planned)**
- Dashboard enhancements
- Advanced reporting
- Data export (PDF/Excel/CSV)
- Performance metrics

### 💾 **Phase 7: Backup & Security (Completed)**
- Automated backup system
- Encryption and security
- Data integrity verification
- Restore functionality

## 🧪 Testing

```bash
# Run unit tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 Scripts

- `npm run dev` - Start Vite development server
- `npm run electron:dev` - Start Electron in development mode
- `npm run build` - Build for production
- `npm run electron:build` - Build Electron application
- `npm run preview` - Preview production build

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the troubleshooting guide

## 🔮 Future Enhancements

- **Multi-clinic Support**: Manage multiple clinic locations
- **Cloud Sync**: Optional cloud backup and synchronization
- **Mobile App**: Companion mobile application
- **API Integration**: Integration with external systems
- **Advanced Analytics**: Machine learning insights
- **Telemedicine**: Video consultation features

---

**Built with ❤️ for dental professionals worldwide**
