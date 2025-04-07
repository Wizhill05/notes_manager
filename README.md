# Hospital Management System

A modern hospital management system built with React and Node.js, using SQLite for data storage.

## Features

- Patient Management

  - Register new patients
  - View patient details
  - Track patient medical history

- Doctor Management

  - View doctor profiles
  - Track doctor workload
  - Manage doctor specializations

- Check-in System

  - Create new patient check-ins
  - Assign doctors to patients
  - Record symptoms, diagnosis, and prescriptions
  - Schedule follow-up appointments

- Disease Tracking

  - Maintain disease database
  - Track disease statistics
  - Monitor contagious diseases

- Dashboard
  - View hospital statistics
  - Track daily/weekly check-ins
  - Monitor disease distribution
  - View doctor workload

## Tech Stack

- Frontend: React.js
- Backend: Node.js with Express
- Database: SQLite
- Charts: Chart.js

## API Endpoints

### Patients

- GET `/api/patients` - Get all patients
- GET `/api/patients/:id` - Get patient by ID
- POST `/api/patients` - Create new patient
- PUT `/api/patients/:id` - Update patient
- GET `/api/patients/:id/history` - Get patient's medical history

### Doctors

- GET `/api/doctors` - Get all doctors
- GET `/api/doctors/:id` - Get doctor by ID
- POST `/api/doctors` - Create new doctor

### Diseases

- GET `/api/diseases` - Get all diseases
- GET `/api/diseases/:id` - Get disease by ID
- POST `/api/diseases` - Create new disease

### Check-ins

- GET `/api/checkins` - Get all check-ins
- GET `/api/checkins/:id` - Get check-in by ID
- POST `/api/checkins` - Create new check-in

### Statistics

- GET `/api/stats/hospital` - Get hospital statistics
- GET `/api/stats/diseases` - Get disease statistics
- GET `/api/stats/doctor-workload` - Get doctor workload statistics

## Setup

1. Install dependencies:

   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ..
   npm install
   ```

2. Start the backend server:

   ```bash
   cd server
   npm start
   ```

3. Start the frontend development server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## Database Schema

The system uses the following main entities:

- **Patient**: Stores patient information including personal details and medical history
- **Doctor**: Manages doctor profiles and specializations
- **Disease**: Maintains a database of diseases and their characteristics
- **Check-in**: Records patient visits, diagnoses, and treatments
- **Medical History**: Tracks patient's historical medical conditions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
