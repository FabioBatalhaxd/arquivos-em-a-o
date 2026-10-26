<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Delivery analytics remain mock-backed behind `deliveryService`, so a real API can replace the source without changing dashboard components.
- Operational anomaly analysis runs through a TanStack server function and the Lovable AI Gateway, so prompts and credentials never reach the browser.
- Operational tables, origin metrics, and lead-time analytics stay behind dedicated services so live APIs can replace mock data without changing dashboard modules.
- Delivery substatus normalization is part of the service/data model, keeping presentation components dependent only on grouped operational statuses.
- All visible operational aggregates derive from filtered weighted cohorts in operationalDataService; shared quantities ensure KPI, stage, carrier, UF and lead-time totals reconcile.

- Imported records are passed explicitly into dashboard services, never stored in shared module state, to prevent cross-user data leakage.
- Brand access is enforced by database row policies and authenticated server functions; Master-only mutations verify the caller role before privileged account administration.
- Spreadsheet replacement uses a serialized database transaction so failed imports preserve the previous dataset.
- Login identifiers are encoded as internal auth addresses; passwords are managed by the auth provider, never stored in application tables.
- Account creation validates role and brand through shared account rules; additional Masters use the existing authenticated administration function and protected role table, never the first-Master setup flow.
- Imports aggregate rows into daily weighted cohorts, and the dashboard reads them via parallel id-window pages returned as one dictionary-packed string, keeping large datasets under database timeouts and the server-function payload limit.
- Multi-select dashboard filters stay strings joined by MULTI_SEPARATOR and are matched via matchesFilter, so services keep a single filter shape.
- Per-login brand scope (brand_accounts.brands) is enforced by row policies; per-login view permissions live in brand_accounts.permissions, resolved via resolvePermissions (Master = all), and occurrence flags are stripped server-side when not permitted.
