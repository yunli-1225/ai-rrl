'use client';

interface Props {
  loading: boolean;
  disabled?: boolean;
  loadingText?: string;
  onClick: () => void;
}

export default function GenerateButton({ loading, disabled, onClick, loadingText = '正在生成简历...' }: Props) {
  return (
    <button
      className="btn btn-primary"
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          <span className="spinner" />
          {loadingText}
        </>
      ) : (
        '🚀 开始定制简历'
      )}
    </button>
  );
}
 