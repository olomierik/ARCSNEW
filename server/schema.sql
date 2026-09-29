-- ArcStable Auto-Trading Schema
-- Run this once in your Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → paste → Run

create table if not exists trading_wallets (
  id             text primary key,
  wallet_set_id  text not null,
  address        text not null,
  owner_address  text not null,
  enabled        boolean not null default false,
  strategy       text not null default 'LOW_CAP',
  take_profit_pct numeric not null default 30,
  stop_loss_pct  numeric not null default 10,
  created_at     bigint not null
);
-- Migration: add strategy column if upgrading an existing table
-- alter table trading_wallets add column if not exists strategy text not null default 'LOW_CAP';

create unique index if not exists trading_wallets_owner_idx
  on trading_wallets (lower(owner_address));

create table if not exists trades (
  id            text primary key,
  wallet_id     text not null references trading_wallets(id) on delete cascade,
  owner_address text not null,
  token_address text not null,
  token_symbol  text not null,
  action        text not null check (action in ('buy','sell')),
  amount_usdc   text not null,
  price_usdc    text not null,
  tx_id         text,
  status        text not null check (status in ('pending','complete','failed')),
  pnl_usdc      text,
  created_at    bigint not null
);

create index if not exists trades_owner_idx on trades (lower(owner_address));
create index if not exists trades_wallet_idx on trades (wallet_id);

create table if not exists profits (
  owner_address text primary key,
  claimable     text not null default '0',
  last_updated  bigint not null default 0
);
