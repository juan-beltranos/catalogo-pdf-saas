// Identity is checked again against Supabase Auth on every admin API request.
export const ADMIN_USER_ID = "1f94ea95-ee97-46a6-9146-101ba69923b9";
export const isAdminUser = (user: { id: string } | null | undefined) => user?.id === ADMIN_USER_ID;
