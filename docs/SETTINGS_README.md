Settings admin console — implemented features

Implemented backend endpoints (master-data):
- GET /categories, /payment-methods, /accounts, /income-sources, /investment-types, /people
- POST/PUT/DELETE for each resource (POST=create, PUT=rename, DELETE=deactivate)
- GET /admin/export — export master data JSON (includes inactive rows)
- POST /admin/import — import JSON export and upsert missing rows by name

Frontend:
- Settings page with sidebar and Master Data section
- Master Data lists (Categories, Accounts, Payment Methods, Income Sources, Investment Types, People) with add/rename/deactivate using the UI
- Export page: download master-data JSON
- Import page: upload JSON exported from Export page

Business rules:
- No hard deletes of master data. `DELETE` endpoints mark rows inactive (`is_active=False`).
- Name uniqueness enforced case-insensitively on create/update.

Next steps:
- Add server-side checks to prevent deactivation when referenced (optional: return 409 conflict instead of allowing deactivate)
- Implement backup/restore that includes full DB dump/restore
- Implement more robust import with preview, conflict resolution, and dry-run
- Wire Analytics Preferences, Application, Developer, and Database subpages with settings storage
- Add tests for API endpoints and frontend UI

How to try locally:
- Start backend: `uvicorn app.main:app --reload --port 8000` (from backend/ venv)
- Start frontend: `npm run dev` (from frontend/)
- Open Settings page in the app and try Master Data, Export, Import
