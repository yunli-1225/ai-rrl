'use client';

interface Props {
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function GenerateButton({ loading, disabled, onClick }: Props) {
  return (
    <button
      className="btn btn-primary"
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          <span className="spinner" />
          正在生成简历...
        </>
      ) : (
        '🚀 开始定制简历'
      )}
    </button>
  );
}
