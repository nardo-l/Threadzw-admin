revoke all on function public.initialize_threadzw_standard_trial() from anon, authenticated;
revoke all on function public.expire_threadzw_standard_trials() from anon, authenticated;
revoke all on function public.fn_enforce_product_quota() from anon, authenticated;
revoke all on function public.admin_approve_shop_payment(uuid,text) from anon, authenticated;
revoke all on function public.admin_reject_shop_payment(uuid) from anon, authenticated;
