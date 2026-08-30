export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (raw.includes("Unauthorized") || raw.includes("Wrong PIN") || raw.includes("owner PIN")) {
    return raw.replace(/^Unauthorized:\s*/i, "").replace(/^Error:\s*/i, "");
  }
  if (raw.includes("missing required key")) {
    return "Something went wrong. Please close and reopen the app, then try again.";
  }
  if (raw.includes("invalid args")) {
    return "This action could not be completed. Please try again.";
  }
  if (raw.includes("Not found") || raw.includes("not found")) {
    return raw.replace(/^Not found:\s*/i, "").replace(/^Error:\s*/i, "");
  }
  if (raw.includes("Validation")) {
    return raw.replace(/^Validation error:\s*/i, "").replace(/^Validation:\s*/i, "");
  }
  if (raw.includes("Database error") || raw.includes("FOREIGN KEY") || raw.includes("foreign key")) {
    if (raw.toLowerCase().includes("foreign key")) {
      return "This product is linked to sales records and cannot be deleted. Archive it instead.";
    }
    return "Something went wrong while saving. Please try again.";
  }
  if (raw.startsWith("Error: ")) {
    return raw.slice(7);
  }
  return raw || "Something went wrong. Please try again.";
}
