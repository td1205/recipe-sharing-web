import React from 'react';

export function AdminSortSelect({ value, onChange, options, label }) {
  return (
    <select
      className="admin-select"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function AdminSortHeader({
  children,
  value,
  onChange,
  ascending,
  descending,
}) {
  const active = value === ascending || value === descending;
  const isAscending = value === ascending;
  return (
    <th
      scope="col"
      aria-sort={
        active ? (isAscending ? 'ascending' : 'descending') : undefined
      }
    >
      <button
        type="button"
        className="admin-sort-button"
        onClick={() => onChange(active && isAscending ? descending : ascending)}
        aria-label={`Sắp xếp ${children}: ${active && isAscending ? 'giảm dần' : 'tăng dần'}`}
      >
        {children}{' '}
        <span aria-hidden="true">
          {active ? (isAscending ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}
