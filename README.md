
# Wanore

Wanore is an AI-powered meeting management platform that transforms meeting recordings into searchable transcripts, concise summaries, and actionable tasks. Designed for teams and professionals, Wanore helps users spend less time reviewing meetings and more time acting on key decisions.

## Features

* Upload and store meeting recordings
* AI-powered transcription using OpenAI
* Automatic meeting summaries
* Action item extraction and task tracking
* Secure authentication with Google OAuth and JWT
* Collaborative meeting management
* Cloud-based audio storage with AWS S3
* Responsive and intuitive user interface

## Demo

**Live Application:** https://wanore.vercel.app/

## Tech Stack

### Frontend

* React
* TypeScript

### Backend

* FastAPI
* Python
* SQLAlchemy
* PostgreSQL

### Authentication

* Google OAuth
* JWT Authentication

### Cloud & Infrastructure

* AWS S3
* Vercel
* Render
* Supabase

### AI Integration

* OpenAI API

## Architecture

1. Users authenticate using Google OAuth.
2. Meeting recordings are uploaded and stored in AWS S3.
3. The backend processes audio files asynchronously.
4. OpenAI APIs generate transcripts, summaries, and action items.
5. Processed meeting insights are stored in PostgreSQL.
6. Users can view, search, and collaborate on meeting notes through the application

## Installation

### Clone the Repository

```bash
git clone https://github.com/ChrisWang00726/wanore
cd wanore
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
### Environment Variables

Create a `.env` file in the backend directory:

```env
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
DATABASE_URL=your_database_url
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region   
S3_BUCKET_NAME=your_s3_bucket_name
```
Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=your_backend_api_url
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Backend Setup

```bash
cd backend

python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
```
