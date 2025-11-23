import React from 'react';

const Filter = () => (
  <div className="input filter">
    <select>
      <option value="" defaultValue>All</option>
      <option value="1">Active</option>
      <option value="0">Disabled</option>
    </select>
  </div>
);

export default () => (
  <div className="search form">
    <input
      type="text"
      placeholder="Search"
      ref={input => input && input.focus()}
    />
    {/* <Filter /> */}
    {/* <Filter /> */}
  </div>
);
