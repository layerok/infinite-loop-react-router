export const Pagination = ({
  min = 1,
  max = Infinity,
  page,
  onPageChange,
}: {
  min?: number;
  max?: number;
  page: number;
  onPageChange: (page: number) => void;
}) => {
  return (
    <div style={{
      display: 'flex',
      gap: 10
    }}>
      <button
        onClick={() => {
          if (page === min) {
            return;
          }
          onPageChange(page - 1);
        }}
      >
        &lt;
      </button>

      <button
        onClick={() => {
          console.log('page',page, max)
          if (page >= max) {
            return;
          }
          onPageChange(page + 1);
        }}
      >
        &gt;
      </button>
    </div>
  );
};
