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

## Decisions

- One shared preview player lives in `src/components/voice/VoicePreviewButton.tsx` (`playVoicePreview(id, url)`) — only one voice preview plays at a time app-wide, and selection surfaces (onboarding voice cards, receptionists dialog) auto-play the preview on select. Start previews through it, never with a bare `new Audio()`.
- Website scan reads up to 40 varied pages (sitemap + links, max 2 per page kind) and extracts in parallel sections merged by a final high-effort pass — thorough coverage of products/services/prices beyond the homepage.
