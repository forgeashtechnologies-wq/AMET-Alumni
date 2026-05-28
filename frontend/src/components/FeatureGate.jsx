import React from 'react';

export default function FeatureGate({ allowed, children, fallback }) {
  if (!allowed) return fallback ?? null;
  return children;
}
