# billing/backend

The billing API for the five showrooms: Python 3.13, FastAPI, SQLAlchemy 2, PostgreSQL and Alembic, managed with [uv](https://docs.astral.sh/uv/).

It currently holds **logins** (passwords hashed with Argon2id, JWT sign-in tokens) and the **product catalogue** (the product Excel, the admin's season list and the showrooms' own products). Sales, stock, purchase orders, quotations and settings still live in each browser and move here next.

## Set up the database (once)

This uses the PostgreSQL already installed on the computer. Open psql as the `postgres` user, either **SQL Shell (psql)** from the Start menu or from PowerShell:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres    # use your version's folder: 16, 17, 18 ...
```

Then run this, with your own password in place of `choose-a-password`:

```sql
CREATE ROLE billing LOGIN PASSWORD 'choose-a-password';
CREATE DATABASE raaves_billing OWNER billing;
CREATE DATABASE raaves_billing_test OWNER billing;
```

Type `\q` to leave psql. Then copy `.env.example` to `.env` and fill it in. Put the same password in both database lines, and generate a `JWT_SECRET` with the command shown in the file. `.env` is not committed.

## Run it

```bash
cd billing/backend
uv sync                                  # installs Python packages into .venv
uv run alembic upgrade head              # creates the tables
uv run python -m app.cli seed            # showrooms, logins (default passwords) and the products from seed/products-clean.xlsx
uv run uvicorn app.main:app --reload --port 8000
```

The API is then at http://localhost:8000/api/v1, with interactive docs at http://localhost:8000/docs. The billing frontend talks to it at the address in its `VITE_API_URL` (default `http://localhost:8000/api/v1`).

- **Re-running the seed is safe.** It adds what's missing and updates product details from the Excel. It never changes a password, and it keeps the admin's season choices. `--season-from-excel` resets the season to the Excel's "In Season" column; `--excel PATH` reads another file.
- **Default passwords** are `<username>@2026` (`chennai@2026` … `admin@2026`). Change them from the app (Admin → Logins).
- **Wrong passwords:** after 10 wrong passwords for one login from one computer within 15 minutes, that login pauses on that computer until the oldest attempt is 15 minutes old. The count is kept in the server's memory, so it resets when the server restarts.

## Tests and lint

```bash
uv run pytest            # unit tests always; API tests on TEST_DATABASE_URL (its tables are created and wiped)
uv run ruff check . && uv run ruff format --check .
```

The API tests run against `TEST_DATABASE_URL`, never your real database. If it isn't set or can't be reached they are skipped, and pytest shows why. Set `TEST_DATABASE_URL=` (empty) in the environment to skip them even when `.env` has one.

## The API

Everything is under `/api/v1` except `/health`. Errors come back as `{"detail": "a readable sentence"}`; field-level validation errors use FastAPI's list form.

| Method and path | Who | What |
|---|---|---|
| `POST /api/v1/auth/login` | anyone | username + password → `{ token, session }`. 401 for a wrong password, 429 after too many |
| `GET /api/v1/auth/me` | signed in | the session `{ username, role, location }` |
| `GET /api/v1/users` | admin | every login, and when its password was changed (`passwordChangedAt`) |
| `PUT /api/v1/users/{username}/password` | admin | `{ password }` (6+ characters); that login has to sign in again |
| `POST /api/v1/users/{username}/password/reset` | admin | back to the default password |
| `GET /api/v1/products` | signed in | `{ season, products }`: the whole catalogue |
| `PATCH /api/v1/products/{code}` | admin | `{ inSeason }`: put a product in or out of this season |
| `POST /api/v1/products` | signed in | a showroom's own product; the server gives it the next code (CHN-0001…) |
| `GET /health` | anyone | is the API up and the database reachable (503 if not) |

Send the token as `Authorization: Bearer <token>`. A token lasts `TOKEN_HOURS` and stops working as soon as that login's password is changed or reset.

## Layout

The code is organised by feature: each module under `app/modules/` holds its own tables, request and response shapes, queries, rules and routes.

| Path | What |
|---|---|
| `app/main.py` | `create_app()`: CORS, error handling, and each module's routes under `/api/v1` |
| `app/cli.py` | `python -m app.cli seed`: fills the database |
| `app/db_models.py` | imports every module's tables, for Alembic and the tests |
| `app/core/config.py` | settings from the environment and `.env` |
| `app/core/database.py` | the engine and sessions (made on first use), `Base` with constraint naming |
| `app/core/security.py` | Argon2 password hashing and JWT tokens, as plain functions |
| `app/core/errors.py` | `NotFound`, `Forbidden`, `InvalidInput` … and how they become `{"detail": ...}` |
| `app/core/schemas.py` | the base for request and response bodies: snake_case in Python, camelCase in JSON |
| `app/modules/locations/` | the five showrooms and their product numbering |
| `app/modules/users/` | logins and the admin's password management (`/users`) |
| `app/modules/auth/` | sign-in, tokens, who is signed in, and the wrong-password brake (`/auth`) |
| `app/modules/products/` | the catalogue, the product Excel importer and shop products (`/products`) |
| `app/modules/system/` | app-wide settings (the season) and `/health` |
| `migrations/` | Alembic migrations. After changing a model: `uv run alembic revision --autogenerate -m "..."`, then read the result |
| `tests/unit/` | tests that need no database |
| `tests/api/` | the whole API against `TEST_DATABASE_URL` |
| `seed/` | the product Excel and the script that cleaned it from the old software's export |

Within a module, routers only read the request and shape the reply; services hold the rules and raise the errors in `app/core/errors.py`; repositories hold the database queries; models are the tables.
