/**
 * Browser routes shared by authentication flows and the application shell.
 *
 * Keeping the post-authentication destination in one place prevents a future
 * public-homepage change from quietly sending signed-in users back to `/`.
 */
export const DASHBOARD_PATH = '/dashboard' as const;
