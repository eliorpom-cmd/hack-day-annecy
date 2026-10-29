# Website reading progress

## What will change
- Replace the sparse “Reading services” wait screen with a detailed website-reading view.
- Show a prominent percentage, accessible progress bar, pages-read count, and current activity.
- Add a scrolling activity feed that steadily reveals user-friendly lines about what the receptionist is learning: business details, services, hours, staff, FAQs, policies, booking, and call handling.
- Keep the feed honest by tying milestone lines to real scan progress while using neutral “checking” language for intermediate activity.
- Preserve the existing completed review screen and retry/manual-entry paths.

## Technical details
- Keep the existing scan polling and server stages unchanged.
- Add the progress presentation and timed activity-line reveal inside the onboarding business step.
- Use existing semantic colors, typography, motion settings, and responsive layout.
- Verify the scan screen at desktop and mobile sizes and confirm the preview builds without errors.
