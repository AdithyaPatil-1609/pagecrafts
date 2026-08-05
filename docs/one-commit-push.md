# One-commit push — design note (D1, build on D3)

## The four steps
1. Upload each file's contents on its own. Each upload gives back an id.
2. Build one listing that maps every file path to its id.
3. Create one commit that points at that listing.
4. Move the branch pointer to that commit. This is the only step that changes
   what the world sees.

## Rules
- Steps 1–3 change nothing visible. Only step 4 does.
- If any step fails, we stop. Nothing was made live, so there is nothing to undo.
- The whole site is one commit. Never one commit per file.
- Message format: "Publish <project name> - <timestamp>".

## Open question for D3
Very large sites: do we upload files one at a time or several at once?
Decide after measuring with a real template.