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
    <div>
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
      <span>&nbsp;Page&nbsp;</span>
      <span>{page}</span>

      <span>&nbsp;out of {max}&nbsp;</span>
      <button
        onClick={() => {
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
