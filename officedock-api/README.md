# Office Dock API

The Office Dock use Python, Django, DRF and development with Docker Compose.

## Prerequisite

-   Docker
-   Docker Compose

## Tech Stacks

-   Python >= 3.10
-   Django - A web framework written in Python
-   Django Rest Framework - A toolkit for building Web APIs.
-   PostgreSQL - A powerful database management system.
-   JWT - A simple JSON web token for authentication.
-   Docker and Docker Compose - Enable developers to package and run applications consistently across different environments.
-   Pre-commit - Allows developers to define and manage pre-commit hooks for their code repositories.

## Getting Started

### Setup Pre-commit

```bash
pip install pre-commit
```

#### Install git hooks

```bash
pre-commit install
```

### Setting environment

```bash
cp .env.sample .env
```

### Installation

```bash
docker-compose build
```

### Running

```bash
docker-compose up
```

-   API Endpoint: http://localhost:8000/api/v1/
-   Documentation: http://localhost:8000/api/v1/docs/
-   Swagger: http://localhost:8000/api/v1/swagger/

### Django scripts

_Make sure the API service is running._

#### Create app

```bash
docker-compose exec api python manage.py startapp [app_name]
```

#### Make migration

```bash
docker-compose exec api python manage.py makemigrations
```

#### Migrate

```bash
docker-compose exec api python manage.py migrate
```

#### Shell commands

```bash
docker-compose exec api python manage.py shell
```

#### Creating an admin user

```bash
docker-compose exec api python manage.py createsuperuser
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