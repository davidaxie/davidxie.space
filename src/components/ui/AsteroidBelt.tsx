'use client';

export function AsteroidBelt() {
  return (
    <div className="asteroid-belt-container" aria-hidden="true">
      <div className="asteroid-belt-band">
        {/* Multiple asteroid particles via CSS */}
        <div className="asteroid-particle asteroid-p1" />
        <div className="asteroid-particle asteroid-p2" />
        <div className="asteroid-particle asteroid-p3" />
        <div className="asteroid-particle asteroid-p4" />
        <div className="asteroid-particle asteroid-p5" />
        <div className="asteroid-particle asteroid-p6" />
        <div className="asteroid-particle asteroid-p7" />
        <div className="asteroid-particle asteroid-p8" />
      </div>
    </div>
  );
}
