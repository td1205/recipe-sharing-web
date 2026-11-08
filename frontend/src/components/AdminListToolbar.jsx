import React, { useId } from 'react';
import { AdminSortSelect } from './AdminSort';

export default function AdminListToolbar({
  searchLabel,
  placeholder,
  search,
  onSearch,
  filters = [],
  sort,
  onSort,
  sortOptions,
  onReset,
}) {
  const searchId = useId();
  return (
    <div className="admin-list-toolbar">
      <label className="admin-list-field admin-list-search" htmlFor={searchId}>
        <span>{searchLabel}</span>
        <input
          id={searchId}
          name="search"
          type="search"
          className="admin-search"
          placeholder={placeholder}
          maxLength={200}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      {filters.map((filter) => (
        <label className="admin-list-field" key={filter.key}>
          <span>{filter.label}</span>
          <select
            className="admin-select"
            aria-label={filter.ariaLabel || filter.label}
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
          >
            {filter.options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <AdminSortSelect
        label="Sắp xếp"
        value={sort}
        onChange={onSort}
        options={sortOptions}
      />
      <button
        type="button"
        className="admin-range-btn admin-list-reset"
        onClick={onReset}
      >
        Đặt lại bộ lọc
      </button>
    </div>
  );
}
