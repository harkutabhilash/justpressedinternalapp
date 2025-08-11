// src/components/ComingSoon.js
import React from 'react';

function ComingSoon({ moduleLabel }) {
  return (
    <div className="text-center py-12 text-gray-700">
      <h2 className="text-2xl font-semibold">{moduleLabel} – Coming Soon</h2>
      <p className="text-sm mt-2 text-gray-500">
        This module is not ready yet.
      </p>
    </div>
  );
}

export default ComingSoon;
