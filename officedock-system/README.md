# Office Dock System

The Office Dock uses TypeScript, React, NextJS, Tailwind CSS and more.

## Prerequisite

- NodeJS 20.X
- Npm 10.x

## Tech Stacks

- ⚡️ Next.js 14 (App router)
- ⚛️ React 18
- ✨ TypeScript 5
- 💨 Tailwind CSS 3 — Configured with CSS Variables to extend the primary color
- 📈 Absolute Import and Path Alias — Import components using @ prefix
- 📏 ESLint — Find and fix problems in your code, also will auto sort your imports
- 💖 Prettier — Format your code consistently
- 🐶 Husky & Lint Staged — Run scripts on your staged files before they are committed

## Getting Started

### Installation

```bash
npm install
```

### Configuration

Create `.env` refer from `.env.sample` to config local environments.

### Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building

```bash
npm run build
```

### Start build mode with Docker

- Build the Docker image

```
docker compose build
```

- Run the server

```
docker compose up
```

## Note for GIT
* Please help apply GitFlow for this repository (https://danielkummer.github.io/git-flow-cheatsheet)
* Example:
    - Name for implementing features -> `feature/xxx-yyy`. Ex: `feature/implement-login-ui`
    - Name for fixing bugs -> `bugfix/xxx-yyy`. Ex: `bugfix/wrong-message-when-login` 

* When creating a title for a pull request or a commit message, please ensure that both the title and message are meaningful, and include a description if necessary. Capitalize the first letter and avoid using special characters.
* Example:
    - `Implement the authentication feature`
* If the source code for multiple platforms is stored in the same repository, use the format below for the pull request title and commit message.
* Example:
    - `LP: Implement the authentication feature`
    - `System: Implement the authentication feature`
    - `Admin: Implement the authentication feature`
    - `API: Implement the authentication feature`
    - `Mobile: Implement the authentication feature`
    - `iOS: Implement the authentication feature`
    - `Android: Implement the authentication feature`
    - `Common: Update the content of the README`

## Author
* Company: SOARIG VIETNAM Co., Ltd
* Website: [https://soarig.vn](https://soarig.vn)
* Email: info@soarig.vn
