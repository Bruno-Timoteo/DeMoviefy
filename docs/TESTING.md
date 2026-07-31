# Testing DeMoviefy

Open the simple test menu from the repository root:

```powershell
.\test.ps1
```

Choose one of the following:

1. Run all official scenarios (CT01-CT08).
2. Run one scenario, such as CT03.
3. Run all scenarios and build the frontend.

For non-interactive use, run all tests directly:

```powershell
.\test.ps1 -All
```

Run one scenario directly:

```powershell
.\test.ps1 -Test CT03
```

To also verify that the frontend builds successfully:

```powershell
.\test.ps1 -Frontend
```

The script uses the project's `.venv` and runs the backend tests in
`demoviefy-backend/tests`. No manual directory changes or Python command are
needed.

## What is covered

`test_test_plan.py` implements the scenarios from the official test plan:

| ID | Automated check |
| --- | --- |
| CT01 | A supported video upload is saved and queued. |
| CT02 | Unsupported file types are rejected before processing. |
| CT03 | A completed transcription is returned to the client. |
| CT04 | Low-quality audio results do not break the transcription flow. |
| CT05 | Sensitive-content labels and critical timestamps are returned. |
| CT06 | Partial analysis and transcription results return `202` while processing. |
| CT07 | AI results are read-only in the API; manual updates return `403`. |
| CT08 | Multiple uploads are accepted and each one is queued. |

## Important scope note

These are fast, repeatable acceptance tests. They use temporary files and a
temporary SQLite database, and simulate AI artifacts instead of downloading or
running Whisper/YOLO models.

The full infrastructure part of CT08 still needs a separate load test against
the deployed Nginx + Flask environment, because Nginx is outside the Flask test
process.
