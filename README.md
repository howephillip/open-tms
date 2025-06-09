
# OpenSource TMS

A full-stack, open-source Transportation Management System (TMS) built with a modern tech stack, designed for managing shipments, carriers, shippers, and financials for logistics operations.

## Core Technologies

### Backend
- **Node.js**: JavaScript runtime environment.
- **Express**: Fast, unopinionated, minimalist web framework for Node.js.
- **MongoDB**: NoSQL database for storing application data.
- **Mongoose**: Elegant MongoDB object modeling for Node.js.
- **TypeScript**: Statically typed superset of JavaScript.
- **JWT**: For handling authentication.
- **Winston**: For robust application logging.

### Frontend
- **React**: A JavaScript library for building user interfaces.
- **Vite**: Next-generation frontend tooling for fast development.
- **TypeScript**: For type safety in components and logic.
- **Material-UI (MUI)**: A comprehensive suite of UI tools for a premium look and feel.
- **React Query**: For powerful data-fetching, caching, and server state management.
- **Axios**: For making API requests.

## Features
- **Dashboard**: High-level overview with key performance indicators (KPIs) and data visualizations.
- **Quotes & Shipments**: Full CRUD operations for creating, viewing, updating, and deleting quotes and active shipments.
- **Carriers & Shippers**: Manage a database of carriers and shippers with detailed contact and compliance information.
- **Lane Rate Analysis**: Automatically harvest rate data from shipments to analyze lane profitability.
- **Document Management**: Configurable file storage (**local disk** or **Amazon S3**) for managing documents like BOLs and PODs.
- **Configurable Settings**: UI-driven settings for form validation rules and application behavior.

---

## Prerequisites
Before you begin, ensure you have the following installed on your system:
- **Node.js**: v18 or later is recommended.
- **npm** (or **yarn**): Package manager for Node.js.
- **MongoDB**: A running instance of MongoDB. This can be a local installation or a free cloud instance from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).

---

## Quickstart Guide

Follow these steps to get the application running locally for development.

### 1. Clone the Repository
First, clone the project to your local machine:
```bash
git clone <your-repository-url>
cd opensource-tms
```

### 2. Backend Setup
The backend server handles all the business logic and database interactions.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create the Environment File:**
    Create a new file named `.env` in the `backend` directory. You can copy the contents of `.env.example` if it exists, or use the template below.

    **`.env` file template:**
    ```env
    # Application Environment
    NODE_ENV=development
    PORT=3000
    FRONTEND_URL=http://localhost:3001

    # Database Connection
    MONGODB_URI=mongodb://localhost:27017/opensource-tms

    # Security
    JWT_SECRET=a_very_strong_and_random_secret_key_for_jwt
    JWT_EXPIRES_IN=24h

    # File Storage Strategy
    # Options: "local" or "s3". Defaults to "local" if not set.
    FILE_STORAGE_STRATEGY=local

    # --- AWS S3 Configuration (ONLY needed if FILE_STORAGE_STRATEGY is "s3") ---
    AWS_ACCESS_KEY_ID=
    AWS_SECRET_ACCESS_KEY=
    AWS_REGION=
    S3_BUCKET_NAME=

    # --- Third-Party API Keys (Optional) ---
    OPENAI_API_KEY=
    SAFER_API_KEY=

    # --- Email Configuration (Optional) ---
    EMAIL_HOST=
    EMAIL_PORT=
    EMAIL_USER=
    EMAIL_PASS=
    ```
    > **Note:** For local development, setting `FILE_STORAGE_STRATEGY=local` is recommended. You do not need to provide AWS credentials in this case.

4.  **Seed the Database (Optional but Recommended):**
    This script will clear and populate your database with sample data (users, carriers, etc.) to get you started quickly.
    ```bash
    npm run seed
    ```

5.  **Run the Backend Development Server:**
    ```bash
    npm run dev
    ```
    The backend server will start, typically on `http://localhost:3000`. You should see log messages indicating a successful connection to MongoDB.

### 3. Frontend Setup
The frontend is a Vite-powered React application.

1.  **Open a new terminal window.**

2.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Run the Frontend Development Server:**
    ```bash
    npm run dev
    ```
    The frontend development server will start, typically on `http://localhost:3001`.

### 4. Access the Application
Open your web browser and navigate to **`http://localhost:3001`**. The application should load and be fully functional, communicating with your local backend server.

---

## Available Scripts

### Backend (`/backend`)
-   `npm run dev`: Starts the development server using `ts-node-dev` with hot-reloading.
-   `npm run start`: Runs the production-ready compiled code from the `/dist` folder.
-   `npm run build`: Compiles the TypeScript code to JavaScript in the `/dist` folder.
-   `npm run seed`: Clears and seeds the database with initial data.
-   `npm run lint`: Lints the TypeScript code for errors and style issues.

### Frontend (`/frontend`)
-   `npm run dev`: Starts the Vite development server with HMR.
-   `npm run build`: Builds the production-optimized static assets.
-   `npm run preview`: Serves the production build locally for testing.
-   `npm run lint`: Lints the TypeScript and TSX files.