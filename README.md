# DumbGPT

DumbGPT is a parody AI chatbot that deliberately gives nonsensical and absurd answers to any user questions, using the OpenAI API.

## Features

- 🤪 Nonsensical, yet convincing-sounding responses
- 💬 Modern chat interface similar to ChatGPT/Claude
- 🎭 Full-fledged AI trained to provide ridiculous answers
- 🚀 Stack: TypeScript, React, Express, Tailwind CSS, OpenAI API

## Follow Us

- 🐦 Follow DumbGPT on [Twitter](https://x.com/dumbGPTapp) for updates and the most ridiculous AI conversations

## Installation and Setup

### Prerequisites

- Node.js (16.x or higher)
- NPM or Yarn
- OpenAI API key

### Project Setup

1. Clone the repository
2. Configure environment variables:
   ```
   cd server
   cp .env.example .env
   ```
   Edit the `.env` file and add your OpenAI API key

3. Install dependencies for server and client:
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

### Running the Application

1. Start the server:
   ```
   cd server
   npm run dev
   ```

2. In a separate terminal, start the client:
   ```
   cd client
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## How it Works

DumbGPT uses the OpenAI API with a special system instruction that makes the model give deliberately useless and absurd answers that sound convincing at first glance but actually contain no useful information.

## Technologies

### Frontend
- TypeScript
- React
- Tailwind CSS
- Vite

### Backend
- TypeScript
- Express
- OpenAI API

## License

MIT
