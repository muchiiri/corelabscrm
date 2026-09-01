export function resolveCurrentWorkspace(workspaces, persistedId) {
  const persisted = workspaces.find((workspace) => workspace.id === persistedId)
  return persisted ?? workspaces[0] ?? null
}
