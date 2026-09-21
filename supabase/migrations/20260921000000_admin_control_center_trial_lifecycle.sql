-- ThreadZW Admin control center: align live trial lifecycle with the requested commercial model.
-- Clothing only: 3-day standard trial, 3 products; Pro: $9 once-off, unlimited products.
create or replace function public.initialize_threadzw_standard_trial()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if lower(coalesce(new.page_type,'clothing')) in ('clothing','fashion','apparel','boutique')
     and lower(coalesce(new.plan,'free'))='free'
     and lower(coalesce(new.subscription_status,'inactive')) in ('inactive','free')
     and new.trial_ends_at is null
  then
    new.subscription_status := 'trial';
    new.trial_started_at := coalesce(new.trial_started_at, now());
    new.trial_ends_at := coalesce(new.trial_ends_at, now() + interval '3 days');
    new.product_limit := 3;
    new.payment_required := false;
    new.payment_status := 'unpaid';
    new.account_status := 'free';
    new.premium_status := 'inactive';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_threadzw_standard_trial on public.shops;
create trigger trg_threadzw_standard_trial
before insert on public.shops
for each row execute function public.initialize_threadzw_standard_trial();

create or replace function public.expire_threadzw_standard_trials()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  update public.shops
  set subscription_status='expired', payment_required=true, payment_status='unpaid',
      payment_verification_status=null, product_limit=0, premium_status='inactive', updated_at=now()
  where lower(coalesce(page_type,'clothing'))='clothing'
    and lower(coalesce(plan,'free'))='free'
    and subscription_status='trial'
    and trial_ends_at is not null
    and trial_ends_at <= now();
  get diagnostics n=row_count;
  return n;
end;
$$;

select cron.schedule('threadzw-expire-standard-trials','*/15 * * * *','select public.expire_threadzw_standard_trials()');

create or replace function public.fn_enforce_product_quota()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_shop public.shops%rowtype; v_count integer; v_limit integer;
begin
  select * into v_shop from public.shops where id=new.shop_id for update;
  if not found then raise exception using errcode='P0001',message='SHOP_NOT_FOUND'; end if;
  if lower(coalesce(v_shop.page_type,'clothing')) in ('clothing','fashion','apparel','boutique')
     and lower(coalesce(v_shop.plan,'free')) in ('pro','premium')
     and lower(coalesce(v_shop.account_status,''))='active'
     and lower(coalesce(v_shop.subscription_status,''))<>'trial' then return new; end if;
  if lower(coalesce(v_shop.page_type,'clothing')) in ('clothing','fashion','apparel','boutique')
     and lower(coalesce(v_shop.subscription_status,''))='expired' then v_limit:=0;
  else v_limit:=3; end if;
  select count(*) into v_count from public.products where shop_id=new.shop_id and is_published=true and (tg_op='INSERT' or id<>new.id);
  if v_limit=0 then raise exception using errcode='P0001',message='PRODUCT_LIMIT_REACHED',detail='Your trial has ended. Pay $9 once-off for Pro to add products.'; end if;
  if new.is_published=true and v_count>=v_limit then raise exception using errcode='P0001',message='PRODUCT_LIMIT_REACHED',detail=format('Your trial allows a maximum of %s active products.',v_limit); end if;
  if lower(coalesce(v_shop.account_status,''))='pending_payment' or lower(coalesce(v_shop.payment_verification_status,''))='pending' then new.created_during_pending_payment:=true; end if;
  return new;
end;
$$;