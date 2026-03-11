'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@ordo/core';
import { BrandContactCard } from './brand-contact-card';
import type { BrandContact, SponsorshipDeal, IncomeEntry } from '@ordo/types';

interface BrandContactsListProps {
  brands: BrandContact[];
  deals: SponsorshipDeal[];
  income: IncomeEntry[];
  onClickBrand: (brand: BrandContact) => void;
}

export function BrandContactsList({ brands, deals, income, onClickBrand }: BrandContactsListProps) {
  const [search, setSearch] = React.useState('');
  const [nicheFilter, setNicheFilter] = React.useState('all');

  const niches = React.useMemo(() => {
    const set = new Set(brands.map((b) => b.niche));
    return ['all', ...Array.from(set)];
  }, [brands]);

  const filtered = brands.filter((b) => {
    const matchesSearch =
      !search ||
      b.companyName.toLowerCase().includes(search.toLowerCase()) ||
      b.contactName.toLowerCase().includes(search.toLowerCase());
    const matchesNiche = nicheFilter === 'all' || b.niche === nicheFilter;
    return matchesSearch && matchesNiche;
  });

  const getDealCount = (brandId: string) =>
    deals.filter((d) => d.brandContactId === brandId).length;

  const getTotalEarned = (brandId: string) => {
    const brandDealIds = deals
      .filter((d) => d.brandContactId === brandId && d.stage === 'Paid')
      .map((d) => d.id);
    return income
      .filter((i) => brandDealIds.includes(i.dealId))
      .reduce((sum, i) => sum + i.amount, 0);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands…"
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={nicheFilter}
          onChange={(e) => setNicheFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {niches.map((n) => (
            <option key={n} value={n}>{n === 'all' ? 'All niches' : n}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No brand contacts found.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((brand) => (
            <BrandContactCard
              key={brand.id}
              brand={brand}
              dealCount={getDealCount(brand.id)}
              totalEarned={getTotalEarned(brand.id)}
              onClick={() => onClickBrand(brand)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
