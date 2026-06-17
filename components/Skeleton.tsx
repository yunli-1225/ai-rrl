'use client';

interface SkeletonProps {
  type: 'card' | 'text' | 'circle';
  count?: number;
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line w-60" />
      <div className="skeleton-line w-40" />
      <div className="skeleton-line w-80" />
      <div className="skeleton-line w-30" />
      <style jsx>{`
        .skeleton-card {
          padding: 16px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .skeleton-line {
          height: 14px;
          border-radius: 6px;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .w-30 { width: 30%; }
        .w-40 { width: 40%; }
        .w-60 { width: 60%; }
        .w-80 { width: 80%; }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

function SkeletonText() {
  return (
    <div className="skeleton-text-block">
      <div className="skeleton-line w-80" />
      <div className="skeleton-line w-60" />
      <div className="skeleton-line w-70" />
      <style jsx>{`
        .skeleton-text-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .skeleton-line {
          height: 12px;
          border-radius: 6px;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .w-60 { width: 60%; }
        .w-70 { width: 70%; }
        .w-80 { width: 80%; }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function Skeleton({ type, count = 3 }: SkeletonProps) {
  const items = Array.from({ length: count });
  return (
    <div className="skeleton-container">
      {items.map((_, i) => (
        <div key={i}>
          {type === 'card' ? <SkeletonCard /> : type === 'text' ? <SkeletonText /> : (
            <div className="skeleton-circle" />
          )}
        </div>
      ))}
      <style jsx>{`
        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .skeleton-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
