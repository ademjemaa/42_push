# Messaging App Backend

This is the backend for a cross-platform mobile messaging application built with Express.js, SQLite, and Socket.io for real-time messaging.

## Features

- User authentication with JWT
- Contact management
- Real-time messaging with WebSockets
- File uploads for avatars
- Auto-creation of contacts for unknown message senders

## Database Structure

The backend uses SQLite with the following tables:

- `users`: Stores user information including phone numbers and passwords
- `contacts`: Stores contacts for each user
- `messages`: Stores messages between users

## API Endpoints

### Users
- `POST /api/users/register`: Register a new user
- `POST /api/users/login`: Login a user
- `GET /api/users/me`: Get current user profile
- `PUT /api/users/me`: Update user profile
- `POST /api/users/avatar`: Upload user avatar
- `GET /api/users/avatar`: Get user avatar

### Contacts
- `GET /api/contacts`: Get all contacts for current user
- `GET /api/contacts/:id`: Get a specific contact
- `POST /api/contacts`: Create a new contact
- `PUT /api/contacts/:id`: Update a contact
- `DELETE /api/contacts/:id`: Delete a contact
- `POST /api/contacts/:id/avatar`: Upload contact avatar
- `GET /api/contacts/:id/avatar`: Get contact avatar

### Messages
- `GET /api/messages/conversation/:contactId`: Get conversation with a contact
- `POST /api/messages/send`: Send a message to a contact
- `GET /api/messages/unread/count`: Get unread message count
- `GET /api/messages/unread`: Get all unread messages
- `DELETE /api/messages/conversation/:contactId`: Delete conversation with a contact

## WebSocket Events

- `register`: Register a user's socket connection
- `privateMessage`: Send a private message to another user
- `newMessage`: Receive a new message (emitted to receiver)

## Setup and Running

### Requirements
- Node.js
- npm

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

3. For development with auto-restart:
   ```
   npm run dev
   ```

The server will run on port 3000 by default.

## Authentication

Authentication is handled via JWT tokens. Include the token in the Authorization header for protected routes:

```
Authorization: Bearer <token>
```

## File Upload

Avatars are stored as BLOBs in the database. The maximum file size is 5MB, and only image files are accepted. 