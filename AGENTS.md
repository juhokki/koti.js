# Project Guidance

- Keep changes simple and focused. Follow the existing conventions in the affected project and avoid unrelated refactoring.
- Run project commands from the relevant project subfolder, not the repository root. For work across projects, enter each affected subfolder before running its commands.
- In each affected subfolder, run the available build, lint and test checks. Fix failures and rerun those checks before formatting.
- Add or update tests for the code you change.
- Run the subfolder's Prettier command last, and only after its available lint and test checks pass. Skip checks that the subfolder does not provide.